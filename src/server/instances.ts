import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { type Instance, instances } from '@/db/schema'
import { sanitizeString, validateEndpointUrl } from '@/lib/utils'

export const getInstances = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Instance[]> => {
    const result = await db.query.instances.findMany({
      orderBy: (instances, { asc }) => [asc(instances.createdAt)],
    })
    return result
  },
)

export const getInstanceById = createServerFn({ method: 'GET' })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }): Promise<Instance | null> => {
    const result = await db.query.instances.findFirst({
      where: eq(instances.id, id),
    })
    return result ?? null
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
  .handler(async ({ data }): Promise<Instance> => {
    const [inserted] = await db
      .insert(instances)
      .values({
        name: data.name,
        endpointUrl: data.endpointUrl,
      })
      .returning()

    return inserted
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
  .handler(async ({ data }): Promise<Instance> => {
    const [updated] = await db
      .update(instances)
      .set({
        name: data.name,
        endpointUrl: data.endpointUrl,
        updatedAt: new Date(),
      })
      .where(eq(instances.id, data.id))
      .returning()

    if (!updated) {
      throw new Error('Instance not found')
    }

    return updated
  })

export const deleteInstance = createServerFn({ method: 'POST' })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }): Promise<{ success: boolean }> => {
    const result = await db.delete(instances).where(eq(instances.id, id)).returning()

    if (result.length === 0) {
      throw new Error('Instance not found')
    }

    return { success: true }
  })
