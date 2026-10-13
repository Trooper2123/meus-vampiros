import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { canManageCampaign } from '@/lib/auth/authorization'
import { getCharacterAccessRecord } from '@/lib/characters'
import { CharacterCommandError } from '@/lib/character-commands'
import { persistPredatorTypeData } from '@/lib/predator-types'
import type { PredatorTypeOverride } from '@/lib/vtm-v5/predator-types'

export async function POST(request: Request, context: RouteContext<'/api/characters/[id]/predator-type/override'>) {
  try {
  const session = await getSessionOrDev()
  if (!session?.user?.sub) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  const { id } = await context.params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({ error: 'Ficha inválida.' }, { status: 400 })
  const character = await getCharacterAccessRecord(id)
  if (!character) return NextResponse.json({ error: 'Ficha não encontrada.' }, { status: 404 })
  if (!character.campaignId || !(await canManageCampaign(session.user.sub, character.campaignId))) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body || typeof body.ruleCode !== 'string' || body.ruleCode.length > 100 || (body.action !== 'CREATE' && body.action !== 'REVOKE') || typeof body.justification !== 'string' || !body.justification.trim() || body.justification.length > 1000) return NextResponse.json({ error: 'Override inválido.' }, { status: 400 })
  const overrides = Array.isArray(character.data.predatorTypeOverrides) ? [...character.data.predatorTypeOverrides] as PredatorTypeOverride[] : []
  if (!['PREDATOR_BAGGER_VENTRUE', 'PREDATOR_FARMER_RESTRICTED', 'THIN_BLOOD_PREDATOR_REVIEW'].includes(body.ruleCode)) return NextResponse.json({ error: 'Regra não permitida para override.' }, { status: 400 })
  const now = new Date().toISOString()
  let override: PredatorTypeOverride
  if (body.action === 'CREATE') {
    if (overrides.some(entry => entry.ruleCode === body.ruleCode && !entry.revokedAt)) return NextResponse.json({ error: 'Já existe override ativo para esta regra.' }, { status: 409 })
    override = { ruleCode: body.ruleCode, justification: body.justification.trim(), createdByUserId: session.user.sub, createdAt: now }
    overrides.push(override)
  } else {
    const index = overrides.findLastIndex((entry) => entry.ruleCode === body.ruleCode && !entry.revokedAt)
    if (index < 0) return NextResponse.json({ error: 'Override ativo não encontrado.' }, { status: 404 })
    override = { ...overrides[index], revokedAt: now, revokedByUserId: session.user.sub }
    overrides[index] = override
  }
  await persistPredatorTypeData(id, { ...character.data, predatorTypeOverrides: overrides }, session.user.sub, { expectedRevision: character.revision, masterOnly: true, eventType: body.action === 'CREATE' ? 'PREDATOR_TYPE_OVERRIDE_CREATED' : 'PREDATOR_TYPE_OVERRIDE_REVOKED', payload: { ruleCode: body.ruleCode, justification: body.justification.trim() } })
  return NextResponse.json({ override, overrides })
  } catch (error) { return NextResponse.json({ error: error instanceof CharacterCommandError ? error.message : 'Não foi possível alterar o override.' }, { status: error instanceof CharacterCommandError ? error.status : 500 }) }
}
