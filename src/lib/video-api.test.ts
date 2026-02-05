import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock createServerFn to return the handler directly for testing
vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => ({
    inputValidator: () => ({
      handler: (fn: (ctx: { data: unknown }) => Promise<unknown>) => fn,
    }),
  }),
}))

describe('video-api', () => {
  let originalFetch: typeof global.fetch
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    originalFetch = global.fetch
    mockFetch = vi.fn()
    global.fetch = mockFetch
    vi.clearAllMocks()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  describe('getVideoQueue', () => {
    it('fetches video queue successfully', async () => {
      const { getVideoQueue } = await import('./video-api')

      const mockQueueState = {
        queue: [{ url: 'https://example.com/video.mp4', status: 'queued', error: null }],
        current: null,
        repeat: false,
        fit: 'cover',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockQueueState),
      })

      const result = await getVideoQueue({
        data: { endpointUrl: 'http://localhost:4200' },
      })

      expect(result).toEqual(mockQueueState)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4200/video/queue',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      )
    })

    it('throws error on failed response', async () => {
      const { getVideoQueue } = await import('./video-api')

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(
        getVideoQueue({ data: { endpointUrl: 'http://localhost:4200' } }),
      ).rejects.toThrow('Failed to get video queue: 500 Internal Server Error')
    })

    it('handles timeout', async () => {
      const { getVideoQueue } = await import('./video-api')

      const timeoutError = new Error('Timeout')
      timeoutError.name = 'AbortError'
      mockFetch.mockRejectedValueOnce(timeoutError)

      await expect(
        getVideoQueue({ data: { endpointUrl: 'http://localhost:4200' } }),
      ).rejects.toThrow()
    })

    it('strips trailing slashes from endpoint URL', async () => {
      const { getVideoQueue } = await import('./video-api')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ queue: [], current: null, repeat: false, fit: 'cover' }),
      })

      await getVideoQueue({ data: { endpointUrl: 'http://localhost:4200/' } })

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4200/video/queue',
        expect.any(Object),
      )
    })
  })

  describe('addVideoToQueue', () => {
    it('adds video to queue successfully', async () => {
      const { addVideoToQueue } = await import('./video-api')

      mockFetch.mockResolvedValueOnce({
        ok: true,
      })

      await addVideoToQueue({
        data: { endpointUrl: 'http://localhost:4200', url: 'https://youtube.com/watch?v=123' },
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4200/video/queue',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: 'https://youtube.com/watch?v=123' }),
          signal: expect.any(AbortSignal),
        }),
      )
    })

    it('throws error on failed response', async () => {
      const { addVideoToQueue } = await import('./video-api')

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      })

      await expect(
        addVideoToQueue({
          data: { endpointUrl: 'http://localhost:4200', url: 'https://example.com/video.mp4' },
        }),
      ).rejects.toThrow('Failed to add video to queue: 400 Bad Request')
    })
  })

  describe('clearVideoQueue', () => {
    it('clears video queue successfully', async () => {
      const { clearVideoQueue } = await import('./video-api')

      mockFetch.mockResolvedValueOnce({
        ok: true,
      })

      await clearVideoQueue({
        data: { endpointUrl: 'http://localhost:4200' },
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4200/video/queue',
        expect.objectContaining({
          method: 'DELETE',
          signal: expect.any(AbortSignal),
        }),
      )
    })

    it('throws error on failed response', async () => {
      const { clearVideoQueue } = await import('./video-api')

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: '',
      })

      await expect(
        clearVideoQueue({ data: { endpointUrl: 'http://localhost:4200' } }),
      ).rejects.toThrow('Failed to clear video queue: 500')
    })
  })

  describe('skipVideo', () => {
    it('skips current video successfully', async () => {
      const { skipVideo } = await import('./video-api')

      mockFetch.mockResolvedValueOnce({
        ok: true,
      })

      await skipVideo({
        data: { endpointUrl: 'http://localhost:4200' },
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4200/video/skip',
        expect.objectContaining({
          method: 'POST',
          signal: expect.any(AbortSignal),
        }),
      )
    })

    it('throws error on failed response', async () => {
      const { skipVideo } = await import('./video-api')

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      await expect(skipVideo({ data: { endpointUrl: 'http://localhost:4200' } })).rejects.toThrow(
        'Failed to skip video: 404 Not Found',
      )
    })
  })

  describe('setRepeatMode', () => {
    it('enables repeat mode successfully', async () => {
      const { setRepeatMode } = await import('./video-api')

      mockFetch.mockResolvedValueOnce({
        ok: true,
      })

      await setRepeatMode({
        data: { endpointUrl: 'http://localhost:4200', enabled: true },
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4200/video/repeat',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: true }),
          signal: expect.any(AbortSignal),
        }),
      )
    })

    it('disables repeat mode successfully', async () => {
      const { setRepeatMode } = await import('./video-api')

      mockFetch.mockResolvedValueOnce({
        ok: true,
      })

      await setRepeatMode({
        data: { endpointUrl: 'http://localhost:4200', enabled: false },
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4200/video/repeat',
        expect.objectContaining({
          body: JSON.stringify({ enabled: false }),
        }),
      )
    })

    it('throws error on failed response', async () => {
      const { setRepeatMode } = await import('./video-api')

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(
        setRepeatMode({ data: { endpointUrl: 'http://localhost:4200', enabled: true } }),
      ).rejects.toThrow('Failed to set repeat mode: 500 Internal Server Error')
    })
  })

  describe('setFitMode', () => {
    it('sets fit mode to cover successfully', async () => {
      const { setFitMode } = await import('./video-api')

      mockFetch.mockResolvedValueOnce({
        ok: true,
      })

      await setFitMode({
        data: { endpointUrl: 'http://localhost:4200', fit: 'cover' },
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4200/video/fit',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fit: 'cover' }),
          signal: expect.any(AbortSignal),
        }),
      )
    })

    it('sets fit mode to contain successfully', async () => {
      const { setFitMode } = await import('./video-api')

      mockFetch.mockResolvedValueOnce({
        ok: true,
      })

      await setFitMode({
        data: { endpointUrl: 'http://localhost:4200', fit: 'contain' },
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4200/video/fit',
        expect.objectContaining({
          body: JSON.stringify({ fit: 'contain' }),
        }),
      )
    })

    it('sets fit mode to stretch successfully', async () => {
      const { setFitMode } = await import('./video-api')

      mockFetch.mockResolvedValueOnce({
        ok: true,
      })

      await setFitMode({
        data: { endpointUrl: 'http://localhost:4200', fit: 'stretch' },
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4200/video/fit',
        expect.objectContaining({
          body: JSON.stringify({ fit: 'stretch' }),
        }),
      )
    })

    it('throws error on failed response', async () => {
      const { setFitMode } = await import('./video-api')

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      })

      await expect(
        setFitMode({ data: { endpointUrl: 'http://localhost:4200', fit: 'cover' } }),
      ).rejects.toThrow('Failed to set fit mode: 400 Bad Request')
    })
  })
})
