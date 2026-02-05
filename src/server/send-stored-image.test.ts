import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock jimp before importing the module
vi.mock('jimp', () => ({
  Jimp: {
    read: vi.fn(),
  },
}))

// Mock database
vi.mock('@/db', () => ({
  db: {
    query: {
      images: {
        findFirst: vi.fn(),
      },
    },
  },
  withRetry: vi.fn((fn) => fn()),
}))

// Mock createServerFn to return the handler directly for testing
vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => ({
    inputValidator: () => ({
      handler: (fn: (ctx: { data: unknown }) => Promise<unknown>) => fn,
    }),
  }),
}))

describe('sendStoredImageToDisplay', () => {
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

  describe('image retrieval', () => {
    it('returns error when image is not found', async () => {
      const { db } = await import('@/db')
      const { sendStoredImageToDisplay } = await import('./send-stored-image')

      vi.mocked(db.query.images.findFirst).mockResolvedValueOnce(undefined)

      const result = await sendStoredImageToDisplay({
        data: {
          imageId: 'non-existent-id',
          endpointUrl: 'http://localhost:4200',
        },
      })

      expect(result).toEqual({
        success: false,
        error: 'Image not found',
      })
    })

    it('retrieves image from database by id', async () => {
      const { db } = await import('@/db')
      const { Jimp } = await import('jimp')
      const { sendStoredImageToDisplay } = await import('./send-stored-image')

      const mockImageData = Buffer.from([0x89, 0x50, 0x4e, 0x47])
      vi.mocked(db.query.images.findFirst).mockResolvedValueOnce({
        data: mockImageData,
      })

      // Configuration fetch succeeds
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

      // Frame post succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
      })

      const result = await sendStoredImageToDisplay({
        data: {
          imageId: 'test-id',
          endpointUrl: 'http://localhost:4200',
        },
      })

      expect(result.success).toBe(true)
      expect(db.query.images.findFirst).toHaveBeenCalled()
    })
  })

  describe('display configuration', () => {
    it('fetches display configuration from endpoint', async () => {
      const { db } = await import('@/db')
      const { Jimp } = await import('jimp')
      const { sendStoredImageToDisplay } = await import('./send-stored-image')

      const mockImageData = Buffer.from([0x89, 0x50, 0x4e, 0x47])
      vi.mocked(db.query.images.findFirst).mockResolvedValueOnce({
        data: mockImageData,
      })

      // Configuration fetch succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ width: 32, height: 32 }),
      })

      // Mock Jimp.read
      const mockBitmapData = new Uint8Array(32 * 32 * 4)
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

      await sendStoredImageToDisplay({
        data: {
          imageId: 'test-id',
          endpointUrl: 'http://localhost:4200',
        },
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4200/configuration',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      )
    })

    it('returns error when configuration fetch fails', async () => {
      const { db } = await import('@/db')
      const { sendStoredImageToDisplay } = await import('./send-stored-image')

      const mockImageData = Buffer.from([0x89, 0x50, 0x4e, 0x47])
      vi.mocked(db.query.images.findFirst).mockResolvedValueOnce({
        data: mockImageData,
      })

      // Configuration fetch fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
      })

      const result = await sendStoredImageToDisplay({
        data: {
          imageId: 'test-id',
          endpointUrl: 'http://localhost:4200',
        },
      })

      expect(result).toEqual({
        success: false,
        error: 'Failed to get display config: 503',
      })
    })

    it('returns error for invalid display dimensions', async () => {
      const { db } = await import('@/db')
      const { sendStoredImageToDisplay } = await import('./send-stored-image')

      const mockImageData = Buffer.from([0x89, 0x50, 0x4e, 0x47])
      vi.mocked(db.query.images.findFirst).mockResolvedValueOnce({
        data: mockImageData,
      })

      // Configuration returns invalid dimensions
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ width: -1, height: 64 }),
      })

      const result = await sendStoredImageToDisplay({
        data: {
          imageId: 'test-id',
          endpointUrl: 'http://localhost:4200',
        },
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid display dimensions')
    })

    it('returns error for dimensions exceeding maximum', async () => {
      const { db } = await import('@/db')
      const { sendStoredImageToDisplay } = await import('./send-stored-image')

      const mockImageData = Buffer.from([0x89, 0x50, 0x4e, 0x47])
      vi.mocked(db.query.images.findFirst).mockResolvedValueOnce({
        data: mockImageData,
      })

      // Configuration returns dimensions exceeding 1024
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ width: 2000, height: 64 }),
      })

      const result = await sendStoredImageToDisplay({
        data: {
          imageId: 'test-id',
          endpointUrl: 'http://localhost:4200',
        },
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid display dimensions')
    })
  })

  describe('image resizing', () => {
    it('resizes image to match display dimensions', async () => {
      const { db } = await import('@/db')
      const { Jimp } = await import('jimp')
      const { sendStoredImageToDisplay } = await import('./send-stored-image')

      const mockImageData = Buffer.from([0x89, 0x50, 0x4e, 0x47])
      vi.mocked(db.query.images.findFirst).mockResolvedValueOnce({
        data: mockImageData,
      })

      // Configuration fetch succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ width: 64, height: 32 }),
      })

      // Mock Jimp.read with cover method
      const mockBitmapData = new Uint8Array(64 * 32 * 4)
      const mockCover = vi.fn().mockReturnValue({
        bitmap: { data: mockBitmapData },
      })
      vi.mocked(Jimp.read).mockResolvedValueOnce({
        width: 100,
        height: 100,
        cover: mockCover,
      } as never)

      // Frame post succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
      })

      await sendStoredImageToDisplay({
        data: {
          imageId: 'test-id',
          endpointUrl: 'http://localhost:4200',
        },
      })

      expect(mockCover).toHaveBeenCalledWith({ w: 64, h: 32 })
    })

    it('returns error when jimp fails to read image', async () => {
      const { db } = await import('@/db')
      const { Jimp } = await import('jimp')
      const { sendStoredImageToDisplay } = await import('./send-stored-image')

      const mockImageData = Buffer.from([0x00, 0x00])
      vi.mocked(db.query.images.findFirst).mockResolvedValueOnce({
        data: mockImageData,
      })

      // Configuration fetch succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ width: 64, height: 64 }),
      })

      // Mock Jimp.read to throw
      vi.mocked(Jimp.read).mockRejectedValueOnce(new Error('Invalid image format'))

      const result = await sendStoredImageToDisplay({
        data: {
          imageId: 'test-id',
          endpointUrl: 'http://localhost:4200',
        },
      })

      expect(result).toEqual({
        success: false,
        error: 'Invalid image format',
      })
    })
  })

  describe('frame sending', () => {
    it('sends resized frame to display endpoint', async () => {
      const { db } = await import('@/db')
      const { Jimp } = await import('jimp')
      const { sendStoredImageToDisplay } = await import('./send-stored-image')

      const mockImageData = Buffer.from([0x89, 0x50, 0x4e, 0x47])
      vi.mocked(db.query.images.findFirst).mockResolvedValueOnce({
        data: mockImageData,
      })

      // Configuration fetch succeeds
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

      // Frame post succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
      })

      await sendStoredImageToDisplay({
        data: {
          imageId: 'test-id',
          endpointUrl: 'http://localhost:4200',
        },
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4200/frame',
        expect.objectContaining({
          method: 'POST',
          signal: expect.any(AbortSignal),
        }),
      )
    })

    it('returns error when frame post fails', async () => {
      const { db } = await import('@/db')
      const { Jimp } = await import('jimp')
      const { sendStoredImageToDisplay } = await import('./send-stored-image')

      const mockImageData = Buffer.from([0x89, 0x50, 0x4e, 0x47])
      vi.mocked(db.query.images.findFirst).mockResolvedValueOnce({
        data: mockImageData,
      })

      // Configuration fetch succeeds
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

      // Frame post fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const result = await sendStoredImageToDisplay({
        data: {
          imageId: 'test-id',
          endpointUrl: 'http://localhost:4200',
        },
      })

      expect(result).toEqual({
        success: false,
        error: 'Failed to send frame: 500',
      })
    })

    it('returns success when frame is sent successfully', async () => {
      const { db } = await import('@/db')
      const { Jimp } = await import('jimp')
      const { sendStoredImageToDisplay } = await import('./send-stored-image')

      const mockImageData = Buffer.from([0x89, 0x50, 0x4e, 0x47])
      vi.mocked(db.query.images.findFirst).mockResolvedValueOnce({
        data: mockImageData,
      })

      // Configuration fetch succeeds
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

      // Frame post succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
      })

      const result = await sendStoredImageToDisplay({
        data: {
          imageId: 'test-id',
          endpointUrl: 'http://localhost:4200',
        },
      })

      expect(result).toEqual({
        success: true,
      })
    })
  })

  describe('timeout handling', () => {
    it('returns timeout error when configuration fetch times out', async () => {
      const { db } = await import('@/db')
      const { sendStoredImageToDisplay } = await import('./send-stored-image')

      const mockImageData = Buffer.from([0x89, 0x50, 0x4e, 0x47])
      vi.mocked(db.query.images.findFirst).mockResolvedValueOnce({
        data: mockImageData,
      })

      // Configuration fetch times out
      const timeoutError = new Error('Timeout')
      timeoutError.name = 'AbortError'
      mockFetch.mockRejectedValueOnce(timeoutError)

      const result = await sendStoredImageToDisplay({
        data: {
          imageId: 'test-id',
          endpointUrl: 'http://localhost:4200',
        },
      })

      expect(result).toEqual({
        success: false,
        error: 'Request timed out after 15 seconds',
      })
    })

    it('returns timeout error when frame post times out', async () => {
      const { db } = await import('@/db')
      const { Jimp } = await import('jimp')
      const { sendStoredImageToDisplay } = await import('./send-stored-image')

      const mockImageData = Buffer.from([0x89, 0x50, 0x4e, 0x47])
      vi.mocked(db.query.images.findFirst).mockResolvedValueOnce({
        data: mockImageData,
      })

      // Configuration fetch succeeds
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

      // Frame post times out
      const timeoutError = new Error('Timeout')
      timeoutError.name = 'AbortError'
      mockFetch.mockRejectedValueOnce(timeoutError)

      const result = await sendStoredImageToDisplay({
        data: {
          imageId: 'test-id',
          endpointUrl: 'http://localhost:4200',
        },
      })

      expect(result).toEqual({
        success: false,
        error: 'Request timed out after 15 seconds',
      })
    })
  })

  describe('endpoint URL handling', () => {
    it('strips trailing slashes from endpoint URL', async () => {
      const { db } = await import('@/db')
      const { Jimp } = await import('jimp')
      const { sendStoredImageToDisplay } = await import('./send-stored-image')

      const mockImageData = Buffer.from([0x89, 0x50, 0x4e, 0x47])
      vi.mocked(db.query.images.findFirst).mockResolvedValueOnce({
        data: mockImageData,
      })

      // Configuration fetch succeeds
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

      // Frame post succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
      })

      await sendStoredImageToDisplay({
        data: {
          imageId: 'test-id',
          endpointUrl: 'http://localhost:4200///',
        },
      })

      // Should call with cleaned URL
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4200/configuration',
        expect.anything(),
      )
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:4200/frame', expect.anything())
    })
  })
})
