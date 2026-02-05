import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { FitMode, VideoQueueState } from '@/lib/video-api'
import {
  addVideoToQueue,
  clearVideoQueue,
  getVideoQueue,
  setFitMode,
  setRepeatMode,
  skipVideo,
} from '@/lib/video-api'

export const VIDEO_QUEUE_KEY = ['video-queue'] as const

export function useVideoQueue(endpointUrl: string | null) {
  return useQuery({
    queryKey: [...VIDEO_QUEUE_KEY, endpointUrl],
    queryFn: async (): Promise<VideoQueueState | null> => {
      if (!endpointUrl) return null
      return getVideoQueue({ data: { endpointUrl } })
    },
    enabled: !!endpointUrl,
    refetchInterval: 3000,
  })
}

export function useAddVideo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ endpointUrl, url }: { endpointUrl: string; url: string }) => {
      await addVideoToQueue({ data: { endpointUrl, url } })
    },
    onSuccess: (_, { endpointUrl }) => {
      queryClient.invalidateQueries({ queryKey: [...VIDEO_QUEUE_KEY, endpointUrl] })
    },
  })
}

export function useClearQueue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ endpointUrl }: { endpointUrl: string }) => {
      await clearVideoQueue({ data: { endpointUrl } })
    },
    onSuccess: (_, { endpointUrl }) => {
      queryClient.invalidateQueries({ queryKey: [...VIDEO_QUEUE_KEY, endpointUrl] })
    },
  })
}

export function useSkipVideo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ endpointUrl }: { endpointUrl: string }) => {
      await skipVideo({ data: { endpointUrl } })
    },
    onSuccess: (_, { endpointUrl }) => {
      queryClient.invalidateQueries({ queryKey: [...VIDEO_QUEUE_KEY, endpointUrl] })
    },
  })
}

export function useSetRepeatMode() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ endpointUrl, enabled }: { endpointUrl: string; enabled: boolean }) => {
      await setRepeatMode({ data: { endpointUrl, enabled } })
    },
    onSuccess: (_, { endpointUrl }) => {
      queryClient.invalidateQueries({ queryKey: [...VIDEO_QUEUE_KEY, endpointUrl] })
    },
  })
}

export function useSetFitMode() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ endpointUrl, fit }: { endpointUrl: string; fit: FitMode }) => {
      await setFitMode({ data: { endpointUrl, fit } })
    },
    onSuccess: (_, { endpointUrl }) => {
      queryClient.invalidateQueries({ queryKey: [...VIDEO_QUEUE_KEY, endpointUrl] })
    },
  })
}

export function useInvalidateVideoQueue() {
  const queryClient = useQueryClient()
  return (endpointUrl: string) =>
    queryClient.invalidateQueries({ queryKey: [...VIDEO_QUEUE_KEY, endpointUrl] })
}
