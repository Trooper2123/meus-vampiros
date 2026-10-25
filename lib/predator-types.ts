import { sql } from 'drizzle-orm'
import { campaignPredatorOverrides } from './campaign-invitations'
import { characterText } from './vtm-v5/text'
import { randomUUID } from 'node:crypto'
import { CharacterCommandError, CommandCharacter, runCharacterCommand } from './character-commands'
import { applyPredatorEffects } from './predator-effects'
import { readSessionState } from './vtm-v5/session-state'
import { applyPredatorTypeSelection, removePredatorTypeSelection, type PredatorTypeSelection } from './vtm-v5/predator-types'
import { db } from '@/lib/db'
import { applySecondaryAttributes } from '@/lib/vtm-v5/secondary-attributes'
import { PREDATOR_TYPE_BY_CODE, PREDATOR_TYPE_CODES, PREDATOR_TYPE_SOURCES, validatePredatorType, type PredatorTypeCode, type PredatorTypeSettings, type PredatorTypeSource } from '@/lib/vtm-v5/predator-types'

const defaultSettings = (): PredatorTypeSettings => ({ enabledSources: ['COREBOOK'], enabledCodes: null, disabledCodes: [] })
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function sanitizePredatorTypeSettings(input: unknown): PredatorTypeSettings | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) { return null }
  const value = input as Record<string, unknown>
  if (Object.keys(value).some(key => !['enabledSources', 'enabledCodes', 'disabledCodes'].includes(key))) { return null }
  if (!Array.isArray(value.enabledSources) || value.enabledSources.length > PREDATOR_TYPE_SOURCES.length || value.enabledSources.some(entry => !PREDATOR_TYPE_SOURCES.includes(entry))) { return null }
  if (value.enabledCodes !== null && (!Array.isArray(value.enabledCodes) || value.enabledCodes.length > PREDATOR_TYPE_CODES.length || value.enabledCodes.some(entry => !PREDATOR_TYPE_CODES.includes(entry)))) { return null }
  if (!Array.isArray(value.disabledCodes) || value.disabledCodes.length > PREDATOR_TYPE_CODES.length || value.disabledCodes.some(entry => !PREDATOR_TYPE_CODES.includes(entry))) { return null }
  const enabledSources = Array.isArray(value.enabledSources) ? value.enabledSources.filter((entry): entry is PredatorTypeSource => typeof entry === 'string' && PREDATOR_TYPE_SOURCES.includes(entry as PredatorTypeSource)) : []
  let enabledCodeSelection
  if (value.enabledCodes === null) {
    enabledCodeSelection = null
  } else if (Array.isArray(value.enabledCodes)) {
    enabledCodeSelection = value.enabledCodes.filter((entry): entry is PredatorTypeCode => typeof entry === 'string' && PREDATOR_TYPE_CODES.includes(entry as PredatorTypeCode))
  } else {
    enabledCodeSelection = null
  }
  const enabledCodes = enabledCodeSelection
  const disabledCodes = Array.isArray(value.disabledCodes) ? value.disabledCodes.filter((entry): entry is PredatorTypeCode => typeof entry === 'string' && PREDATOR_TYPE_CODES.includes(entry as PredatorTypeCode)) : []
  if (!enabledSources.includes('COREBOOK')) { enabledSources.unshift('COREBOOK') }
  return { enabledSources: [...new Set(enabledSources)], enabledCodes: enabledCodes ? [...new Set(enabledCodes)] : null, disabledCodes: [...new Set(disabledCodes)] }
}

export async function getPredatorTypeSettings(campaignId: string | null): Promise<PredatorTypeSettings> {
  if (!campaignId) { return defaultSettings() }
  if (!uuid.test(campaignId)) { throw new CharacterCommandError(400, 'Mesa inválida.') }
  const result = await db.execute<{ enabled_sources: PredatorTypeSource[]; enabled_codes: PredatorTypeCode[] | null; disabled_codes: PredatorTypeCode[] }>(sql`
    SELECT enabled_sources, enabled_codes, disabled_codes FROM campaign_predator_type_settings WHERE campaign_id = ${campaignId}::uuid
  `)
  const row = result.rows[0]
  return row ? { enabledSources: row.enabled_sources, enabledCodes: row.enabled_codes, disabledCodes: row.disabled_codes } : defaultSettings()
}

