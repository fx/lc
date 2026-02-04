import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

// NOTE: This fallback connection string is for local development only.
// Production deployments MUST set DATABASE_URL with secure credentials.
const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/lc'

const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  maxUses: 7500,
})

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err)
})

export const db = drizzle(pool, { schema })

// PostgreSQL error codes that are safe to retry
const RETRYABLE_ERRORS = [
  '08000', // connection_exception
  '08003', // connection_does_not_exist
  '08006', // connection_failure
  '08001', // sqlclient_unable_to_establish_sqlconnection
  '08004', // sqlserver_rejected_establishment_of_sqlconnection
  '57P01', // admin_shutdown
  '57P02', // crash_shutdown
  '57P03', // cannot_connect_now
  '40001', // serialization_failure
  '40P01', // deadlock_detected
] as const

export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error && 'code' in error) {
    const code = (error as Error & { code: string }).code
    return RETRYABLE_ERRORS.includes(code as (typeof RETRYABLE_ERRORS)[number])
  }
  return false
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 100,
): Promise<T> {
  let lastError: Error | undefined

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (!isRetryableError(error) || attempt === maxAttempts) {
        throw lastError
      }

      const delayMs = baseDelayMs * 2 ** (attempt - 1)
      console.warn(
        `[db] Retryable error (attempt ${attempt}/${maxAttempts}), retrying in ${delayMs}ms:`,
        lastError.message,
      )
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  throw lastError
}
