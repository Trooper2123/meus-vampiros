import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { canManageCampaign } from '@/lib/auth/authorization'
import { ensureAllTables } from '@/lib/db'
import { appendCharacterLedgerEvent, getCharacterAccessRecord, saveCharacterValidation, setCharacterStatus } from '@/lib/characters'
import { normalizeCharacterRulesInput } from '@/lib/vtm-v5/normalize'
import { canTransitionCharacterStatus, validateCharacter } from '@/lib/vtm-v5/validation'
import { CHARACTER_STATUSES, type CharacterStatus } from '@/lib/vtm-v5/types'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureAllTables()
    const session = await getSessionOrDev()
    if (!session?.user?.sub) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    const { id } = await context.params
    if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: 'ID da ficha inválido.' }, { status: 400 })
    const body = await request.json().catch(() => ({}))
    const nextStatus = body.status as CharacterStatus
    if (!CHARACTER_STATUSES.includes(nextStatus)) return NextResponse.json({ error: 'Status inválido.' }, { status: 400 })

    const character = await getCharacterAccessRecord(id)
    if (!character) return NextResponse.json({ error: 'Ficha não encontrada.' }, { status: 404 })
    const isOwner = character.userId === session.user.sub
    const isMaster = Boolean(character.campaignId && await canManageCampaign(session.user.sub, character.campaignId))
    if (!isOwner && !isMaster) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

    const report = validateCharacter(normalizeCharacterRulesInput({ ...character.data, characterType: character.characterType }))
    await saveCharacterValidation(id, report)
    if (!canTransitionCharacterStatus(character.status as CharacterStatus, nextStatus, isMaster, report.valid)) {
      return NextResponse.json({ error: report.valid ? 'Transição de status não permitida.' : 'Corrija os erros da ficha antes de enviá-la.', report }, { status: report.valid ? 409 : 422 })
    }
    await setCharacterStatus(id, nextStatus)
    await appendCharacterLedgerEvent(id, 'STATUS_CHANGE', 'USER_ACTION', { from: character.status, to: nextStatus }, session.user.sub)
    return NextResponse.json({ status: nextStatus, report })
  } catch (error) {
    console.error('[PATCH /api/characters/[id]/status]', error)
    return NextResponse.json({ error: 'Não foi possível atualizar o status da ficha.' }, { status: 500 })
  }
}
