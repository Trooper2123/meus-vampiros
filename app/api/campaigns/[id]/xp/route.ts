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
    if (!UUID_PATTERN.test(id) || !body || !Array.isArray(body.characterIds) || !body.characterIds.length || body.characterIds.length > 100 || body.characterIds.some((characterId: unknown) => typeof characterId !== 'string' || !UUID_PATTERN.test(characterId)) || new Set(body.characterIds).size !== body.characterIds.length || !Number.isSafeInteger(body.amount) || body.amount <= 0 || body.amount > 10000 || typeof body.reason !== 'string' || !body.reason.trim() || body.reason.length > 500 || typeof body.idempotencyKey !== 'string' || !UUID_PATTERN.test(body.idempotencyKey) || (body.sessionId !== undefined && (typeof body.sessionId !== 'string' || !UUID_PATTERN.test(body.sessionId))) || Object.keys(body).some(key => !['characterIds', 'amount', 'reason', 'idempotencyKey', 'sessionId'].includes(key))) return NextResponse.json({ error: 'Concessão inválida.' }, { status: 400 })
    await ensureAllTables()
    if (!(await canManageCampaign(session.user.sub, id))) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
    if (body.sessionId) await (await import('@/lib/game-sessions')).assertGameSessionManager(session.user.sub, body.sessionId, id)
    for (const characterId of body.characterIds as string[]) {
      const character = await getCharacterAccessRecord(characterId)
      if (character?.campaignId !== id) return NextResponse.json({ error: 'A seleção contém ficha não autorizada.' }, { status: 403 })
    }
    const results: Record<string, unknown>[] = []
    for (const characterId of body.characterIds as string[]) results.push(await grantCampaignCharacterXp(session.user.sub, id, characterId, body))
    const complete = results.every(result => result.ok === true)
    return NextResponse.json({ complete, results }, { status: complete ? 200 : 207 })
  } catch {
    return NextResponse.json({ error: 'Não foi possível conceder XP.' }, { status: 500 })
  }
}

async function grantCampaignCharacterXp(actorId: string, campaignId: string, characterId: string, input: { amount: number; reason: string; idempotencyKey: string }) {
  const character = await getCharacterAccessRecord(characterId)
  if (character?.campaignId !== campaignId) return { characterId, ok: false, status: 403, error: 'Ficha fora desta mesa.' }
  try { return { characterId, ok: true, ...await grantCharacterXp(actorId, characterId, input.amount, input.reason, input.idempotencyKey, campaignId) } }
  catch (error) { return { characterId, ok: false, status: error instanceof CharacterCommandError ? error.status : 500, error: error instanceof CharacterCommandError ? error.message : 'Não foi possível conceder XP.' } }
}
