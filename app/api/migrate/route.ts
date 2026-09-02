import { NextResponse } from 'next/server'
import { ensureAllTables } from '@/lib/db'

const MIGRATE_SECRET = process.env.MIGRATE_SECRET

/**
 * POST /api/migrate
 * Executes all CREATE TABLE IF NOT EXISTS / ALTER TABLE migrations.
 * Protected by a static secret token (MIGRATE_SECRET env var).
 * This route is intentionally NOT tied to user sessions — it is
 * meant for admin/CI use only and must NEVER be exposed in the UI.
 *
 * Usage:
 *   curl -X POST https://your-app.vercel.app/api/migrate \
 *        -H "Authorization: Bearer <MIGRATE_SECRET>"
 */
export async function POST(request: Request) {
  if (!MIGRATE_SECRET) {
    // If env var is not configured, block the route entirely.
    return NextResponse.json({ error: 'Rota desabilitada.' }, { status: 403 })
  }

  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

  if (token !== MIGRATE_SECRET) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  try {
    await ensureAllTables()
    return NextResponse.json({ ok: true, message: 'Migração executada com sucesso.' })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Falha na migração.', details: message }, { status: 500 })
  }
}

