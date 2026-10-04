import { drizzle } from 'drizzle-orm/neon-serverless'
import { Pool } from '@neondatabase/serverless'

declare global {
  // eslint-disable-next-line no-var
  var __neonPool: Pool | undefined
}

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  // Do not throw here to keep serverless builds from failing during static analysis.
  // API routes that need the DB will log an error if missing.
  // throw new Error('DATABASE_URL is not set')
}

const pool = (() => {
  if (!connectionString) return undefined
  if (global.__neonPool) return global.__neonPool
  const p = new Pool({ connectionString })
  global.__neonPool = p
  return p
})()

export async function ensureUsersTable() {
  if (!pool) return
  await ensureAllTables()
}

export async function ensurePossessionsTable() {
  if (!pool) return
  await ensureAllTables()
}

export async function ensureAllTables() {
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

    CREATE TABLE IF NOT EXISTS campaigns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      master_user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      theme TEXT,
      principios TEXT,
      status TEXT NOT NULL DEFAULT 'Ativa',
      average_xp INT DEFAULT 0,
      last_session_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS principios TEXT;
    ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS session_start_time TIME;
    ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS session_end_time TIME;

    CREATE TABLE IF NOT EXISTS characters (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      campaign_id UUID REFERENCES campaigns(id),
      name TEXT NOT NULL,
      concept TEXT,
      clan TEXT,
      generation TEXT,
      status TEXT NOT NULL DEFAULT 'Ativo',
      spent_xp INT DEFAULT 0,
      total_xp INT DEFAULT 0,
      data JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    ALTER TABLE characters ADD COLUMN IF NOT EXISTS spent_xp INT DEFAULT 0;
    ALTER TABLE characters ADD COLUMN IF NOT EXISTS total_xp INT DEFAULT 0;

  CREATE TABLE IF NOT EXISTS character_possessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id),
  label TEXT NOT NULL,
  description TEXT,
  origin TEXT NOT NULL DEFAULT 'player',
  status TEXT NOT NULL DEFAULT 'pendente',
  master_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS campaign_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('disponível', 'talvez', 'indisponível')),
    suggested BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (campaign_id, user_id, date)
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

// When DATABASE_URL is absent (local dev without a real DB), `pool` is undefined.
// The dev-db layer intercepts calls before they reach `db`, so this cast is safe.
export const db = pool ? drizzle(pool) : (null as unknown as ReturnType<typeof drizzle>)

export { pool }
