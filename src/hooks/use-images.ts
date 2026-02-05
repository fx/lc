import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Result } from '@/lib/types'
import { getImage, getThumbnail, listImages } from '@/server/images'
import { sendStoredImageToDisplay } from '@/server/send-stored-image'

export const IMAGES_KEY = ['images'] as const

class AppError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = status
  }
}

function unwrapResult<T>(result: Result<T>): T {
  if (!result.success) {
    throw new AppError(result.error.code, result.error.message, result.error.status)
  }
  return result.data
}

export function useImages(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: [...IMAGES_KEY, params],
    queryFn: async () => {
      const result = await listImages({ data: params })
      return unwrapResult(result)
    },
  })
}

export function useImageThumbnail(id: string | null) {
  return useQuery({
    queryKey: [...IMAGES_KEY, 'thumbnail', id],
    queryFn: async () => {
      if (!id) return null
      const result = await getThumbnail({ data: id })
      return unwrapResult(result)
    },
    enabled: !!id,
    staleTime: Number.POSITIVE_INFINITY,
  })
}

export function useImage(id: string | null) {
  return useQuery({
    queryKey: [...IMAGES_KEY, id],
    queryFn: async () => {
      if (!id) return null
      const result = await getImage({ data: id })
      return unwrapResult(result)
    },
    enabled: !!id,
  })
}

export function useSendImageToDisplay() {
  return useMutation({
    mutationFn: async ({ imageId, endpointUrl }: { imageId: string; endpointUrl: string }) => {
      const result = await sendStoredImageToDisplay({ data: { imageId, endpointUrl } })
      if (!result.success) {
        throw new Error(result.error || 'Failed to send image')
      }
      return result
    },
  })
}

export function useInvalidateImages() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: IMAGES_KEY })
}
