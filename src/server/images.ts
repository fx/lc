import { createHash } from 'node:crypto'
import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db, withRetry } from '@/db'
import { handleDbError } from '@/db/errors'
import { images } from '@/db/schema'
import { err, ok, type Result } from '@/lib/types'

interface StoreImageResult {
  id: string
  isNew: boolean
}

interface ImageMetadata {
  id: string
  contentHash: string
  originalUrl: string | null
  mimeType: string
  createdAt: Date
}

// Core function for server-side use (can be called directly from other server functions)
export async function storeImageCore(
  buffer: Buffer,
  mimeType: string,
  originalUrl?: string,
): Promise<Result<StoreImageResult>> {
  try {
    const contentHash = createHash('sha256').update(buffer).digest('hex')

    // Check if image with this hash already exists
    const existing = await withRetry(() =>
      db.query.images.findFirst({
        where: eq(images.contentHash, contentHash),
        columns: { id: true },
      }),
    )

    if (existing) {
      return ok({ id: existing.id, isNew: false })
    }

    // Insert new image
    const [inserted] = await withRetry(() =>
      db
        .insert(images)
        .values({
          contentHash,
          originalUrl,
          mimeType,
          data: buffer,
        })
        .onConflictDoNothing({ target: images.contentHash })
        .returning({ id: images.id }),
    )

    // If conflict occurred during insert, fetch the existing record
    if (!inserted) {
      const existingAfterConflict = await withRetry(() =>
        db.query.images.findFirst({
          where: eq(images.contentHash, contentHash),
          columns: { id: true },
        }),
      )
      if (existingAfterConflict) {
        return ok({ id: existingAfterConflict.id, isNew: false })
      }
      return err('INSERT_FAILED', 'Failed to store image', 500)
    }

    return ok({ id: inserted.id, isNew: true })
  } catch (error) {
    return handleDbError(error, 'storeImage')
  }
}

// Maximum image size for client uploads (10MB)
const MAX_IMAGE_BYTES = 10 * 1024 * 1024

// Allowed MIME types for direct uploads
export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/bmp',
] as const

// Server function wrapper for client-side calls
export const storeImage = createServerFn({ method: 'POST' })
  .inputValidator((data: { data: number[]; mimeType: string; originalUrl?: string }) => {
    if (!data || !Array.isArray(data.data) || data.data.length === 0) {
      throw new Error('Image data must be a non-empty array')
    }
    if (data.data.length > MAX_IMAGE_BYTES) {
      throw new Error(`Image data exceeds ${MAX_IMAGE_BYTES / 1024 / 1024}MB limit`)
    }
    if (typeof data.mimeType !== 'string' || !/^(image|application)\//.test(data.mimeType)) {
      throw new Error('Invalid or unsupported mimeType')
    }
    if (data.originalUrl != null && typeof data.originalUrl !== 'string') {
      throw new Error('Invalid originalUrl')
    }
    return data
  })
  .handler(async ({ data: input }): Promise<Result<StoreImageResult>> => {
    const buffer = Buffer.from(input.data)
    return storeImageCore(buffer, input.mimeType, input.originalUrl)
  })

// Upload image from client (no source URL)
export const uploadImage = createServerFn({ method: 'POST' })
  .inputValidator((data: { data: number[]; mimeType: string }) => {
    if (!data || !Array.isArray(data.data) || data.data.length === 0) {
      throw new Error('Image data must be a non-empty array')
    }
    if (data.data.length > MAX_IMAGE_BYTES) {
      throw new Error(`Image data exceeds ${MAX_IMAGE_BYTES / 1024 / 1024}MB limit`)
    }
    if (!ALLOWED_MIME_TYPES.includes(data.mimeType as (typeof ALLOWED_MIME_TYPES)[number])) {
      throw new Error(
        `Unsupported image type: ${data.mimeType}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      )
    }
    return data
  })
  .handler(async ({ data: input }): Promise<Result<StoreImageResult>> => {
    const buffer = Buffer.from(input.data)
    return storeImageCore(buffer, input.mimeType)
  })

export const getImage = createServerFn({ method: 'GET' })
  .inputValidator((id: string) => id)
  .handler(
    async ({
      data: id,
    }): Promise<
      Result<{
        id: string
        contentHash: string
        originalUrl: string | null
        mimeType: string
        data: number[]
        createdAt: Date
      } | null>
    > => {
      try {
        const result = await withRetry(() =>
          db.query.images.findFirst({
            where: eq(images.id, id),
          }),
        )

        if (!result) {
          return ok(null)
        }

        return ok({
          id: result.id,
          contentHash: result.contentHash,
          originalUrl: result.originalUrl,
          mimeType: result.mimeType,
          data: Array.from(result.data),
          createdAt: result.createdAt,
        })
      } catch (error) {
        return handleDbError(error, 'getImage')
      }
    },
  )

const MAX_LIST_LIMIT = 100

export const listImages = createServerFn({ method: 'GET' })
  .inputValidator((params?: { limit?: number; offset?: number }) => params ?? {})
  .handler(async ({ data: params }): Promise<Result<ImageMetadata[]>> => {
    try {
      // Validate and clamp limit/offset to prevent abuse
      const rawLimit = params.limit ?? 20
      const rawOffset = params.offset ?? 0
      const limit = Math.min(MAX_LIST_LIMIT, Math.max(1, Math.floor(rawLimit)))
      const offset = Math.max(0, Math.floor(rawOffset))

      const result = await withRetry(() =>
        db.query.images.findMany({
          columns: {
            id: true,
            contentHash: true,
            originalUrl: true,
            mimeType: true,
            createdAt: true,
          },
          orderBy: (images, { desc }) => [desc(images.createdAt)],
          limit,
          offset,
        }),
      )

      return ok(result)
    } catch (error) {
      return handleDbError(error, 'listImages')
    }
  })
