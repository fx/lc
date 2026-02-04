import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { handleDbError } from './errors'

describe('handleDbError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('PostgreSQL error code mapping', () => {
    it('maps 23505 to UNIQUE_VIOLATION with 409 status', () => {
      const error = Object.assign(new Error('duplicate key value'), { code: '23505' })
      const result = handleDbError(error)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('UNIQUE_VIOLATION')
        expect(result.error.message).toBe('A record with this value already exists')
        expect(result.error.status).toBe(409)
      }
    })

    it('maps 23503 to FOREIGN_KEY_VIOLATION with 400 status', () => {
      const error = Object.assign(new Error('violates foreign key constraint'), { code: '23503' })
      const result = handleDbError(error)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('FOREIGN_KEY_VIOLATION')
        expect(result.error.message).toBe('Referenced record does not exist')
        expect(result.error.status).toBe(400)
      }
    })

    it('maps 23502 to NOT_NULL_VIOLATION with 400 status', () => {
      const error = Object.assign(new Error('null value in column'), { code: '23502' })
      const result = handleDbError(error)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('NOT_NULL_VIOLATION')
        expect(result.error.message).toBe('Required field is missing')
        expect(result.error.status).toBe(400)
      }
    })

    it('maps 23514 to CHECK_VIOLATION with 400 status', () => {
      const error = Object.assign(new Error('violates check constraint'), { code: '23514' })
      const result = handleDbError(error)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('CHECK_VIOLATION')
        expect(result.error.message).toBe('Value violates check constraint')
        expect(result.error.status).toBe(400)
      }
    })

    it('maps 22001 to STRING_DATA_RIGHT_TRUNCATION with 400 status', () => {
      const error = Object.assign(new Error('value too long'), { code: '22001' })
      const result = handleDbError(error)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('STRING_DATA_RIGHT_TRUNCATION')
        expect(result.error.message).toBe('Value is too long')
        expect(result.error.status).toBe(400)
      }
    })

    it('maps 22P02 to INVALID_TEXT_REPRESENTATION with 400 status', () => {
      const error = Object.assign(new Error('invalid input syntax'), { code: '22P02' })
      const result = handleDbError(error)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_TEXT_REPRESENTATION')
        expect(result.error.message).toBe('Invalid input format')
        expect(result.error.status).toBe(400)
      }
    })
  })

  describe('retryable errors', () => {
    it('returns CONNECTION_ERROR for connection_exception (08000)', () => {
      const error = Object.assign(new Error('connection exception'), { code: '08000' })
      const result = handleDbError(error)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('CONNECTION_ERROR')
        expect(result.error.message).toBe('Database connection error, please try again')
        expect(result.error.status).toBe(503)
      }
    })

    it('returns CONNECTION_ERROR for connection_failure (08006)', () => {
      const error = Object.assign(new Error('connection failure'), { code: '08006' })
      const result = handleDbError(error)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('CONNECTION_ERROR')
        expect(result.error.status).toBe(503)
      }
    })

    it('returns CONNECTION_ERROR for deadlock_detected (40P01)', () => {
      const error = Object.assign(new Error('deadlock detected'), { code: '40P01' })
      const result = handleDbError(error)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('CONNECTION_ERROR')
        expect(result.error.status).toBe(503)
      }
    })
  })

  describe('generic errors', () => {
    it('returns DATABASE_ERROR for unknown PostgreSQL error codes', () => {
      const error = Object.assign(new Error('unknown error'), { code: '99999' })
      const result = handleDbError(error)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('DATABASE_ERROR')
        expect(result.error.message).toBe('An unexpected database error occurred')
        expect(result.error.status).toBe(500)
      }
    })

    it('returns DATABASE_ERROR for non-Error objects', () => {
      const result = handleDbError('string error')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('DATABASE_ERROR')
        expect(result.error.status).toBe(500)
      }
    })

    it('returns DATABASE_ERROR for Error without code property', () => {
      const error = new Error('generic error')
      const result = handleDbError(error)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('DATABASE_ERROR')
        expect(result.error.status).toBe(500)
      }
    })
  })

  describe('context prefix in logs', () => {
    it('uses provided context in error log', () => {
      const error = Object.assign(new Error('test error'), { code: '23505' })
      handleDbError(error, 'createUser')

      expect(console.error).toHaveBeenCalledWith(
        '[createUser] PostgreSQL error 23505:',
        'test error',
      )
    })

    it('uses default [db] prefix when no context provided', () => {
      const error = new Error('generic error')
      handleDbError(error)

      expect(console.error).toHaveBeenCalledWith('[db] Unexpected error:', error)
    })
  })
})
