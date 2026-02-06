// biome-ignore lint/correctness/noNodejsModules: server-side test file
import { createHash } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the database module
const mockFindFirst = vi.fn()
const mockFindMany = vi.fn()
const mockValues = vi.fn()
const mockOnConflictDoNothing = vi.fn()
const mockReturning = vi.fn()
const mockUpdate = vi.fn()
const mockSet = vi.fn()
const mockWhere = vi.fn()

vi.mock('@/db', () => ({
  db: {
    query: {
      images: {
        findFirst: (...args: unknown[]) => mockFindFirst(...args),
        findMany: (...args: unknown[]) => mockFindMany(...args),
      },
    },
    insert: () => ({
      values: (...args: unknown[]) => {
        mockValues(...args)
        return {
          onConflictDoNothing: (...conflictArgs: unknown[]) => {
            mockOnConflictDoNothing(...conflictArgs)
            return {
              returning: (...returnArgs: unknown[]) => mockReturning(...returnArgs),
            }
          },
        }
      },
    }),
    update: (...args: unknown[]) => {
      mockUpdate(...args)
      return {
        set: (...setArgs: unknown[]) => {
          mockSet(...setArgs)
          return {
            where: (...whereArgs: unknown[]) => mockWhere(...whereArgs),
          }
        },
      }
    },
  },
  withRetry: <T>(fn: () => Promise<T>) => fn(),
}))

vi.mock('@/db/errors', () => ({
  handleDbError: (error: unknown, context?: string) => ({
    success: false,
    error: { code: 'DATABASE_ERROR', message: `[${context}] ${error}`, status: 500 },
  }),
}))

vi.mock('@/db/schema', () => ({
  images: {
    id: 'id',
    contentHash: 'content_hash',
  },
}))

// Mock createServerFn to return the handler directly for testing
vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => ({
    inputValidator: (validator: (input: unknown) => unknown) => ({
      handler: (fn: (ctx: { data: unknown }) => Promise<unknown>) => {
        // Return an async function that validates input, then calls the handler with properly wrapped data
        return async (input: unknown) => {
          // Run the validator - it throws on invalid input (wrapped in async to become rejection)
          const validatedData = validator(input)
          return fn({ data: validatedData })
        }
      },
    }),
  }),
}))

describe('storeImage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates new image when hash does not exist', async () => {
    const { storeImage } = await import('./images')

    const testData = [0x89, 0x50, 0x4e, 0x47] // PNG header bytes
    const expectedHash = createHash('sha256').update(Buffer.from(testData)).digest('hex')

    // No existing image
    mockFindFirst.mockResolvedValueOnce(null)
    // Insert succeeds
    mockReturning.mockResolvedValueOnce([{ id: 'new-uuid-123' }])

    const result = await storeImage({
      data: testData,
      mimeType: 'image/png',
      originalUrl: 'https://example.com/image.png',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe('new-uuid-123')
      expect(result.data.isNew).toBe(true)
    }

    // Verify insert was called with correct values (thumbnail may be null or Buffer)
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        contentHash: expectedHash,
        originalUrl: 'https://example.com/image.png',
        mimeType: 'image/png',
        data: Buffer.from(testData),
      }),
    )
  })

  it('returns existing ID for duplicate content hash', async () => {
    const { storeImage } = await import('./images')

    const testData = [0x89, 0x50, 0x4e, 0x47]

    // Existing image found
    mockFindFirst.mockResolvedValueOnce({ id: 'existing-uuid-456' })

    const result = await storeImage({
      data: testData,
      mimeType: 'image/png',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe('existing-uuid-456')
      expect(result.data.isNew).toBe(false)
    }

    // Should not attempt insert
    expect(mockValues).not.toHaveBeenCalled()
  })

  it('handles race condition with onConflictDoNothing', async () => {
    const { storeImage } = await import('./images')

    const testData = [0x89, 0x50, 0x4e, 0x47]

    // No existing image initially
    mockFindFirst.mockResolvedValueOnce(null)
    // Insert returns nothing (conflict)
    mockReturning.mockResolvedValueOnce([])
    // Second findFirst returns the existing record
    mockFindFirst.mockResolvedValueOnce({ id: 'race-winner-uuid' })

    const result = await storeImage({
      data: testData,
      mimeType: 'image/png',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe('race-winner-uuid')
      expect(result.data.isNew).toBe(false)
    }
  })

  it('returns error when insert fails and no existing record', async () => {
    const { storeImage } = await import('./images')

    const testData = [0x89, 0x50, 0x4e, 0x47]

    // No existing image
    mockFindFirst.mockResolvedValueOnce(null)
    // Insert returns nothing (conflict)
    mockReturning.mockResolvedValueOnce([])
    // No existing record found after conflict
    mockFindFirst.mockResolvedValueOnce(null)

    const result = await storeImage({
      data: testData,
      mimeType: 'image/png',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe('INSERT_FAILED')
    }
  })
})

describe('getImage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retrieves image by ID', async () => {
    const { getImage } = await import('./images')

    const mockImage = {
      id: 'test-uuid',
      contentHash: 'abc123',
      originalUrl: 'https://example.com/img.png',
      mimeType: 'image/png',
      data: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      createdAt: new Date('2024-01-01'),
    }

    mockFindFirst.mockResolvedValueOnce(mockImage)

    const result = await getImage('test-uuid')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toBeNull()
      expect(result.data?.id).toBe('test-uuid')
      expect(result.data?.contentHash).toBe('abc123')
      expect(result.data?.mimeType).toBe('image/png')
      // Data should be converted to array
      expect(result.data?.data).toEqual([0x89, 0x50, 0x4e, 0x47])
    }
  })

  it('returns null for non-existent ID', async () => {
    const { getImage } = await import('./images')

    mockFindFirst.mockResolvedValueOnce(null)

    const result = await getImage('non-existent-uuid')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBeNull()
    }
  })
})