export async function savePredatorTypeSettings(campaignId: string, settings: PredatorTypeSettings, userId: string) {
  if (!uuid.test(campaignId)) { throw new CharacterCommandError(400, 'Mesa inválida.') }
  const validated = sanitizePredatorTypeSettings(settings)
  if (!validated) { throw new CharacterCommandError(400, 'Configuração inválida.') }
  settings = validated
  await db.transaction(async transaction => {
    const campaign = await transaction.execute<{ master_user_id: string; creation_policy: unknown }>(sql`SELECT master_user_id, creation_policy FROM campaigns WHERE id = ${campaignId}::uuid FOR UPDATE`)
    if (campaign.rows[0]?.master_user_id !== userId) { throw new CharacterCommandError(403, 'Acesso negado.') }
    if (campaign.rows[0].creation_policy) { throw new CharacterCommandError(409, 'As regras são definidas apenas na criação da mesa.') }
    const affected = await transaction.execute<{ id: string }>(sql`SELECT id FROM characters WHERE campaign_id = ${campaignId}::uuid AND data->>'predatorTypeCode' IS NOT NULL AND status IN ('DRAFT', 'APPROVED', 'PENDING_REVIEW') ORDER BY id FOR UPDATE`)
    await transaction.execute(sql`
    INSERT INTO campaign_predator_type_settings (campaign_id, enabled_sources, enabled_codes, disabled_codes, updated_by_user_id)
    SELECT id, ${JSON.stringify(settings.enabledSources)}::jsonb, ${settings.enabledCodes ? JSON.stringify(settings.enabledCodes) : null}::jsonb, ${JSON.stringify(settings.disabledCodes)}::jsonb, ${userId} FROM campaigns WHERE id = ${campaignId}::uuid AND master_user_id = ${userId}
    ON CONFLICT (campaign_id) DO UPDATE SET enabled_sources = EXCLUDED.enabled_sources, enabled_codes = EXCLUDED.enabled_codes, disabled_codes = EXCLUDED.disabled_codes, updated_by_user_id = EXCLUDED.updated_by_user_id, updated_at = now()
  `)
    for (const character of affected.rows) {
      await transaction.execute(sql`UPDATE characters SET status = 'DRAFT', revision = revision + 1, validation_report = NULL, validated_at = NULL, updated_at = now() WHERE id = ${character.id}::uuid`)
      await transaction.execute(sql`INSERT INTO character_ledger_events (character_id, event_type, origin, payload, created_by_user_id) VALUES (${character.id}::uuid, 'PREDATOR_TYPE_SETTINGS_CHANGED', 'MASTER_ACTION', ${JSON.stringify({ campaignId, settings })}::jsonb, ${userId})`)
    }
  })
  return structuredClone(settings)
}

export function isPredatorTypeEnabled(code: PredatorTypeCode, settings: PredatorTypeSettings): boolean {
  const definition = PREDATOR_TYPE_BY_CODE.get(code)
  if (!definition || settings.disabledCodes.includes(code)) { return false }
  if (settings.enabledCodes?.includes(code)) { return true }
  return settings.enabledSources.includes(definition.source)
}

