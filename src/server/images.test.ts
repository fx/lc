import { createHash } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the database module
const mockFindFirst = vi.fn()
const mockFindMany = vi.fn()
const mockValues = vi.fn()
const mockOnConflictDoNothing = vi.fn()
const mockReturning = vi.fn()

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
    inputValidator: () => ({
      handler: (fn: (ctx: { data: unknown }) => Promise<unknown>) => {
        // Return a function that calls the handler with properly wrapped data
        return (input: unknown) => fn({ data: input })
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
