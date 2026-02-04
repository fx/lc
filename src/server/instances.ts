import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db, withRetry } from '@/db'
import { handleDbError } from '@/db/errors'
import { type Instance, instances } from '@/db/schema'
import { err, ok, type Result } from '@/lib/types'
import { sanitizeString, validateEndpointUrl } from '@/lib/utils'

export const getInstances = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Result<Instance[]>> => {
    try {
      const result = await withRetry(() =>
        db.query.instances.findMany({
          orderBy: (instances, { asc }) => [asc(instances.createdAt)],
        }),
      )
      return ok(result)
    } catch (error) {
      return handleDbError(error, 'getInstances')
    }
  },
)

export const getInstanceById = createServerFn({ method: 'GET' })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }): Promise<Result<Instance | null>> => {
    try {
      const result = await withRetry(() =>
        db.query.instances.findFirst({
          where: eq(instances.id, id),
        }),
      )
      return ok(result ?? null)
    } catch (error) {
      return handleDbError(error, 'getInstanceById')
    }
  })

export const createInstance = createServerFn({ method: 'POST' })
  .inputValidator((data: { name: string; endpointUrl: string }) => {
    const sanitizedName = sanitizeString(data.name)
    const trimmedUrl = data.endpointUrl.trim()

    if (!sanitizedName) {
      throw new Error('Name is required')
    }

    const urlValidation = validateEndpointUrl(trimmedUrl)
    if (!urlValidation.valid) {
      throw new Error(urlValidation.error ?? 'Invalid URL')
    }

    return { name: sanitizedName, endpointUrl: trimmedUrl }
  })
  .handler(async ({ data }): Promise<Result<Instance>> => {
    try {
      const [inserted] = await withRetry(() =>
        db
          .insert(instances)
          .values({
            name: data.name,
            endpointUrl: data.endpointUrl,
          })
          .returning(),
      )

      return ok(inserted)
    } catch (error) {
      return handleDbError(error, 'createInstance')
    }
  })

export const updateInstance = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string; name: string; endpointUrl: string }) => {
    const sanitizedName = sanitizeString(data.name)
    const trimmedUrl = data.endpointUrl.trim()

    if (!sanitizedName) {
      throw new Error('Name is required')
    }

    const urlValidation = validateEndpointUrl(trimmedUrl)
    if (!urlValidation.valid) {
      throw new Error(urlValidation.error ?? 'Invalid URL')
    }

    return { id: data.id, name: sanitizedName, endpointUrl: trimmedUrl }
  })
  .handler(async ({ data }): Promise<Result<Instance>> => {
    try {
      const [updated] = await withRetry(() =>
        db
          .update(instances)
          .set({
            name: data.name,
            endpointUrl: data.endpointUrl,
            updatedAt: new Date(),
          })
          .where(eq(instances.id, data.id))
          .returning(),
      )

      if (!updated) {
        return err('NOT_FOUND', 'Instance not found', 404)
      }

      return ok(updated)
    } catch (error) {
      return handleDbError(error, 'updateInstance')
    }
  })

export const deleteInstance = createServerFn({ method: 'POST' })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }): Promise<Result<{ deleted: boolean }>> => {
    try {
      const result = await withRetry(() =>
        db.delete(instances).where(eq(instances.id, id)).returning(),
      )

      if (result.length === 0) {
        return err('NOT_FOUND', 'Instance not found', 404)
      }

      return ok({ deleted: true })
    } catch (error) {
      return handleDbError(error, 'deleteInstance')
    }
  })
