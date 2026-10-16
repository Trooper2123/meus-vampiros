import { NextResponse } from 'next/server'
import { campaignPredatorOverrides } from '@/lib/campaign-invitations'
import { characterText } from '@/lib/vtm-v5/text'
import { getSessionOrDev } from '@/lib/auth0'
import { getCharacterAccessRecord } from '@/lib/characters'
import { CharacterCommandError, getCommandCharacter } from '@/lib/character-commands'
import { readSessionState } from '@/lib/vtm-v5/session-state'
import { applyPredatorTypeSelection, PREDATOR_TYPE_BY_CODE, PREDATOR_TYPE_CODES, toPlayerPredatorTypeDto, validatePredatorChoices, validatePredatorType, type PredatorTypeCode } from '@/lib/vtm-v5/predator-types'
import { getPredatorTypeSettings, isPredatorTypeEnabled, persistPredatorTypeData } from '@/lib/predator-types'
import { removePredatorTypeSelection } from '@/lib/vtm-v5/predator-types'

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionOrDev()
    if (!session?.user?.sub) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    const { id } = await context.params
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({ error: 'Ficha inválida.' }, { status: 400 })
    const character = await getCharacterAccessRecord(id)
    if (!character) return NextResponse.json({ error: 'Ficha não encontrada.' }, { status: 404 })
    if (character.userId !== session.user.sub) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
    if (character.status !== 'DRAFT') return NextResponse.json({ error: 'A remoção exige uma ficha em rascunho.' }, { status: 409 })
    if (character.data.predatorTypeSelection || character.data.predatorTypeCode || character.data.predador) {
      await persistPredatorTypeData(id, removePredatorTypeSelection(character.data), session.user.sub, { expectedRevision: character.revision, eventType: 'PREDATOR_TYPE_REMOVED', payload: {} })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof CharacterCommandError ? error.message : 'Não foi possível remover o tipo de predação.' }, { status: error instanceof CharacterCommandError ? error.status : 500 })
  }
}

export async function POST(request: Request, context: RouteContext<'/api/characters/[id]/predator-type'>) {
  try {
  const session = await getSessionOrDev()
  if (!session?.user?.sub) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  const { id } = await context.params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({ error: 'Ficha inválida.' }, { status: 400 })
  const character = await getCharacterAccessRecord(id)
  if (!character) return NextResponse.json({ error: 'Ficha não encontrada.' }, { status: 404 })
  if (character.userId !== session.user.sub) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  if (character.status !== 'DRAFT') return NextResponse.json({ error: 'Retorne a ficha para rascunho antes de trocar o tipo de predação.' }, { status: 409 })
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body || typeof body.code !== 'string' || !PREDATOR_TYPE_CODES.includes(body.code as PredatorTypeCode)) return NextResponse.json({ error: 'Código inválido.' }, { status: 400 })
  const definition = PREDATOR_TYPE_BY_CODE.get(body.code as PredatorTypeCode)!
  const settings = await getPredatorTypeSettings(character.campaignId)
  const enabled = isPredatorTypeEnabled(definition.code, settings)
  const data = character.data
  const report = validatePredatorType(definition, { clan: characterText(data.cla).trim() || null, bloodPotency: Number(data['potencia-de-sangue'] ?? 0), isThinBlood: data.creationType === 'THIN_BLOOD' || data.isThinBlood === true, enabled, overrides: campaignPredatorOverrides(character.campaignId) })
  const choiceIssues = validatePredatorChoices(definition, body.specialty, body.discipline, body.optionCodes)
  const issues = [...report.issues, ...choiceIssues]
  if (issues.some((issue) => issue.blocking)) return NextResponse.json({ error: 'A escolha possui restrições.', publicReport: { valid: false, issues } }, { status: 422 })
  const applied = applyPredatorTypeSelection(data, definition, { code: definition.code, specialty: String(body.specialty), discipline: String(body.discipline), optionCodes: body.optionCodes as string[] })
  const persisted = applied.changed || !data.predatorEffectsVersion ? await persistPredatorTypeData(id, applied.data, session.user.sub, { expectedRevision: character.revision, eventType: 'PREDATOR_TYPE_APPLIED', payload: { code: definition.code, selection: applied.selection, modifiers: applied.modifiers, relationshipRequirements: report.relationshipRequirements } }) : null
  const current = persisted ? null : await getCommandCharacter(id)
  const derived = persisted?.derived ?? (current ? { humanidade: readSessionState(current.data, current.gameState).humanity, bloodPotency: current.data['potencia-de-sangue'] } : { humanidade: applied.data.humanidade, bloodPotency: applied.data['potencia-de-sangue'] })
  return NextResponse.json({ selection: applied.selection, predatorType: toPlayerPredatorTypeDto(definition, issues, true), publicReport: { valid: true, issues }, derived })
  } catch (error) { return NextResponse.json({ error: error instanceof CharacterCommandError ? error.message : 'Não foi possível aplicar o tipo de predação.' }, { status: error instanceof CharacterCommandError ? error.status : 500 }) }
}
