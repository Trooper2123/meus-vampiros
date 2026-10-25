import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { ensureAllTables } from '@/lib/db'
import { CharacterCommandError, getCommandCharacter } from '@/lib/character-commands'
import { changeCharacterResources } from '@/lib/character-resources'
import { readSessionState } from '@/lib/vtm-v5/session-state'
import { calculateSecondaryAttributes } from '@/lib/vtm-v5/secondary-attributes'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionOrDev()
    if (!session?.user?.sub) { return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 }) }
    const { id } = await context.params
    if (!UUID_PATTERN.test(id)) { return NextResponse.json({ error: 'Ficha inválida.' }, { status: 400 }) }
    await ensureAllTables()
    const character = await getCommandCharacter(id)
    if (!character) { return NextResponse.json({ error: 'Ficha não encontrada.' }, { status: 404 }) }
    if (character.ownerId !== session.user.sub && character.masterId !== session.user.sub) { return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 }) }
    const state = readSessionState(character.data, character.gameState)
    const isMaster = character.masterId === session.user.sub
    const publicState = { ...state }
    if (!isMaster) { delete publicState.torpor }
    return NextResponse.json({ state: publicState, maxima: calculateSecondaryAttributes(character.data), revision: character.revision, canEditNarrative: isMaster || character.ownerId === session.user.sub })
  } catch { return NextResponse.json({ error: 'Não foi possível carregar os recursos.' }, { status: 500 }) }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionOrDev()
    if (!session?.user?.sub) { return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 }) }
    const { id } = await context.params
    const body = await request.json().catch(() => null)
    if (!UUID_PATTERN.test(id) || !body || !body.changes || typeof body.changes !== 'object' || Array.isArray(body.changes) || typeof body.reason !== 'string' || !Number.isSafeInteger(body.expectedRevision) || typeof body.idempotencyKey !== 'string' || !UUID_PATTERN.test(body.idempotencyKey) || (body.sessionId !== undefined && (typeof body.sessionId !== 'string' || !UUID_PATTERN.test(body.sessionId))) || Object.keys(body).some(key => !['changes', 'reason', 'expectedRevision', 'idempotencyKey', 'sessionId'].includes(key))) { return NextResponse.json({ error: 'Alteração inválida.' }, { status: 400 }) }
    await ensureAllTables()
    if (body.sessionId) { await (await import('@/lib/game-sessions')).assertGameSessionCharacter(session.user.sub, body.sessionId, id) }
    const result = await changeCharacterResources(session.user.sub, id, body.changes, body.reason, body.expectedRevision, body.idempotencyKey)
    const character = await getCommandCharacter(id)
    if (character?.masterId !== session.user.sub && result.state) {
      const state = { ...result.state as Record<string, unknown> }
      delete state.torpor
      result.state = state
    }
    return NextResponse.json(result)
  } catch (error) { return NextResponse.json({ error: error instanceof CharacterCommandError ? error.message : 'Não foi possível alterar os recursos.' }, { status: error instanceof CharacterCommandError ? error.status : 500 }) }
}
