import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { getCharacterById, createCharacter, updateCharacter, getCharactersForCampaign, normalizeDisciplines } from '@/lib/characters'
import { getCampaignById, hasMasterAccess } from '@/lib/campaigns'
import { ensureAllTables } from '@/lib/db'
import { canManageCampaign } from '@/lib/auth/authorization'
import { isUserInCampaign } from '@/lib/availability'
import { canCreateCharacterType, CHARACTER_TYPES, CREATION_TYPES, type CharacterType, type CreationType } from '@/lib/vtm-v5/types'
import { grantCharacterXp } from '@/lib/character-xp'
import { CharacterCommandError } from '@/lib/character-commands'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PROTECTED_FIELDS = ['masterOverride', 'predatorDisciplineBonus', 'predatorEffectsVersion', 'clanCode', 'clanSelection', 'clanRulesVersion', 'creationAdvantageDots', 'creationFlawDots', 'predatorTypeCode', 'predador', 'predatorTypeOverrides', 'predatorTypeOverride', 'predatorTypeSelection', 'predatorTypeRelationshipRequirements', 'predatorTypeBaseHumanity', 'predatorTypeBaseBloodPotency']

class InvalidPayload extends Error {}

async function readPayload(request: Request) {
  const body = await request.json().catch(() => { throw new InvalidPayload() })
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new InvalidPayload()
  if (body.id !== undefined && body.id !== null && (typeof body.id !== 'string' || !UUID_PATTERN.test(body.id))) throw new InvalidPayload()
  if (body.campaignId !== undefined && body.campaignId !== null && (typeof body.campaignId !== 'string' || !UUID_PATTERN.test(body.campaignId))) throw new InvalidPayload()
  if (body.name !== undefined && (typeof body.name !== 'string' || body.name.length > 200)) throw new InvalidPayload()
  if (body.data !== undefined && (!body.data || typeof body.data !== 'object' || Array.isArray(body.data) || JSON.stringify(body.data).length > 100000)) throw new InvalidPayload()
  const rawData = body.data as Record<string, unknown> | undefined
  if (rawData?.characterType !== undefined && !CHARACTER_TYPES.includes(rawData.characterType as CharacterType)) throw new InvalidPayload()
  if (rawData?.creationType !== undefined && !CREATION_TYPES.includes(rawData.creationType as CreationType)) throw new InvalidPayload()
  return {
    id: typeof body.id === 'string' ? body.id : null,
    name: body.name === undefined ? undefined : body.name.trim() || 'Personagem sem nome',
    data: rawData,
    campaignId: body.campaignId as string | null | undefined,
    expectedRevision: body.expectedRevision,
  }
}

function safeCharacterData(data: Record<string, unknown> | undefined, previous: Record<string, unknown> = {}) {
  if (!data) return undefined
  const result: Record<string, unknown> = { ...data }
  for (const field of ['experiencia-total', 'experiencia-gasta', 'totalXp', 'spentXp']) delete result[field]
  for (const field of PROTECTED_FIELDS) {
    delete result[field]
    if (previous[field] !== undefined) result[field] = previous[field]
  }
  result.masterOverride = previous.masterOverride === true
  return result
}

function errorResponse(error: unknown, message: string) {
  if (error instanceof CharacterCommandError) return NextResponse.json({ error: error.message }, { status: error.status })
  return NextResponse.json({ error: error instanceof InvalidPayload ? 'Dados da ficha inválidos.' : message }, { status: error instanceof InvalidPayload ? 400 : 500 })
}

