import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock jimp before importing the module
vi.mock('jimp', () => ({
  Jimp: {
    read: vi.fn(),
  },
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
    it('returns timeout error when configuration fetch times out', async () => {
      // Import fresh module for each test
      const { sendImageToDisplay } = await import('./send-image-to-display')

      const timeoutError = new Error('Timeout')
      timeoutError.name = 'TimeoutError'
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

    it('returns timeout error when image fetch times out', async () => {
      const { sendImageToDisplay } = await import('./send-image-to-display')

      // First call succeeds (configuration)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ width: 64, height: 64 }),
      })

      // Second call times out (image fetch)
      const timeoutError = new Error('Timeout')
      timeoutError.name = 'TimeoutError'
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

      // Configuration fetch succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ width: 64, height: 64 }),
      })

      // Image fetch succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'Content-Length': '1000' }),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1000)),
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

      // Frame post times out
      const timeoutError = new Error('Timeout')
      timeoutError.name = 'TimeoutError'
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

      // Verify the first fetch was called with a signal
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4200/configuration',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      )
    })
  })

  describe('size limit validation', () => {
    it('rejects images exceeding 50MB based on Content-Length', async () => {
      const { sendImageToDisplay } = await import('./send-image-to-display')

      // Configuration fetch succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ width: 64, height: 64 }),
      })

      // Image fetch returns large Content-Length
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

      // Configuration fetch succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ width: 64, height: 64 }),
      })

      // Image fetch returns acceptable Content-Length
      const acceptableSize = 10 * 1024 * 1024 // 10MB
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'Content-Length': String(acceptableSize) }),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1000)),
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

      // Frame post succeeds
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

      // Configuration fetch succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ width: 64, height: 64 }),
      })

      // Image fetch without Content-Length header
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({}),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1000)),
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

      // Frame post succeeds
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

  describe('dimension warning', () => {
    it('returns warning when source image exceeds 256x256', async () => {
      const { Jimp } = await import('jimp')
      const { sendImageToDisplay } = await import('./send-image-to-display')

      // Configuration fetch succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ width: 64, height: 64 }),
      })

      // Image fetch succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'Content-Length': '1000' }),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1000)),
      })

      // Mock Jimp.read with large dimensions
      const mockBitmapData = new Uint8Array(64 * 64 * 4)
      vi.mocked(Jimp.read).mockResolvedValueOnce({
        width: 1920,
        height: 1080,
        cover: () => ({
          bitmap: { data: mockBitmapData },
        }),
      } as never)

      // Frame post succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
      })

      const result = await sendImageToDisplay({
        data: {
          imageUrl: 'https://example.com/large-image.png',
          endpointUrl: 'http://localhost:4200',
        },
      })

      expect(result.success).toBe(true)
      expect(result.warning).toBe(
        'Source image dimensions (1920x1080) exceed recommended maximum (256x256)',
      )
    })

    it('returns warning when only width exceeds 256', async () => {
      const { Jimp } = await import('jimp')
      const { sendImageToDisplay } = await import('./send-image-to-display')

      // Configuration fetch succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ width: 64, height: 64 }),
      })

      // Image fetch succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'Content-Length': '1000' }),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1000)),
      })

      // Mock Jimp.read - width exceeds
      const mockBitmapData = new Uint8Array(64 * 64 * 4)
      vi.mocked(Jimp.read).mockResolvedValueOnce({
        width: 300,
        height: 200,
        cover: () => ({
          bitmap: { data: mockBitmapData },
        }),
      } as never)

      // Frame post succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
      })

      const result = await sendImageToDisplay({
        data: {
          imageUrl: 'https://example.com/wide-image.png',
          endpointUrl: 'http://localhost:4200',
        },
      })

      expect(result.success).toBe(true)
      expect(result.warning).toContain('300x200')
      expect(result.warning).toContain('exceed recommended maximum')
    })

    it('returns warning when only height exceeds 256', async () => {
      const { Jimp } = await import('jimp')
      const { sendImageToDisplay } = await import('./send-image-to-display')

      // Configuration fetch succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ width: 64, height: 64 }),
      })

      // Image fetch succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'Content-Length': '1000' }),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1000)),
      })

      // Mock Jimp.read - height exceeds
      const mockBitmapData = new Uint8Array(64 * 64 * 4)
      vi.mocked(Jimp.read).mockResolvedValueOnce({
        width: 200,
        height: 300,
        cover: () => ({
          bitmap: { data: mockBitmapData },
        }),
      } as never)

      // Frame post succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
      })

      const result = await sendImageToDisplay({
        data: {
          imageUrl: 'https://example.com/tall-image.png',
          endpointUrl: 'http://localhost:4200',
        },
      })

      expect(result.success).toBe(true)
      expect(result.warning).toContain('200x300')
    })

    it('does not return warning for images within 256x256', async () => {
      const { Jimp } = await import('jimp')
      const { sendImageToDisplay } = await import('./send-image-to-display')

      // Configuration fetch succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ width: 64, height: 64 }),
      })

      // Image fetch succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'Content-Length': '1000' }),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1000)),
      })

      // Mock Jimp.read - small image
      const mockBitmapData = new Uint8Array(64 * 64 * 4)
      vi.mocked(Jimp.read).mockResolvedValueOnce({
        width: 256,
        height: 256,
        cover: () => ({
          bitmap: { data: mockBitmapData },
        }),
      } as never)

      // Frame post succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
      })

      const result = await sendImageToDisplay({
        data: {
          imageUrl: 'https://example.com/small-image.png',
          endpointUrl: 'http://localhost:4200',
        },
      })

      expect(result.success).toBe(true)
      expect(result.warning).toBeUndefined()
    })
  })
})
