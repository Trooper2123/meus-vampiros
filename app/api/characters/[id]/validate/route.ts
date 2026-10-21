import { validateDisciplineAllocation, xpAcquisitions } from '@/lib/discipline-allocation'
import { CharacterCommandError } from '@/lib/character-commands'
import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { canManageCampaign } from '@/lib/auth/authorization'
import { ensureAllTables } from '@/lib/db'
import { appendCharacterLedgerEvent, getCharacterAccessRecord, saveCharacterValidation } from '@/lib/characters'
import { normalizeCharacterRulesInput } from '@/lib/vtm-v5/normalize'
import { projectCreationGrants } from '@/lib/vtm-v5/creation-grants'
import { validateCharacter } from '@/lib/vtm-v5/validation'
import { campaignPredatorOverrides } from '@/lib/campaign-invitations'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function validatePersistedCharacter(id: string, userId: string) {
  if (!UUID_PATTERN.test(id)) return { response: NextResponse.json({ error: 'ID da ficha inválido.' }, { status: 400 }) }
  const character = await getCharacterAccessRecord(id)
  if (!character) return { response: NextResponse.json({ error: 'Ficha não encontrada.' }, { status: 404 }) }
  const isOwner = character.userId === userId
  const isMaster = Boolean(character.campaignId && await canManageCampaign(userId, character.campaignId))
  if (!isOwner && !isMaster) return { response: NextResponse.json({ error: 'Acesso negado.' }, { status: 403 }) }
  const overrides = await campaignPredatorOverrides(character.campaignId)
  const report = validateCharacter(normalizeCharacterRulesInput({ ...character.data, characterType: character.characterType }, projectCreationGrants(character.gameState), xpAcquisitions(character)), overrides.map(rule => rule.ruleCode), !character.campaignId)
  try { validateDisciplineAllocation(character, true) }
  catch (error) { report.valid = false; report.errors.push({ code: 'DISCIPLINE_ACCESS', field: 'disciplines', message: error instanceof CharacterCommandError ? error.message : 'Revise as origens das Disciplinas.' }) }
  await saveCharacterValidation(id, report)
  await appendCharacterLedgerEvent(id, 'VALIDATION', 'RULE_ENGINE', { valid: report.valid, errors: report.errors.map((entry) => entry.code), warnings: report.warnings.map((entry) => entry.code), derived: report.derived }, userId)
  return { report }
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureAllTables()
    const session = await getSessionOrDev()
    if (!session?.user?.sub) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    const { id } = await context.params
    const result = await validatePersistedCharacter(id, session.user.sub)
    return result.response ?? NextResponse.json(result.report)
  } catch (error) {
    console.error('[POST /api/characters/[id]/validate]', error)
    return NextResponse.json({ error: 'Não foi possível validar a ficha.' }, { status: 500 })
  }
}

export const GET = POST
