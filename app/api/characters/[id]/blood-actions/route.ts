import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { ensureAllTables } from '@/lib/db'
import { CharacterCommandError } from '@/lib/character-commands'
import { performCharacterBloodAction } from '@/lib/character-blood-actions'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const headers = { 'Cache-Control': 'private, no-store' }
  try {
    const session = await getSessionOrDev()
    if (!session?.user?.sub) throw new CharacterCommandError(401, 'Não autorizado.')
    const { id } = await context.params
    if (!uuid.test(id)) throw new CharacterCommandError(400, 'Ficha inválida.')
    const origin = request.headers.get('origin')
    if (origin && origin !== new URL(request.url).origin) throw new CharacterCommandError(403, 'Origem inválida.')
    const raw = await request.text()
    if (raw.length > 8192) throw new CharacterCommandError(413, 'Ação excessiva.')
    let body: unknown
    try { body = JSON.parse(raw) } catch { throw new CharacterCommandError(400, 'JSON inválido.') }
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new CharacterCommandError(400, 'Ação inválida.')
    const data = body as Record<string, unknown>
    if (Object.keys(data).some(k => !['action','expectedRevision','idempotencyKey'].includes(k)) ||
      !Number.isSafeInteger(data.expectedRevision) || typeof data.idempotencyKey !== 'string' || !uuid.test(data.idempotencyKey))
      throw new CharacterCommandError(400, 'Comando inválido.')
    await ensureAllTables()
    return NextResponse.json(await performCharacterBloodAction(session.user.sub, id, data.action, data.expectedRevision as number, data.idempotencyKey as string), { headers })
  } catch (error) {
    return NextResponse.json({ error: error instanceof CharacterCommandError ? error.message : 'Não foi possível executar a ação.' },
      { status: error instanceof CharacterCommandError ? error.status : 500, headers })
  }
}