describe('listImages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns paginated metadata without data blob', async () => {
    const { listImages } = await import('./images')

    const mockImages = [
      {
        id: 'uuid-1',
        contentHash: 'hash1',
        originalUrl: 'https://example.com/1.png',
        mimeType: 'image/png',
        createdAt: new Date('2024-01-02'),
      },
      {
        id: 'uuid-2',
        contentHash: 'hash2',
        originalUrl: null,
        mimeType: 'image/jpeg',
        createdAt: new Date('2024-01-01'),
      },
    ]

    mockFindMany.mockResolvedValueOnce(mockImages)

    const result = await listImages({ limit: 10, offset: 0 })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toHaveLength(2)
      expect(result.data[0].id).toBe('uuid-1')
      expect(result.data[1].id).toBe('uuid-2')
      // Verify data blob is not included
      expect('data' in result.data[0]).toBe(false)
    }
  })

  it('uses default limit of 20 and offset of 0', async () => {
    const { listImages } = await import('./images')

    mockFindMany.mockResolvedValueOnce([])

    await listImages({})

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 20,
        offset: 0,
      }),
    )
  })

  it('respects custom pagination parameters', async () => {
    const { listImages } = await import('./images')

    mockFindMany.mockResolvedValueOnce([])

    await listImages({ limit: 5, offset: 10 })

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 5,
        offset: 10,
      }),
    )
  })

  it('excludes data blob from select columns but includes thumbnail', async () => {
    const { listImages } = await import('./images')

    mockFindMany.mockResolvedValueOnce([])

    await listImages({})

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        columns: {
          id: true,
          contentHash: true,
          originalUrl: true,
          mimeType: true,
          createdAt: true,
          thumbnail: true,
        },
      }),
    )
  })
})

