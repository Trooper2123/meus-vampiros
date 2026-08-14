import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined
}

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  // Do not throw here to keep serverless builds from failing during static analysis.
  // API routes that need the DB will log an error if missing.
  // throw new Error('DATABASE_URL is not set')
}

const pool = (() => {
  if (!connectionString) return undefined
  if (global.__pgPool) return global.__pgPool
  const p = new Pool({ connectionString, max: 5 })
  global.__pgPool = p
  return p
})()

export async function ensureUsersTable() {
  if (!pool) return
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      auth0_id TEXT UNIQUE NOT NULL,
      email TEXT,
      name TEXT,
      picture TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `)
}

export async function upsertUserFromAuth0(user: any) {
  if (!pool) return null
  const auth0Id = user.sub
  const email = user.email ?? null
  const name = user.name ?? null
  const picture = user.picture ?? null

  const res = await pool.query(
    `INSERT INTO users (auth0_id, email, name, picture)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (auth0_id) DO UPDATE SET
       email = EXCLUDED.email,
       name = EXCLUDED.name,
       picture = EXCLUDED.picture,
       updated_at = now()
     RETURNING *;
    `,
    [auth0Id, email, name, picture]
  )

  return res.rows[0] ?? null
}

export const db = drizzle(pool as Pool)

export { pool }
