import { validateDisciplineAllocation, xpAcquisitions } from '@/lib/discipline-allocation'
import { randomUUID } from 'node:crypto'
import { campaignPredatorOverrides } from '@/lib/campaign-invitations'
import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { ensureAllTables } from '@/lib/db'
import { CharacterCommandError, runCharacterCommand } from '@/lib/character-commands'
import { normalizeCharacterRulesInput } from '@/lib/vtm-v5/normalize'
import { canTransitionCharacterStatus, validateCharacter } from '@/lib/vtm-v5/validation'
import { readSessionState } from '@/lib/vtm-v5/session-state'
import { CHARACTER_STATUSES, type CharacterStatus } from '@/lib/vtm-v5/types'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionOrDev()
    if (!session?.user?.sub) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    const { id } = await context.params
    const body = await request.json().catch(() => null)
    if (!UUID_PATTERN.test(id) || !body || !CHARACTER_STATUSES.includes(body.status) || (body.expectedRevision !== undefined && (!Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 0)) || (body.idempotencyKey !== undefined && (typeof body.idempotencyKey !== 'string' || !UUID_PATTERN.test(body.idempotencyKey)))) return NextResponse.json({ error: 'Transição inválida.' }, { status: 400 })
    await ensureAllTables()
    const result = await runCharacterCommand(session.user.sub, id, { key: body.idempotencyKey ?? randomUUID(), type: 'STATUS_CHANGE', expectedRevision: body.expectedRevision, payload: { status: body.status } }, character => character.ownerId === session.user.sub || character.masterId === session.user.sub, async character => {
      const isOwner = character.ownerId === session.user.sub
      const isMaster = character.masterId === session.user.sub
      const nextStatus = body.status as CharacterStatus
      if (!character.campaignId && nextStatus === 'PENDING_REVIEW') throw new CharacterCommandError(409, 'Uma ficha independente não precisa de revisão do narrador.')
      const state = readSessionState(character.data, character.gameState)
      if (body.status === 'PENDING_REVIEW' || body.status === 'APPROVED') validateDisciplineAllocation(character, true)
      const report = validateCharacter(normalizeCharacterRulesInput({ ...character.data, humanidade: state.humanity, characterType: character.characterType }, undefined, xpAcquisitions(character)), (await campaignPredatorOverrides(character.campaignId)).map(rule => rule.ruleCode), !character.campaignId)
      const independentApproval = !character.campaignId && isOwner && character.status === 'DRAFT' && nextStatus === 'APPROVED' && report.valid
      if (!independentApproval && !canTransitionCharacterStatus(character.status as CharacterStatus, nextStatus, isMaster, report.valid)) throw new CharacterCommandError(report.valid ? 409 : 422, report.valid ? 'Transição de status não permitida.' : 'Corrija os erros da ficha antes de enviá-la.')
      character.status = nextStatus
      character.validationReport = report
      character.validationUpdated = true
      return { status: nextStatus, report }
    })
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: error instanceof CharacterCommandError ? error.message : 'Não foi possível atualizar o status.' }, { status: error instanceof CharacterCommandError ? error.status : 500 })
  }
}