describe('getThumbnail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns existing thumbnail when available', async () => {
    const { getThumbnail } = await import('./images')

    const mockThumbnail = Buffer.from([0xff, 0xd8, 0xff]) // JPEG header
    mockFindFirst.mockResolvedValueOnce({
      id: 'test-uuid',
      thumbnail: mockThumbnail,
      data: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    })

    const result = await getThumbnail('test-uuid')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.thumbnail).toEqual([0xff, 0xd8, 0xff])
    }
    // Should not attempt to update since thumbnail already exists
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns NOT_FOUND error when image does not exist', async () => {
    const { getThumbnail } = await import('./images')

    mockFindFirst.mockResolvedValueOnce(null)

    const result = await getThumbnail('non-existent-uuid')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe('NOT_FOUND')
      expect(result.error.status).toBe(404)
    }
  })

  it('generates thumbnail on-demand when not available', async () => {
    const { getThumbnail } = await import('./images')

    // Valid 10x10 PNG generated by Jimp
    const validPng = Buffer.from([
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 10, 0, 0, 0, 10, 8, 6,
      0, 0, 0, 141, 50, 207, 189, 0, 0, 0, 36, 73, 68, 65, 84, 120, 1, 141, 193, 1, 1, 0, 0, 8, 131,
      48, 164, 127, 231, 91, 129, 237, 6, 35, 144, 72, 34, 137, 36, 146, 72, 34, 137, 36, 146, 232,
      1, 61, 156, 2, 18, 233, 86, 63, 144, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
    ])

    mockFindFirst.mockResolvedValueOnce({
      id: 'test-uuid',
      thumbnail: null,
      data: validPng,
    })

    // Mock the update to succeed
    mockWhere.mockResolvedValueOnce(undefined)

    const result = await getThumbnail('test-uuid')

    expect(result.success).toBe(true)
    if (result.success) {
      // Should return generated thumbnail (JPEG bytes)
      expect(result.data.thumbnail).not.toBeNull()
      expect(Array.isArray(result.data.thumbnail)).toBe(true)
    }
    // Should update the database with the generated thumbnail
    expect(mockUpdate).toHaveBeenCalled()
  })

  it('returns null thumbnail when generation fails', async () => {
    const { getThumbnail } = await import('./images')

    // Image exists but with invalid data that cannot be processed
    mockFindFirst.mockResolvedValueOnce({
      id: 'test-uuid',
      thumbnail: null,
      data: Buffer.from([0x00, 0x01, 0x02]), // Invalid image data
    })

    const result = await getThumbnail('test-uuid')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.thumbnail).toBeNull()
    }
  })
})

describe('getImagePreview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('generates preview with valid dimensions', async () => {
    const { getImagePreview } = await import('./images')

    // Valid 10x10 PNG generated by Jimp
    const validPng = Buffer.from([
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 10, 0, 0, 0, 10, 8, 6,
      0, 0, 0, 141, 50, 207, 189, 0, 0, 0, 36, 73, 68, 65, 84, 120, 1, 141, 193, 1, 1, 0, 0, 8, 131,
      48, 164, 127, 231, 91, 129, 237, 6, 35, 144, 72, 34, 137, 36, 146, 72, 34, 137, 36, 146, 232,
      1, 61, 156, 2, 18, 233, 86, 63, 144, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
    ])

    mockFindFirst.mockResolvedValueOnce({
      data: validPng,
    })

    const result = await getImagePreview({
      imageId: 'test-uuid',
      width: 100,
      height: 100,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.preview).toBeDefined()
      expect(Array.isArray(result.data.preview)).toBe(true)
      // Should be JPEG output (check for JPEG magic bytes)
      expect(result.data.preview[0]).toBe(0xff)
      expect(result.data.preview[1]).toBe(0xd8)
    }
  })

  it('returns NOT_FOUND error when image does not exist', async () => {
    const { getImagePreview } = await import('./images')

    mockFindFirst.mockResolvedValueOnce(null)

    const result = await getImagePreview({
      imageId: 'non-existent-uuid',
      width: 100,
      height: 100,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe('NOT_FOUND')
      expect(result.error.status).toBe(404)
    }
  })

  it('validates width must be at least 1', async () => {
    const { getImagePreview } = await import('./images')

    await expect(
      getImagePreview({
        imageId: 'test-uuid',
        width: 0,
        height: 100,
      }),
    ).rejects.toThrow('width must be between 1 and 1024')
  })

  it('validates width must not exceed 1024', async () => {
    const { getImagePreview } = await import('./images')

    await expect(
      getImagePreview({
        imageId: 'test-uuid',
        width: 1025,
        height: 100,
      }),
    ).rejects.toThrow('width must be between 1 and 1024')
  })

  it('validates height must be at least 1', async () => {
    const { getImagePreview } = await import('./images')

    await expect(
      getImagePreview({
        imageId: 'test-uuid',
        width: 100,
        height: 0,
      }),
    ).rejects.toThrow('height must be between 1 and 1024')
  })

  it('validates height must not exceed 1024', async () => {
    const { getImagePreview } = await import('./images')

    await expect(
      getImagePreview({
        imageId: 'test-uuid',
        width: 100,
        height: 1025,
      }),
    ).rejects.toThrow('height must be between 1 and 1024')
  })

  it('returns PROCESSING_ERROR when image cannot be processed', async () => {
    const { getImagePreview } = await import('./images')

    // Invalid image data that cannot be processed by Jimp
    mockFindFirst.mockResolvedValueOnce({
      data: Buffer.from([0x00, 0x01, 0x02]),
    })

    const result = await getImagePreview({
      imageId: 'test-uuid',
      width: 100,
      height: 100,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe('PROCESSING_ERROR')
      expect(result.error.status).toBe(500)
    }
  })
})
