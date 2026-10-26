import { validateDisciplineAllocation, xpAcquisitions } from '@/lib/discipline-allocation'
import { randomUUID } from 'node:crypto'
import { campaignPredatorOverrides } from '@/lib/campaign-invitations'
import { NextResponse } from 'next/server'
import { notesActor, notesBody } from '@/lib/notes-http'
import { ensureAllTables } from '@/lib/db'
import { CharacterCommandError, runCharacterCommand } from '@/lib/character-commands'
import { normalizeCharacterRulesInput } from '@/lib/vtm-v5/normalize'
import { canTransitionCharacterStatus, validateCharacter } from '@/lib/vtm-v5/validation'
import { readSessionState } from '@/lib/vtm-v5/session-state'
import { projectCreationGrants } from '@/lib/vtm-v5/creation-grants'
import { CHARACTER_STATUSES, type CharacterStatus } from '@/lib/vtm-v5/types'
import { hasCampaignApproval } from '@/lib/campaign-approval'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actorId = await notesActor(request, true)
    const { id } = await context.params
    const body = await notesBody(request)
    if (!UUID_PATTERN.test(id) || !CHARACTER_STATUSES.includes(body.status as CharacterStatus) || (body.expectedRevision !== undefined && (!Number.isSafeInteger(body.expectedRevision) || Number(body.expectedRevision) < 0)) || (body.idempotencyKey !== undefined && (typeof body.idempotencyKey !== 'string' || !UUID_PATTERN.test(body.idempotencyKey)))) return NextResponse.json({ error: 'Transição inválida.' }, { status: 400 })
    await ensureAllTables()
    const result = await runCharacterCommand(actorId, id, { key: body.idempotencyKey as string | undefined ?? randomUUID(), type: 'STATUS_CHANGE', expectedRevision: body.expectedRevision as number | undefined, payload: { status: body.status } }, character => character.ownerId === actorId || character.masterId === actorId, async character => {
      const isOwner = character.ownerId === actorId
      const isMaster = character.masterId === actorId
      const nextStatus = body.status as CharacterStatus
      if (hasCampaignApproval(character) && ['PENDING_REVIEW', 'APPROVED'].includes(nextStatus)) throw new CharacterCommandError(409, 'A participação nesta mesa já foi aprovada.')
      if (character.status === 'APPROVED' && nextStatus === 'DRAFT') throw new CharacterCommandError(409, 'Uma ficha aprovada não precisa de nova revisão.')
      if (!character.campaignId && nextStatus === 'PENDING_REVIEW') throw new CharacterCommandError(409, 'Uma ficha independente não precisa de revisão do narrador.')
      const state = readSessionState(character.data, character.gameState)
      if (body.status === 'PENDING_REVIEW' || body.status === 'APPROVED') validateDisciplineAllocation(character, true)
      const report = validateCharacter(normalizeCharacterRulesInput({ ...character.data, humanidade: state.humanity, characterType: character.characterType }, projectCreationGrants(character.gameState), xpAcquisitions(character)), (await campaignPredatorOverrides(character.campaignId)).map(rule => rule.ruleCode), !character.campaignId)
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