export async function persistPredatorTypeData(characterId: string, data: Record<string, unknown>, actorId: string, options: { expectedRevision: number; masterOnly?: boolean; eventType: string; payload: Record<string, unknown> }) {
  if (!uuid.test(characterId)) { throw new CharacterCommandError(400, 'Ficha inválida.') }
  if (!Number.isSafeInteger(options.expectedRevision)) { throw new CharacterCommandError(400, 'Revisão inválida.') }
  return runCharacterCommand(actorId, characterId, { key: randomUUID(), expectedRevision: options.expectedRevision, type: options.eventType, payload: options.payload }, character => options.masterOnly ? character.masterId === actorId : character.ownerId === actorId, async character => {
    if (character.status === 'ARCHIVED' || character.status === 'DISABLED' || (!options.masterOnly && character.status !== 'DRAFT')) { throw new CharacterCommandError(409, 'A ficha não permite esta alteração.') }
    if (!options.masterOnly && character.characterType !== 'PLAYER_VAMPIRE') { throw new CharacterCommandError(422, 'A escolha exige uma ficha de vampiro jogador.') }
    if (!options.masterOnly && data.predatorTypeCode) {
      await validatePredatorUpdate(data,character)
    }
    const projected=projectPredatorUpdate(character,options,data)
    character.data = applySecondaryAttributes(projected, projected)
    if (!options.masterOnly) { applyPredatorEffects(character) }
    if (!Number.isSafeInteger(character.data.humanidade) || Number(character.data.humanidade) < 0 || Number(character.data.humanidade) > 10) { throw new CharacterCommandError(422, 'Humanidade inválida.') }
    if (options.masterOnly) { character.status = 'DRAFT' }
    if (character.gameState.humanity !== undefined) { character.gameState.humanity = character.data.humanidade }
    return { ok: true, derived: { humanidade: character.data.humanidade, bloodPotency: character.data['potencia-de-sangue'] } }
  })
}

function projectPredatorUpdate(character: CommandCharacter,options: { expectedRevision: number; masterOnly?: boolean; eventType: string; payload: Record<string,unknown> },data: Record<string,unknown>) {
  const projected=structuredClone(character.data)
  const fields=options.masterOnly? ['predatorTypeOverrides']:['predador','predatorTypeCode','predatorTypeSelection','predatorTypeBaseHumanity','predatorTypeBaseBloodPotency','predatorTypeRelationshipRequirements','humanidade','potencia-de-sangue']
  for(const field of fields) {
    if(Object.hasOwn(data,field)) { projected[field]=structuredClone(data[field]) }
    else delete projected[field]
  }
  const canonicalHumanity=readSessionState(character.data,character.gameState).humanity
  if(options.masterOnly) { projected.humanidade=canonicalHumanity }
  else if(projected.predatorTypeSelection) {
    const selection=projected.predatorTypeSelection as PredatorTypeSelection
    const definition=PREDATOR_TYPE_BY_CODE.get(selection.code)
    if(!definition) { throw new CharacterCommandError(422,'Tipo de predação inválido.') }
    Object.assign(projected,applyPredatorTypeSelection({ ...character.data,humanidade: canonicalHumanity },definition,selection).data)
  } else if(character.data.predatorTypeSelection) {
    projected.humanidade=removePredatorTypeSelection({ ...character.data,humanidade: canonicalHumanity }).humanidade
  }
  return projected
}

async function validatePredatorUpdate(data: Record<string,unknown>,character: CommandCharacter) {
const definition=PREDATOR_TYPE_BY_CODE.get(data.predatorTypeCode as PredatorTypeCode)
const settings=await getPredatorTypeSettings(character.campaignId)
if(!definition||(character.campaignId&&!isPredatorTypeEnabled(definition.code,settings))) { throw new CharacterCommandError(422,'Tipo de predação não permitido pela configuração atual.') }
const report=validatePredatorType(definition,{ clan: characterText(character.data.cla)||null,bloodPotency: Number(character.data['potencia-de-sangue']??0),isThinBlood: character.data.creationType==='THIN_BLOOD'||character.data.isThinBlood===true,enabled: true,creationType: character.data.creationType,overrides: await campaignPredatorOverrides(character.campaignId) })
if(!report.valid) { throw new CharacterCommandError(422,report.issues.filter(issue => issue.blocking).map(issue => issue.message).join(' ')) }
}