export async function GET(request: Request) {
  try {
    const session = await getSessionOrDev()
    if (!session?.user?.sub) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    await ensureAllTables()
    const searchParams = new URL(request.url).searchParams
    const campaignId = searchParams.get('campaignId')
    if (campaignId) {
      if (!UUID_PATTERN.test(campaignId)) return NextResponse.json({ error: 'Mesa inválida.' }, { status: 400 })
      if (!(await canManageCampaign(session.user.sub, campaignId))) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
      return NextResponse.json({ characters: await getCharactersForCampaign(campaignId) })
    }
    const id = searchParams.get('id')
    if (!id || !UUID_PATTERN.test(id)) return NextResponse.json({ error: 'Ficha inválida.' }, { status: 400 })
    const character = await getCharacterById(id, session.user.sub)
    if (!character) return NextResponse.json({ error: 'Ficha não encontrada.' }, { status: 404 })
    const campaign = character.campaignId && !character.campaign ? await getCampaignById(character.campaignId) : character.campaign ?? null
    const publicData = { ...normalizeDisciplines(character.data as Record<string, unknown>) }
    for (const field of ['masterOverride', 'predatorTypeOverrides', 'predatorTypeOverride', 'predatorTypeRelationshipRequirements', 'masterNotes', 'narratorNotes']) delete publicData[field]
    return NextResponse.json({ character: { id: character.id, name: character.name, status: character.status, characterType: character.characterType, revision: character.revision, data: publicData, campaignId: character.campaignId }, campaign })
  } catch (error) {
    return errorResponse(error, 'Não foi possível carregar a ficha.')
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionOrDev()
    if (!session?.user?.sub) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    const { name, data, campaignId } = await readPayload(request)
    if (data?.characterType && !canCreateCharacterType(data.characterType as CharacterType, await hasMasterAccess(session.user))) return NextResponse.json({ error: 'Este tipo de ficha é exclusivo do Mestre.' }, { status: 403 })
    await ensureAllTables()
    if (campaignId && !(await isUserInCampaign(campaignId, session.user.sub))) return NextResponse.json({ error: 'Você não pertence a esta mesa.' }, { status: 403 })
    if (campaignId && !(await getCampaignById(campaignId))) return NextResponse.json({ error: 'Mesa não encontrada.' }, { status: 400 })
    const result = await createCharacter(session.user.sub, { name: name ?? 'Personagem sem nome', data: safeCharacterData(data), campaignId: campaignId ?? null })
    return NextResponse.json({ id: result.id }, { status: 201 })
  } catch (error) {
    return errorResponse(error, 'Não foi possível salvar a ficha.')
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSessionOrDev()
    if (!session?.user?.sub) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    const { id, name, data, campaignId, expectedRevision } = await readPayload(request)
    if (!id) return NextResponse.json({ error: 'Ficha inválida.' }, { status: 400 })
    await ensureAllTables()
    const original = await getCharacterById(id, session.user.sub)
    if (!original) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
    if (campaignId !== undefined && campaignId !== original.campaignId) return NextResponse.json({ error: 'A alteração do vínculo aguarda o fluxo de aprovação da mesa.' }, { status: 409 })
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) return NextResponse.json({ error: 'Recarregue a ficha antes de editar.' }, { status: 409 })
    const characterType = data?.characterType ?? original.characterType
    if (!canCreateCharacterType(characterType as CharacterType, await hasMasterAccess(session.user))) return NextResponse.json({ error: 'Este tipo de ficha é exclusivo do Mestre.' }, { status: 403 })
    await updateCharacter(id, session.user.sub, { name, data: safeCharacterData(data, original.data as Record<string, unknown>), campaignId, expectedRevision })
    return NextResponse.json({ ok: true, campaignId })
  } catch (error) {
    return errorResponse(error, 'Não foi possível atualizar a ficha.')
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSessionOrDev()
    if (!session?.user?.sub) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    const { id } = await readPayload(request)
    if (!id) return NextResponse.json({ error: 'Ficha inválida.' }, { status: 400 })
    await ensureAllTables()
    if (!(await getCharacterById(id, session.user.sub))) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
    return NextResponse.json({ error: 'A exclusão aguarda a política de retenção e a verificação de sessões ativas.' }, { status: 409 })
  } catch (error) {
    return errorResponse(error, 'Não foi possível excluir a ficha.')
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSessionOrDev()
    if (!session?.user?.sub) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    const body = await request.json().catch(() => { throw new InvalidPayload() })
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new InvalidPayload()
    const { characterId, amount, reason, idempotencyKey } = body
    if (typeof characterId !== 'string' || !UUID_PATTERN.test(characterId) || typeof idempotencyKey !== 'string' || !UUID_PATTERN.test(idempotencyKey) || !Number.isSafeInteger(amount) || amount <= 0 || amount > 10000 || typeof reason !== 'string' || !reason.trim() || reason.length > 500 || body.totalXp !== undefined) throw new InvalidPayload()
    await ensureAllTables()
    const result = await grantCharacterXp(session.user.sub, characterId, amount, reason, idempotencyKey)
    return NextResponse.json(result)
  } catch (error) {
    return errorResponse(error, 'Não foi possível atualizar o XP.')
  }
}
