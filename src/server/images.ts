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

// Server function wrapper for client-side calls
export const storeImage = createServerFn({ method: 'POST' })
  .inputValidator((data: { data: number[]; mimeType: string; originalUrl?: string }) => data)
  .handler(async ({ data: input }): Promise<Result<StoreImageResult>> => {
    const buffer = Buffer.from(input.data)
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

export const listImages = createServerFn({ method: 'GET' })
  .inputValidator((params?: { limit?: number; offset?: number }) => params ?? {})
  .handler(async ({ data: params }): Promise<Result<ImageMetadata[]>> => {
    try {
      const limit = params.limit ?? 20
      const offset = params.offset ?? 0

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
