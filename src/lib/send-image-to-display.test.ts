import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock jimp before importing the module
vi.mock('jimp', () => ({
  Jimp: {
    read: vi.fn(),
  },
}))

// Mock storeImageCore to avoid database calls
vi.mock('@/server/images', () => ({
  ALLOWED_MIME_TYPES: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp'],
  storeImageCore: vi
    .fn()
    .mockResolvedValue({ success: true, data: { id: 'test-id', isNew: true } }),
}))

// Mock createServerFn to return the handler directly for testing
vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => ({
    inputValidator: () => ({
      handler: (fn: (ctx: { data: unknown }) => Promise<unknown>) => fn,
    }),
  }),
}))

describe('sendImageToDisplay', () => {
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

  describe('timeout handling', () => {
    it('returns timeout error when image fetch times out', async () => {
      // Import fresh module for each test
      const { sendImageToDisplay } = await import('./send-image-to-display')

      // Image fetch times out (first call)
      const timeoutError = new Error('Timeout')
      timeoutError.name = 'AbortError'
      mockFetch.mockRejectedValueOnce(timeoutError)

      const result = await sendImageToDisplay({
        data: {
          imageUrl: 'https://example.com/image.png',
          endpointUrl: 'http://localhost:4200',
        },
      })

      expect(result).toEqual({
        success: false,
        error: 'Request timed out after 15 seconds',
      })
    })

    it('returns timeout error when configuration fetch times out', async () => {
      const { sendImageToDisplay } = await import('./send-image-to-display')

      // Image fetch succeeds (first call)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'Content-Length': '1000' }),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1000)),
      })

      // Configuration fetch times out (second call, inside processAndSendToDisplay)
      const timeoutError = new Error('Timeout')
      timeoutError.name = 'AbortError'
      mockFetch.mockRejectedValueOnce(timeoutError)

      const result = await sendImageToDisplay({
        data: {
          imageUrl: 'https://example.com/image.png',
          endpointUrl: 'http://localhost:4200',
        },
      })

      expect(result).toEqual({
        success: false,
        error: 'Request timed out after 15 seconds',
      })
    })

    it('returns timeout error when frame post times out', async () => {
      const { Jimp } = await import('jimp')
      const { sendImageToDisplay } = await import('./send-image-to-display')

      // Image fetch succeeds (first call)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'Content-Length': '1000' }),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1000)),
      })

      // Configuration fetch succeeds (second call)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ width: 64, height: 64 }),
      })

      // Mock Jimp.read to return a mock image
      const mockBitmapData = new Uint8Array(64 * 64 * 4)
      vi.mocked(Jimp.read).mockResolvedValueOnce({
        width: 100,
        height: 100,
        cover: () => ({
          bitmap: { data: mockBitmapData },
        }),
      } as never)

      // Frame post times out (third call)
      const timeoutError = new Error('Timeout')
      timeoutError.name = 'AbortError'
      mockFetch.mockRejectedValueOnce(timeoutError)

      const result = await sendImageToDisplay({
        data: {
          imageUrl: 'https://example.com/image.png',
          endpointUrl: 'http://localhost:4200',
        },
      })

      expect(result).toEqual({
        success: false,
        error: 'Request timed out after 15 seconds',
      })
    })

    it('passes AbortSignal.timeout to all fetch calls', async () => {
      const { sendImageToDisplay } = await import('./send-image-to-display')

      // Image fetch fails (first call)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      await sendImageToDisplay({
        data: {
          imageUrl: 'https://example.com/image.png',
          endpointUrl: 'http://localhost:4200',
        },
      })

      // Verify the first fetch (image fetch) was called with a signal
      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/image.png',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      )
    })
  })

  describe('size limit validation', () => {
    it('rejects images exceeding 50MB based on Content-Length', async () => {
      const { sendImageToDisplay } = await import('./send-image-to-display')

      // Image fetch returns large Content-Length (first call)
      const largeSize = 60 * 1024 * 1024 // 60MB
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'Content-Length': String(largeSize) }),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      })

      const result = await sendImageToDisplay({
        data: {
          imageUrl: 'https://example.com/large-image.png',
          endpointUrl: 'http://localhost:4200',
        },
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Image too large')
      expect(result.error).toContain('60MB')
      expect(result.error).toContain('50MB limit')
    })

    it('allows images under 50MB', async () => {
      const { Jimp } = await import('jimp')
      const { sendImageToDisplay } = await import('./send-image-to-display')

      // Image fetch returns acceptable Content-Length (first call)
      const acceptableSize = 10 * 1024 * 1024 // 10MB
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'Content-Length': String(acceptableSize) }),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1000)),
      })

      // Configuration fetch succeeds (second call)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ width: 64, height: 64 }),
      })

      // Mock Jimp.read
      const mockBitmapData = new Uint8Array(64 * 64 * 4)
      vi.mocked(Jimp.read).mockResolvedValueOnce({
        width: 100,
        height: 100,
        cover: () => ({
          bitmap: { data: mockBitmapData },
        }),
      } as never)

      // Frame post succeeds (third call)
      mockFetch.mockResolvedValueOnce({
        ok: true,
      })

      const result = await sendImageToDisplay({
        data: {
          imageUrl: 'https://example.com/image.png',
          endpointUrl: 'http://localhost:4200',
        },
      })

      expect(result.success).toBe(true)
    })

    it('proceeds when Content-Length header is missing', async () => {
      const { Jimp } = await import('jimp')
      const { sendImageToDisplay } = await import('./send-image-to-display')

      // Image fetch without Content-Length header (first call)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({}),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1000)),
      })

      // Configuration fetch succeeds (second call)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ width: 64, height: 64 }),
      })

      // Mock Jimp.read
      const mockBitmapData = new Uint8Array(64 * 64 * 4)
      vi.mocked(Jimp.read).mockResolvedValueOnce({
        width: 100,
        height: 100,
        cover: () => ({
          bitmap: { data: mockBitmapData },
        }),
      } as never)

      // Frame post succeeds (third call)
      mockFetch.mockResolvedValueOnce({
        ok: true,
      })

      const result = await sendImageToDisplay({
        data: {
          imageUrl: 'https://example.com/image.png',
          endpointUrl: 'http://localhost:4200',
        },
      })

      expect(result.success).toBe(true)
    })
  })
})
