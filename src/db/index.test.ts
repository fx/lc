import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isRetryableError, withRetry } from './index'

describe('isRetryableError', () => {
  it('returns true for connection_exception (08000)', () => {
    const error = Object.assign(new Error('connection exception'), { code: '08000' })
    expect(isRetryableError(error)).toBe(true)
  })

  it('returns true for connection_does_not_exist (08003)', () => {
    const error = Object.assign(new Error('connection does not exist'), { code: '08003' })
    expect(isRetryableError(error)).toBe(true)
  })

  it('returns true for connection_failure (08006)', () => {
    const error = Object.assign(new Error('connection failure'), { code: '08006' })
    expect(isRetryableError(error)).toBe(true)
  })

  it('returns true for sqlclient_unable_to_establish_sqlconnection (08001)', () => {
    const error = Object.assign(new Error('unable to connect'), { code: '08001' })
    expect(isRetryableError(error)).toBe(true)
  })

  it('returns true for sqlserver_rejected_establishment_of_sqlconnection (08004)', () => {
    const error = Object.assign(new Error('connection rejected'), { code: '08004' })
    expect(isRetryableError(error)).toBe(true)
  })

  it('returns true for admin_shutdown (57P01)', () => {
    const error = Object.assign(new Error('admin shutdown'), { code: '57P01' })
    expect(isRetryableError(error)).toBe(true)
  })

  it('returns true for crash_shutdown (57P02)', () => {
    const error = Object.assign(new Error('crash shutdown'), { code: '57P02' })
    expect(isRetryableError(error)).toBe(true)
  })

  it('returns true for cannot_connect_now (57P03)', () => {
    const error = Object.assign(new Error('cannot connect now'), { code: '57P03' })
    expect(isRetryableError(error)).toBe(true)
  })

  it('returns true for serialization_failure (40001)', () => {
    const error = Object.assign(new Error('serialization failure'), { code: '40001' })
    expect(isRetryableError(error)).toBe(true)
  })

  it('returns true for deadlock_detected (40P01)', () => {
    const error = Object.assign(new Error('deadlock detected'), { code: '40P01' })
    expect(isRetryableError(error)).toBe(true)
  })

  it('returns false for unique_violation (23505)', () => {
    const error = Object.assign(new Error('duplicate key'), { code: '23505' })
    expect(isRetryableError(error)).toBe(false)
  })

  it('returns false for foreign_key_violation (23503)', () => {
    const error = Object.assign(new Error('foreign key violation'), { code: '23503' })
    expect(isRetryableError(error)).toBe(false)
  })

  it('returns false for unknown error codes', () => {
    const error = Object.assign(new Error('unknown'), { code: '99999' })
    expect(isRetryableError(error)).toBe(false)
  })

  it('returns false for non-Error objects', () => {
    expect(isRetryableError('string error')).toBe(false)
    expect(isRetryableError(null)).toBe(false)
    expect(isRetryableError(undefined)).toBe(false)
    expect(isRetryableError(42)).toBe(false)
  })

  it('returns false for Error without code property', () => {
    const error = new Error('no code')
    expect(isRetryableError(error)).toBe(false)
  })
})

describe('withRetry', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns result on first successful attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success')

    const result = await withRetry(fn)

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries on retryable error and succeeds', async () => {
    const retryableError = Object.assign(new Error('connection failure'), { code: '08006' })
    const fn = vi.fn().mockRejectedValueOnce(retryableError).mockResolvedValue('success')

    // Use minimal delay for fast tests
    const result = await withRetry(fn, 3, 1)

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('throws immediately on non-retryable error', async () => {
    const nonRetryableError = Object.assign(new Error('duplicate key'), { code: '23505' })
    const fn = vi.fn().mockRejectedValue(nonRetryableError)

    await expect(withRetry(fn)).rejects.toThrow('duplicate key')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('throws after exhausting all retry attempts', async () => {
    const retryableError = Object.assign(new Error('connection failure'), { code: '08006' })
    const fn = vi.fn().mockRejectedValue(retryableError)

    await expect(withRetry(fn, 3, 1)).rejects.toThrow('connection failure')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('uses exponential backoff for retry delays', async () => {
    const delays: number[] = []
    const originalSetTimeout = globalThis.setTimeout
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((callback, delay) => {
      delays.push(delay as number)
      // Execute callback immediately for test speed
      return originalSetTimeout(callback, 0)
    })

    const retryableError = Object.assign(new Error('connection failure'), { code: '08006' })
    const fn = vi.fn().mockRejectedValue(retryableError)

    await expect(withRetry(fn, 4, 100)).rejects.toThrow('connection failure')
    expect(fn).toHaveBeenCalledTimes(4)

    // Verify exponential backoff: 100, 200, 400
    expect(delays).toEqual([100, 200, 400])
  })

  it('converts non-Error exceptions to Error', async () => {
    const fn = vi.fn().mockRejectedValue('string error')

    await expect(withRetry(fn)).rejects.toThrow('string error')
  })

  it('logs warning messages on retryable errors', async () => {
    const retryableError = Object.assign(new Error('connection failure'), { code: '08006' })
    const fn = vi.fn().mockRejectedValueOnce(retryableError).mockResolvedValue('success')

    await withRetry(fn, 3, 1)

    expect(console.warn).toHaveBeenCalledWith(
      '[db] Retryable error (attempt 1/3), retrying in 1ms:',
      'connection failure',
    )
  })

  it('respects custom maxAttempts parameter', async () => {
    const retryableError = Object.assign(new Error('connection failure'), { code: '08006' })
    const fn = vi.fn().mockRejectedValue(retryableError)

    await expect(withRetry(fn, 2, 1)).rejects.toThrow('connection failure')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('respects custom baseDelayMs parameter', async () => {
    const delays: number[] = []
    const originalSetTimeout = globalThis.setTimeout
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((callback, delay) => {
      delays.push(delay as number)
      return originalSetTimeout(callback, 0)
    })

    const retryableError = Object.assign(new Error('connection failure'), { code: '08006' })
    const fn = vi.fn().mockRejectedValueOnce(retryableError).mockResolvedValue('success')

    await withRetry(fn, 3, 50)

    // First retry uses baseDelay (50ms)
    expect(delays[0]).toBe(50)
    expect(fn).toHaveBeenCalledTimes(2)
  })
})
