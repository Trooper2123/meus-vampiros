import { NextResponse } from 'next/server'
import { notesActor, notesBody, notesResponse } from '@/lib/notes-http'
import { getSessionOrDev } from '@/lib/auth0'
import { ensureAllTables } from '@/lib/db'
import { CharacterCommandError, getCommandCharacter } from '@/lib/character-commands'
import { executeCharacterRoll } from '@/lib/character-rolls'
import { normalizeCharacterRulesInput } from '@/lib/vtm-v5/normalize'
import { normalizeSpecialtySkillId } from '@/lib/vtm-v5/specialties'
import { ROLL_MODES, visibleCharacterRolls, type RollMode } from '@/lib/character-roll-history'
import { characterSpecialties } from '@/lib/character-specialties'
import { characterClan } from '@/lib/vtm-v5/clans'
import { readClanConditions, validClanRollContext } from '@/lib/vtm-v5/clan-mechanics'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const attributes = new Set(['forca', 'destreza', 'vigor', 'carisma', 'manipulacao', 'compostura', 'inteligencia', 'raciocinio', 'determinacao'])

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionOrDev()
    if (!session?.user?.sub) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    const { id } = await context.params
    if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: 'Ficha inválida.' }, { status: 400 })
    await ensureAllTables()
    const character = await getCommandCharacter(id)
    if (!character) return NextResponse.json({ error: 'Ficha não encontrada.' }, { status: 404 })
    if (character.ownerId !== session.user.sub && character.masterId !== session.user.sub) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
    const normalized = normalizeCharacterRulesInput(character.data)
    return notesResponse({ history: visibleCharacterRolls(character, session.user.sub), canAdjudicate: character.masterId === session.user.sub, canAcceptCost: character.ownerId === session.user.sub, attributes: normalized.attributes, skills: Object.fromEntries(Object.entries(normalized.skills).map(([skill, dots]) => [normalizeSpecialtySkillId(skill), dots])), specialties: characterSpecialties(character).filter(specialty => specialty.status === 'APPROVED'), canUseSpecialties: character.masterId === session.user.sub || (!character.campaignId && character.ownerId === session.user.sub), canRollSecret: character.masterId === session.user.sub, clanCode: characterClan(character.data)?.code, clanConditions: readClanConditions(character), revision: character.revision, status: character.status })
  } catch { return NextResponse.json({ error: 'Não foi possível carregar opções de rolagem.' }, { status: 500 }) }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actorId = await notesActor(request, true)
    const { id } = await context.params
    const body = await notesBody(request)
    if (!UUID_PATTERN.test(id) || typeof body.attribute !== 'string' || !attributes.has(body.attribute) || typeof body.skillId !== 'string' || body.skillId.length > 100 || typeof body.difficulty !== 'number' || !Number.isSafeInteger(body.difficulty) || body.difficulty < 1 || body.difficulty > 50 || !['PUBLIC', 'SECRET'].some(value => value === body.visibility) || typeof body.reason !== 'string' || !body.reason.trim() || body.reason.length > 500 || typeof body.expectedRevision !== 'number' || !Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 0 || typeof body.idempotencyKey !== 'string' || !UUID_PATTERN.test(body.idempotencyKey) || (body.specialtyId !== undefined && (typeof body.specialtyId !== 'string' || body.specialtyId.length > 250)) || ['result', 'roll', 'pool', 'modifiers', 'specialtyBonus'].some(field => body[field] !== undefined)) return NextResponse.json({ error: 'Intenção de rolagem inválida.' }, { status: 400 })
    if ((body.mode !== undefined && !ROLL_MODES.some(mode => mode === body.mode)) || (body.hiddenDifficulty !== undefined && typeof body.hiddenDifficulty !== 'boolean') || (body.clanContext !== undefined && !validClanRollContext(body.clanContext)) || (body.sessionId !== undefined && (typeof body.sessionId !== 'string' || !UUID_PATTERN.test(body.sessionId))) || Object.keys(body).some(key => !['mode', 'hiddenDifficulty', 'clanContext', 'attribute', 'skillId', 'difficulty', 'specialtyId', 'visibility', 'reason', 'expectedRevision', 'idempotencyKey', 'sessionId'].includes(key))) return NextResponse.json({ error: 'Intenção de rolagem inválida.' }, { status: 400 })
    await ensureAllTables()
    if (body.sessionId) await (await import('@/lib/game-sessions')).assertGameSessionCharacter(actorId, body.sessionId, id)
    return NextResponse.json(await executeCharacterRoll(actorId, id, { ...(body.mode ? { mode: body.mode as RollMode } : {}), ...(body.hiddenDifficulty !== undefined ? { hiddenDifficulty: body.hiddenDifficulty as boolean } : {}), ...(body.clanContext !== undefined && validClanRollContext(body.clanContext) ? { clanContext: body.clanContext } : {}), attribute: body.attribute, skillId: body.skillId, difficulty: body.difficulty, specialtyId: body.specialtyId as string | undefined, visibility: body.visibility as 'PUBLIC' | 'SECRET', reason: body.reason.trim(), expectedRevision: body.expectedRevision, idempotencyKey: body.idempotencyKey }))
  } catch (error) { return NextResponse.json({ error: error instanceof CharacterCommandError ? error.message : 'Não foi possível rolar os dados.' }, { status: error instanceof CharacterCommandError ? error.status : 500 }) }
}
