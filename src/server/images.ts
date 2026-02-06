import { createServerFn } from '@tanstack/react-start'
import { MAX_UPLOAD_SIZE_BYTES } from '@/lib/image-constants'
import { err, ok, type Result } from '@/lib/types'

const THUMBNAIL_SIZE = 64
const THUMBNAIL_QUALITY = 80

/**
 * Generate a 64x64 JPEG thumbnail from an image buffer.
 * Returns null on failure (never throws).
 * Uses dynamic imports to keep Node.js deps out of client bundle.
 */
async function generateThumbnail(buffer: Buffer): Promise<Buffer | null> {
  try {
    const { Jimp } = await import('jimp')
    const image = await Jimp.read(buffer)
    // Cover crop to 64x64
    image.cover({ w: THUMBNAIL_SIZE, h: THUMBNAIL_SIZE })
    // Export as JPEG with quality 80
    const jpegBuffer = await image.getBuffer('image/jpeg', { quality: THUMBNAIL_QUALITY })
    return Buffer.from(jpegBuffer)
  } catch {
    return null
  }
}

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
  hasThumbnail: boolean
}

// Core function for server-side use (can be called directly from other server functions)
// Uses dynamic imports to keep Node.js deps out of client bundle.
export async function storeImageCore(
  buffer: Buffer,
  mimeType: string,
  originalUrl?: string,
): Promise<Result<StoreImageResult>> {
  // biome-ignore lint/correctness/noNodejsModules: server-side function
  const { createHash } = await import('node:crypto')
  const { eq } = await import('drizzle-orm')
  const { db, withRetry } = await import('@/db')
  const { handleDbError } = await import('@/db/errors')
  const { images } = await import('@/db/schema')

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

    // Generate thumbnail (non-blocking, continue on failure)
    const thumbnail = await generateThumbnail(buffer)

    // Insert new image
    const [inserted] = await withRetry(() =>
      db
        .insert(images)
        .values({
          contentHash,
          originalUrl,
          mimeType,
          data: buffer,
          thumbnail,
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

// Server function wrapper for client-side calls
export const storeImage = createServerFn({ method: 'POST' })
  .inputValidator((data: { data: number[]; mimeType: string; originalUrl?: string }) => {
    if (!data || !Array.isArray(data.data) || data.data.length === 0) {
      throw new Error('Image data must be a non-empty array')
    }
    if (data.data.length > MAX_UPLOAD_SIZE_BYTES) {
      throw new Error(`Image data exceeds ${MAX_UPLOAD_SIZE_BYTES / 1024 / 1024}MB limit`)
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
    const buffer = Buffer.from(input.data as number[])
    return storeImageCore(buffer, input.mimeType, input.originalUrl)
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
      const { eq } = await import('drizzle-orm')
      const { db, withRetry } = await import('@/db')
      const { handleDbError } = await import('@/db/errors')
      const { images } = await import('@/db/schema')

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
    const { db, withRetry } = await import('@/db')
    const { handleDbError } = await import('@/db/errors')

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
            thumbnail: true,
          },
          orderBy: (images, { desc }) => [desc(images.createdAt)],
          limit,
          offset,
        }),
      )

      // Transform to metadata with hasThumbnail flag (don't send blob)
      const metadata: ImageMetadata[] = result.map((row) => ({
        id: row.id,
        contentHash: row.contentHash,
        originalUrl: row.originalUrl,
        mimeType: row.mimeType,
        createdAt: row.createdAt,
        hasThumbnail: row.thumbnail !== null,
      }))

      return ok(metadata)
    } catch (error) {
      return handleDbError(error, 'listImages')
    }
  })

export const getThumbnail = createServerFn({ method: 'GET' })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }): Promise<Result<{ thumbnail: number[] | null }>> => {
    const { eq } = await import('drizzle-orm')
    const { db, withRetry } = await import('@/db')
    const { handleDbError } = await import('@/db/errors')
    const { images } = await import('@/db/schema')

    try {
      // First, check if thumbnail exists
      const result = await withRetry(() =>
        db.query.images.findFirst({
          where: eq(images.id, id),
          columns: { id: true, thumbnail: true, data: true },
        }),
      )

      if (!result) {
        return err('NOT_FOUND', 'Image not found', 404)
      }

      // If thumbnail exists, return it
      if (result.thumbnail) {
        return ok({ thumbnail: Array.from(result.thumbnail) })
      }

      // No thumbnail exists, generate on-demand
      const thumbnail = await generateThumbnail(result.data)
      if (!thumbnail) {
        // Generation failed, return null
        return ok({ thumbnail: null })
      }

      // Save the generated thumbnail to the database
      await withRetry(() => db.update(images).set({ thumbnail }).where(eq(images.id, id)))

      return ok({ thumbnail: Array.from(thumbnail) })
    } catch (error) {
      return handleDbError(error, 'getThumbnail')
    }
  })

const PREVIEW_QUALITY = 90
const MIN_DIMENSION = 1
const MAX_DIMENSION = 1024

interface GetImagePreviewInput {
  imageId: string
  width: number
  height: number
}

/**
 * Generate a preview of an image at specific dimensions with cover crop.
 * Returns the image as JPEG bytes sized to match the display dimensions.
 */
export const getImagePreview = createServerFn({ method: 'GET' })
  .inputValidator((input: GetImagePreviewInput) => {
    if (!input.imageId || typeof input.imageId !== 'string') {
      throw new Error('imageId must be a non-empty string')
    }
    if (
      typeof input.width !== 'number' ||
      input.width < MIN_DIMENSION ||
      input.width > MAX_DIMENSION
    ) {
      throw new Error(`width must be between ${MIN_DIMENSION} and ${MAX_DIMENSION}`)
    }
    if (
      typeof input.height !== 'number' ||
      input.height < MIN_DIMENSION ||
      input.height > MAX_DIMENSION
    ) {
      throw new Error(`height must be between ${MIN_DIMENSION} and ${MAX_DIMENSION}`)
    }
    return input
  })
  .handler(async ({ data }): Promise<Result<{ preview: number[] }>> => {
    const { eq } = await import('drizzle-orm')
    const { db, withRetry } = await import('@/db')
    const { handleDbError } = await import('@/db/errors')
    const { images } = await import('@/db/schema')

    try {
      const { imageId, width, height } = data

      // Fetch the original image data
      const result = await withRetry(() =>
        db.query.images.findFirst({
          where: eq(images.id, imageId),
          columns: { data: true },
        }),
      )

      if (!result) {
        return err('NOT_FOUND', 'Image not found', 404)
      }

      // Generate preview at requested dimensions using cover crop
      try {
        const { Jimp } = await import('jimp')
        const image = await Jimp.read(result.data)
        image.cover({ w: width, h: height })
        const jpegBuffer = await image.getBuffer('image/jpeg', { quality: PREVIEW_QUALITY })
        return ok({ preview: Array.from(Buffer.from(jpegBuffer)) })
      } catch {
        return err('PROCESSING_ERROR', 'Failed to process image', 500)
      }
    } catch (error) {
      return handleDbError(error, 'getImagePreview')
    }
  })
