import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { appendCharacterLedgerEvent, getCharacterAccessRecord } from '@/lib/characters'
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
      await persistPredatorTypeData(id, removePredatorTypeSelection(character.data))
      await appendCharacterLedgerEvent(id, 'PREDATOR_TYPE_REMOVED', 'USER_ACTION', {}, session.user.sub)
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Não foi possível remover o tipo de predação.' }, { status: 500 })
  }
}

export async function POST(request: Request, context: RouteContext<'/api/characters/[id]/predator-type'>) {
  const session = await getSessionOrDev()
  if (!session?.user?.sub) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  const { id } = await context.params
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
  const report = validatePredatorType(definition, { clan: String(data.cla ?? '').trim() || null, bloodPotency: Number(data['potencia-de-sangue'] ?? 0), isThinBlood: data.creationType === 'THIN_BLOOD' || data.isThinBlood === true, enabled, overrides: Array.isArray(data.predatorTypeOverrides) ? data.predatorTypeOverrides : [] })
  const choiceIssues = validatePredatorChoices(definition, body.specialty, body.discipline, body.optionCodes)
  const issues = [...report.issues, ...choiceIssues]
  if (issues.some((issue) => issue.blocking)) return NextResponse.json({ error: 'A escolha possui restrições.', publicReport: { valid: false, issues } }, { status: 422 })
  const applied = applyPredatorTypeSelection(data, definition, { code: definition.code, specialty: String(body.specialty), discipline: String(body.discipline), optionCodes: body.optionCodes as string[] })
  await persistPredatorTypeData(id, applied.data)
  if (applied.changed) await appendCharacterLedgerEvent(id, 'PREDATOR_TYPE_APPLIED', 'USER_ACTION', { code: definition.code, selection: applied.selection, modifiers: applied.modifiers, relationshipRequirements: report.relationshipRequirements }, session.user.sub)
  return NextResponse.json({ selection: applied.selection, predatorType: toPlayerPredatorTypeDto(definition, issues, true), publicReport: { valid: true, issues }, derived: { humanidade: applied.data.humanidade, bloodPotency: applied.data['potencia-de-sangue'] } })
}
