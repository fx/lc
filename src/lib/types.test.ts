import { describe, expect, it } from 'vitest'
import { err, ok, type Result } from './types'

describe('ok', () => {
  it('creates a success result with data', () => {
    const result = ok('hello')
    expect(result).toEqual({ success: true, data: 'hello' })
  })

  it('preserves complex data types', () => {
    const data = { id: 1, name: 'test', nested: { value: 42 } }
    const result = ok(data)
    expect(result).toEqual({ success: true, data })
  })

  it('handles null and undefined data', () => {
    expect(ok(null)).toEqual({ success: true, data: null })
    expect(ok(undefined)).toEqual({ success: true, data: undefined })
  })

  it('handles array data', () => {
    const data = [1, 2, 3]
    const result = ok(data)
    expect(result).toEqual({ success: true, data: [1, 2, 3] })
  })

  it('result has success true for type narrowing', () => {
    const result: Result<string> = ok('test')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe('test')
    }
  })
})

describe('err', () => {
  it('creates an error result with code, message, and status', () => {
    const result = err('NOT_FOUND', 'Resource not found', 404)
    expect(result).toEqual({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Resource not found', status: 404 },
    })
  })

  it('handles various HTTP status codes', () => {
    expect(err('BAD_REQUEST', 'Invalid input', 400).error.status).toBe(400)
    expect(err('UNAUTHORIZED', 'Not authenticated', 401).error.status).toBe(401)
    expect(err('FORBIDDEN', 'Access denied', 403).error.status).toBe(403)
    expect(err('CONFLICT', 'Duplicate entry', 409).error.status).toBe(409)
    expect(err('SERVER_ERROR', 'Internal error', 500).error.status).toBe(500)
    expect(err('SERVICE_UNAVAILABLE', 'Try again later', 503).error.status).toBe(503)
  })

  it('result has success false for type narrowing', () => {
    const result: Result<string> = err('ERROR', 'Something went wrong', 500)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe('ERROR')
      expect(result.error.message).toBe('Something went wrong')
      expect(result.error.status).toBe(500)
    }
  })
})

describe('Result type', () => {
  it('can be used with type narrowing', () => {
    function processResult(result: Result<number>): string {
      if (result.success) {
        return `Value: ${result.data}`
      }
      return `Error: ${result.error.code}`
    }

    expect(processResult(ok(42))).toBe('Value: 42')
    expect(processResult(err('FAILED', 'Operation failed', 500))).toBe('Error: FAILED')
  })
})
