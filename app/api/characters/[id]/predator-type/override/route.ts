import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { canManageCampaign } from '@/lib/auth/authorization'
import { getCharacterAccessRecord } from '@/lib/characters'
import { CharacterCommandError } from '@/lib/character-commands'
import { persistPredatorTypeData } from '@/lib/predator-types'
import type { PredatorTypeOverride } from '@/lib/vtm-v5/predator-types'

type OverrideInput = { ruleCode: string; action: 'CREATE' | 'REVOKE'; justification: string }
const overrideRules = new Set(['PREDATOR_BAGGER_VENTRUE', 'PREDATOR_FARMER_RESTRICTED', 'THIN_BLOOD_PREDATOR_REVIEW'])

function parseOverrideInput(value: unknown): OverrideInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new CharacterCommandError(400, 'Override inválido.')
  const body = value as Record<string, unknown>
  if (typeof body.ruleCode !== 'string' || body.ruleCode.length > 100) throw new CharacterCommandError(400, 'Override inválido.')
  if (body.action !== 'CREATE' && body.action !== 'REVOKE') throw new CharacterCommandError(400, 'Override inválido.')
  if (typeof body.justification !== 'string' || !body.justification.trim() || body.justification.length > 1000) throw new CharacterCommandError(400, 'Override inválido.')
  if (!overrideRules.has(body.ruleCode)) throw new CharacterCommandError(400, 'Regra não permitida para override.')
  return { ruleCode: body.ruleCode, action: body.action, justification: body.justification.trim() }
}

function changeOverride(overrides: PredatorTypeOverride[], input: OverrideInput, actorId: string): PredatorTypeOverride {
  const index = overrides.findLastIndex(entry => entry.ruleCode === input.ruleCode && !entry.revokedAt)
  const now = new Date().toISOString()
  if (input.action === 'CREATE') {
    if (index >= 0) throw new CharacterCommandError(409, 'Já existe override ativo para esta regra.')
    const override = { ruleCode: input.ruleCode, justification: input.justification, createdByUserId: actorId, createdAt: now }
    overrides.push(override)
    return override
  }
  if (index < 0) throw new CharacterCommandError(404, 'Override ativo não encontrado.')
  const override = { ...overrides[index], revokedAt: now, revokedByUserId: actorId }
  overrides[index] = override
  return override
}

export async function POST(request: Request, context: RouteContext<'/api/characters/[id]/predator-type/override'>) {
  try {
    const session = await getSessionOrDev()
    if (!session?.user?.sub) throw new CharacterCommandError(401, 'Não autorizado.')
    const { id } = await context.params
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new CharacterCommandError(400, 'Ficha inválida.')
    const character = await getCharacterAccessRecord(id)
    if (!character) throw new CharacterCommandError(404, 'Ficha não encontrada.')
    if (!character.campaignId || !(await canManageCampaign(session.user.sub, character.campaignId))) throw new CharacterCommandError(403, 'Acesso negado.')
    const input = parseOverrideInput(await request.json().catch(() => null))
    const overrides = Array.isArray(character.data.predatorTypeOverrides) ? [...character.data.predatorTypeOverrides] as PredatorTypeOverride[] : []
    const override = changeOverride(overrides, input, session.user.sub)
    await persistPredatorTypeData(id, { ...character.data, predatorTypeOverrides: overrides }, session.user.sub, { expectedRevision: character.revision, masterOnly: true, eventType: input.action === 'CREATE' ? 'PREDATOR_TYPE_OVERRIDE_CREATED' : 'PREDATOR_TYPE_OVERRIDE_REVOKED', payload: { ruleCode: input.ruleCode, justification: input.justification } })
    return NextResponse.json({ override, overrides })
  } catch (error) {
    return NextResponse.json({ error: error instanceof CharacterCommandError ? error.message : 'Não foi possível alterar o override.' }, { status: error instanceof CharacterCommandError ? error.status : 500 })
  }
}
