import { err, type Result } from '@/lib/types'
import { isRetryableError } from './index'

// PostgreSQL error code to HTTP status code mapping
const PG_ERROR_MAP: Record<string, { code: string; message: string; status: number }> = {
  '23505': {
    code: 'UNIQUE_VIOLATION',
    message: 'A record with this value already exists',
    status: 409,
  },
  '23503': {
    code: 'FOREIGN_KEY_VIOLATION',
    message: 'Referenced record does not exist',
    status: 400,
  },
  '23502': { code: 'NOT_NULL_VIOLATION', message: 'Required field is missing', status: 400 },
  '23514': { code: 'CHECK_VIOLATION', message: 'Value violates check constraint', status: 400 },
  '22001': { code: 'STRING_DATA_RIGHT_TRUNCATION', message: 'Value is too long', status: 400 },
  '22P02': { code: 'INVALID_TEXT_REPRESENTATION', message: 'Invalid input format', status: 400 },
}

export function handleDbError<T>(error: unknown, context?: string): Result<T> {
  const prefix = context ? `[${context}]` : '[db]'

  if (error instanceof Error && 'code' in error) {
    const pgCode = (error as Error & { code: string }).code

    // Check if it's a mapped PostgreSQL error
    const mapped = PG_ERROR_MAP[pgCode]
    if (mapped) {
      console.error(`${prefix} PostgreSQL error ${pgCode}:`, error.message)
      return err(mapped.code, mapped.message, mapped.status)
    }

    // Check if it's a retryable error that exhausted retries
    if (isRetryableError(error)) {
      console.error(`${prefix} Connection error after retries:`, error.message)
      return err('CONNECTION_ERROR', 'Database connection error, please try again', 503)
    }
  }

  // Generic database error
  console.error(`${prefix} Unexpected error:`, error)
  return err('DATABASE_ERROR', 'An unexpected database error occurred', 500)
}

export { isRetryableError }
