import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { ensureAllTables } from '@/lib/db'
import { canManageCampaign } from '@/lib/auth/authorization'
import { getCharacterAccessRecord } from '@/lib/characters'
import { grantCharacterXp } from '@/lib/character-xp'
import { CharacterCommandError } from '@/lib/character-commands'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionOrDev()
    if (!session?.user?.sub) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    const { id } = await context.params
    const body = await request.json().catch(() => null)
    if (!UUID_PATTERN.test(id) || !body || !Array.isArray(body.characterIds) || !body.characterIds.length || body.characterIds.length > 100 || body.characterIds.some((characterId: unknown) => typeof characterId !== 'string' || !UUID_PATTERN.test(characterId)) || new Set(body.characterIds).size !== body.characterIds.length || !Number.isSafeInteger(body.amount) || body.amount <= 0 || body.amount > 10000 || typeof body.reason !== 'string' || !body.reason.trim() || body.reason.length > 500 || typeof body.idempotencyKey !== 'string' || !UUID_PATTERN.test(body.idempotencyKey)) return NextResponse.json({ error: 'Concessão inválida.' }, { status: 400 })
    await ensureAllTables()
    if (!(await canManageCampaign(session.user.sub, id))) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
    for (const characterId of body.characterIds as string[]) {
      const character = await getCharacterAccessRecord(characterId)
      if (!character || character.campaignId !== id) return NextResponse.json({ error: 'A seleção contém ficha não autorizada.' }, { status: 403 })
    }
    const results: Record<string, unknown>[] = []
    for (const characterId of body.characterIds as string[]) {
      try { results.push({ characterId, ...await grantCharacterXp(session.user.sub, characterId, body.amount, body.reason, body.idempotencyKey, id) }) }
      catch (error) { results.push({ characterId, ok: false, status: error instanceof CharacterCommandError ? error.status : 500, error: error instanceof CharacterCommandError ? error.message : 'Não foi possível conceder XP.' }) }
    }
    const complete = results.every(result => result.ok === true)
    return NextResponse.json({ complete, results }, { status: complete ? 200 : 207 })
  } catch {
    return NextResponse.json({ error: 'Não foi possível conceder XP.' }, { status: 500 })
  }
}
