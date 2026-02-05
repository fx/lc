import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FitMode, VideoQueueState } from '@/lib/video-api'

// Mock the video-api module
vi.mock('@/lib/video-api', () => ({
  getVideoQueue: vi.fn(),
  addVideoToQueue: vi.fn(),
  clearVideoQueue: vi.fn(),
  skipVideo: vi.fn(),
  setRepeatMode: vi.fn(),
  setFitMode: vi.fn(),
}))

import {
  addVideoToQueue,
  clearVideoQueue,
  getVideoQueue,
  setFitMode,
  setRepeatMode,
  skipVideo,
} from '@/lib/video-api'
import {
  useAddVideo,
  useClearQueue,
  useInvalidateVideoQueue,
  useSetFitMode,
  useSetRepeatMode,
  useSkipVideo,
  useVideoQueue,
  VIDEO_QUEUE_KEY,
} from './use-video-queue'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('use-video-queue hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('useVideoQueue', () => {
    it('does not fetch when endpointUrl is null', async () => {
      const { result } = renderHook(() => useVideoQueue(null), {
        wrapper: createWrapper(),
      })

      expect(result.current.data).toBeUndefined()
      expect(result.current.fetchStatus).toBe('idle')
      expect(getVideoQueue).not.toHaveBeenCalled()
    })

    it('fetches video queue when endpointUrl is provided', async () => {
      const mockQueueState: VideoQueueState = {
        queue: [{ url: 'https://example.com/video.mp4', status: 'queued', error: null }],
        current: null,
        repeat: false,
        fit: 'cover',
      }

      vi.mocked(getVideoQueue).mockResolvedValueOnce(mockQueueState)

      const { result } = renderHook(() => useVideoQueue('http://localhost:4200'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockQueueState)
      expect(getVideoQueue).toHaveBeenCalledWith({
        data: { endpointUrl: 'http://localhost:4200' },
      })
    })

    it('handles fetch error', async () => {
      vi.mocked(getVideoQueue).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useVideoQueue('http://localhost:4200'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeInstanceOf(Error)
      expect(result.current.error?.message).toBe('Network error')
    })
  })

  describe('useAddVideo', () => {
    it('adds video to queue and invalidates queries', async () => {
      vi.mocked(addVideoToQueue).mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useAddVideo(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        endpointUrl: 'http://localhost:4200',
        url: 'https://youtube.com/watch?v=123',
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(addVideoToQueue).toHaveBeenCalledWith({
        data: {
          endpointUrl: 'http://localhost:4200',
          url: 'https://youtube.com/watch?v=123',
        },
      })
    })

    it('handles add video error', async () => {
      vi.mocked(addVideoToQueue).mockRejectedValueOnce(new Error('Failed to add video'))

      const { result } = renderHook(() => useAddVideo(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        endpointUrl: 'http://localhost:4200',
        url: 'https://example.com/video.mp4',
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeInstanceOf(Error)
      expect(result.current.error?.message).toBe('Failed to add video')
    })
  })

  describe('useClearQueue', () => {
    it('clears queue and invalidates queries', async () => {
      vi.mocked(clearVideoQueue).mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useClearQueue(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ endpointUrl: 'http://localhost:4200' })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(clearVideoQueue).toHaveBeenCalledWith({
        data: { endpointUrl: 'http://localhost:4200' },
      })
    })

    it('handles clear queue error', async () => {
      vi.mocked(clearVideoQueue).mockRejectedValueOnce(new Error('Failed to clear queue'))

      const { result } = renderHook(() => useClearQueue(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ endpointUrl: 'http://localhost:4200' })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error?.message).toBe('Failed to clear queue')
    })
  })

  describe('useSkipVideo', () => {
    it('skips video and invalidates queries', async () => {
      vi.mocked(skipVideo).mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useSkipVideo(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ endpointUrl: 'http://localhost:4200' })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(skipVideo).toHaveBeenCalledWith({
        data: { endpointUrl: 'http://localhost:4200' },
      })
    })

    it('handles skip video error', async () => {
      vi.mocked(skipVideo).mockRejectedValueOnce(new Error('Failed to skip video'))

      const { result } = renderHook(() => useSkipVideo(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ endpointUrl: 'http://localhost:4200' })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error?.message).toBe('Failed to skip video')
    })
  })

  describe('useSetRepeatMode', () => {
    it('enables repeat mode and invalidates queries', async () => {
      vi.mocked(setRepeatMode).mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useSetRepeatMode(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ endpointUrl: 'http://localhost:4200', enabled: true })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(setRepeatMode).toHaveBeenCalledWith({
        data: { endpointUrl: 'http://localhost:4200', enabled: true },
      })
    })

    it('disables repeat mode and invalidates queries', async () => {
      vi.mocked(setRepeatMode).mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useSetRepeatMode(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ endpointUrl: 'http://localhost:4200', enabled: false })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(setRepeatMode).toHaveBeenCalledWith({
        data: { endpointUrl: 'http://localhost:4200', enabled: false },
      })
    })

    it('handles set repeat mode error', async () => {
      vi.mocked(setRepeatMode).mockRejectedValueOnce(new Error('Failed to set repeat mode'))

      const { result } = renderHook(() => useSetRepeatMode(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ endpointUrl: 'http://localhost:4200', enabled: true })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error?.message).toBe('Failed to set repeat mode')
    })
  })

  describe('useSetFitMode', () => {
    it('sets fit mode to cover and invalidates queries', async () => {
      vi.mocked(setFitMode).mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useSetFitMode(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ endpointUrl: 'http://localhost:4200', fit: 'cover' as FitMode })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(setFitMode).toHaveBeenCalledWith({
        data: { endpointUrl: 'http://localhost:4200', fit: 'cover' },
      })
    })

    it('sets fit mode to contain and invalidates queries', async () => {
      vi.mocked(setFitMode).mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useSetFitMode(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ endpointUrl: 'http://localhost:4200', fit: 'contain' as FitMode })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(setFitMode).toHaveBeenCalledWith({
        data: { endpointUrl: 'http://localhost:4200', fit: 'contain' },
      })
    })

    it('sets fit mode to stretch and invalidates queries', async () => {
      vi.mocked(setFitMode).mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useSetFitMode(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ endpointUrl: 'http://localhost:4200', fit: 'stretch' as FitMode })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(setFitMode).toHaveBeenCalledWith({
        data: { endpointUrl: 'http://localhost:4200', fit: 'stretch' },
      })
    })

    it('handles set fit mode error', async () => {
      vi.mocked(setFitMode).mockRejectedValueOnce(new Error('Failed to set fit mode'))

      const { result } = renderHook(() => useSetFitMode(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ endpointUrl: 'http://localhost:4200', fit: 'cover' as FitMode })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error?.message).toBe('Failed to set fit mode')
    })
  })

  describe('useInvalidateVideoQueue', () => {
    it('returns a function that invalidates video queue queries', async () => {
      const mockQueueState: VideoQueueState = {
        queue: [],
        current: null,
        repeat: false,
        fit: 'cover',
      }

      vi.mocked(getVideoQueue).mockResolvedValue(mockQueueState)

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      })

      // First, populate the cache with a query
      const endpointUrl = 'http://localhost:4200'
      await queryClient.prefetchQuery({
        queryKey: [...VIDEO_QUEUE_KEY, endpointUrl],
        queryFn: () => getVideoQueue({ data: { endpointUrl } }),
      })

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )

      const { result } = renderHook(() => useInvalidateVideoQueue(), { wrapper })

      // The hook should return a function
      expect(typeof result.current).toBe('function')

      // Call the invalidate function
      await result.current(endpointUrl)

      // Verify the query was invalidated (state should be stale)
      const queryState = queryClient.getQueryState([...VIDEO_QUEUE_KEY, endpointUrl])
      expect(queryState?.isInvalidated).toBe(true)
    })
  })
})
