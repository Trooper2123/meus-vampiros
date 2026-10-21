import { ensureAllTables, pool } from '../lib/db'
import { Pool } from 'pg'

export default async function setup() {
  const testDatabaseUrl = process.env.DATABASE_URL
  const parsedUrl = testDatabaseUrl ? new URL(testDatabaseUrl) : null
  const localHost = parsedUrl && ['localhost', '127.0.0.1', '[::1]'].includes(parsedUrl.hostname)
  const isolated = parsedUrl && localHost && parsedUrl.searchParams.get('options')?.includes('search_path=meus_vampiros_test')
  if (!isolated) return
  if (process.env.NODE_ENV === 'production') throw new Error('Os testes não podem executar em produção.')
  const schemaPool = new Pool({ connectionString: testDatabaseUrl })
  try {
    await schemaPool.query('CREATE SCHEMA IF NOT EXISTS meus_vampiros_test')
    await ensureAllTables()
  } finally {
    await schemaPool.end()
    await pool?.end()
  }
}
