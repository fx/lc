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
})

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err)
})

export const db = drizzle(pool, { schema })
