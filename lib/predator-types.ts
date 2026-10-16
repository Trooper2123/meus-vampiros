import { sql } from 'drizzle-orm'
import { campaignPredatorOverrides } from './campaign-invitations'
import { characterText } from './vtm-v5/text'
import { randomUUID } from 'node:crypto'
import { CharacterCommandError, runCharacterCommand } from './character-commands'
import { applyPredatorEffects } from './predator-effects'
import { readSessionState } from './vtm-v5/session-state'
import { applyPredatorTypeSelection, removePredatorTypeSelection, type PredatorTypeSelection } from './vtm-v5/predator-types'
import { devGetCampaignsForMaster } from './dev-db'
import { db } from '@/lib/db'
import { applySecondaryAttributes } from '@/lib/vtm-v5/secondary-attributes'
import { PREDATOR_TYPE_BY_CODE, PREDATOR_TYPE_CODES, PREDATOR_TYPE_SOURCES, validatePredatorType, type PredatorTypeCode, type PredatorTypeSettings, type PredatorTypeSource } from '@/lib/vtm-v5/predator-types'

const isDev = process.env.NODE_ENV !== 'production' && !process.env.DATABASE_URL
const defaultSettings = (independent = false): PredatorTypeSettings => ({ enabledSources: independent ? [...PREDATOR_TYPE_SOURCES] : ['COREBOOK'], enabledCodes: null, disabledCodes: [] })
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

declare global {
   
  var __predatorTypeSettings: Map<string, PredatorTypeSettings> | undefined
  var __predatorTypeSettingsStore: typeof global.__devDb
}

function memorySettings() {
  if (!global.__predatorTypeSettings || global.__predatorTypeSettingsStore !== global.__devDb) {
    global.__predatorTypeSettings = new Map()
    global.__predatorTypeSettingsStore = global.__devDb
  }
  return global.__predatorTypeSettings
}

export function sanitizePredatorTypeSettings(input: unknown): PredatorTypeSettings | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const value = input as Record<string, unknown>
  if (Object.keys(value).some(key => !['enabledSources', 'enabledCodes', 'disabledCodes'].includes(key))) return null
  if (!Array.isArray(value.enabledSources) || value.enabledSources.length > PREDATOR_TYPE_SOURCES.length || value.enabledSources.some(entry => !PREDATOR_TYPE_SOURCES.includes(entry))) return null
  if (value.enabledCodes !== null && (!Array.isArray(value.enabledCodes) || value.enabledCodes.length > PREDATOR_TYPE_CODES.length || value.enabledCodes.some(entry => !PREDATOR_TYPE_CODES.includes(entry)))) return null
  if (!Array.isArray(value.disabledCodes) || value.disabledCodes.length > PREDATOR_TYPE_CODES.length || value.disabledCodes.some(entry => !PREDATOR_TYPE_CODES.includes(entry))) return null
  const enabledSources = Array.isArray(value.enabledSources) ? value.enabledSources.filter((entry): entry is PredatorTypeSource => typeof entry === 'string' && PREDATOR_TYPE_SOURCES.includes(entry as PredatorTypeSource)) : []
  const enabledCodes = value.enabledCodes === null ? null : Array.isArray(value.enabledCodes) ? value.enabledCodes.filter((entry): entry is PredatorTypeCode => typeof entry === 'string' && PREDATOR_TYPE_CODES.includes(entry as PredatorTypeCode)) : null
  const disabledCodes = Array.isArray(value.disabledCodes) ? value.disabledCodes.filter((entry): entry is PredatorTypeCode => typeof entry === 'string' && PREDATOR_TYPE_CODES.includes(entry as PredatorTypeCode)) : []
  if (!enabledSources.includes('COREBOOK')) enabledSources.unshift('COREBOOK')
  return { enabledSources: [...new Set(enabledSources)], enabledCodes: enabledCodes ? [...new Set(enabledCodes)] : null, disabledCodes: [...new Set(disabledCodes)] }
}

export async function getPredatorTypeSettings(campaignId: string | null): Promise<PredatorTypeSettings> {
  if (!campaignId) return defaultSettings(true)
  if (!uuid.test(campaignId)) throw new CharacterCommandError(400, 'Mesa inválida.')
  if (isDev) return structuredClone(memorySettings().get(campaignId) ?? defaultSettings())
  const result = await db.execute<{ enabled_sources: PredatorTypeSource[]; enabled_codes: PredatorTypeCode[] | null; disabled_codes: PredatorTypeCode[] }>(sql`
    SELECT enabled_sources, enabled_codes, disabled_codes FROM campaign_predator_type_settings WHERE campaign_id = ${campaignId}::uuid
  `)
  const row = result.rows[0]
  return row ? { enabledSources: row.enabled_sources, enabledCodes: row.enabled_codes, disabledCodes: row.disabled_codes } : defaultSettings()
}

export async function savePredatorTypeSettings(campaignId: string, settings: PredatorTypeSettings, userId: string) {
  if (!uuid.test(campaignId)) throw new CharacterCommandError(400, 'Mesa inválida.')
  const validated = sanitizePredatorTypeSettings(settings)
  if (!validated) throw new CharacterCommandError(400, 'Configuração inválida.')
  settings = validated
  if (isDev) {
    devGetCampaignsForMaster(userId)
    if (!global.__devDb?.campaigns.some(campaign => campaign.id === campaignId && campaign.masterUserId === userId)) throw new CharacterCommandError(403, 'Acesso negado.')
    const store = global.__devDb
    if (store.campaigns.find(campaign => campaign.id === campaignId)?.creationPolicy) throw new CharacterCommandError(409, 'As regras são definidas apenas na criação da mesa.')
    const affected = store.characters.filter(character => character.campaignId === campaignId && character.data.predatorTypeCode && ['DRAFT', 'APPROVED', 'PENDING_REVIEW'].includes(character.status))
    const events = affected.map(character => ({ id: randomUUID(), characterId: character.id, eventType: 'PREDATOR_TYPE_SETTINGS_CHANGED', origin: 'MASTER_ACTION', payload: { campaignId, settings: structuredClone(settings) }, createdByUserId: userId, createdAt: new Date() }))
    memorySettings().set(campaignId, structuredClone(settings))
    for (const character of affected) {
      character.status = 'DRAFT'
      character.revision = (character.revision ?? 0) + 1
      character.validationReport = undefined
      character.validatedAt = undefined
      character.updatedAt = new Date()
    }
    store.characterLedgerEvents.push(...events)
    return structuredClone(settings)
  }
  await db.transaction(async transaction => {
    const campaign = await transaction.execute<{ master_user_id: string }>(sql`SELECT master_user_id FROM campaigns WHERE id = ${campaignId}::uuid FOR UPDATE`)
    if (campaign.rows[0]?.master_user_id !== userId) throw new CharacterCommandError(403, 'Acesso negado.')
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
  if (!definition || settings.disabledCodes.includes(code)) return false
  if (settings.enabledCodes?.includes(code)) return true
  return settings.enabledSources.includes(definition.source)
}

export async function persistPredatorTypeData(characterId: string, data: Record<string, unknown>, actorId: string, options: { expectedRevision: number; masterOnly?: boolean; eventType: string; payload: Record<string, unknown> }) {
  if (!uuid.test(characterId)) throw new CharacterCommandError(400, 'Ficha inválida.')
  if (!Number.isSafeInteger(options.expectedRevision)) throw new CharacterCommandError(400, 'Revisão inválida.')
  return runCharacterCommand(actorId, characterId, { key: randomUUID(), expectedRevision: options.expectedRevision, type: options.eventType, payload: options.payload }, character => options.masterOnly ? character.masterId === actorId : character.ownerId === actorId, character => {
    if (character.status === 'ARCHIVED' || character.status === 'DISABLED' || (!options.masterOnly && character.status !== 'DRAFT')) throw new CharacterCommandError(409, 'A ficha não permite esta alteração.')
    if (!options.masterOnly && character.characterType !== 'PLAYER_VAMPIRE') throw new CharacterCommandError(422, 'A escolha exige uma ficha de vampiro jogador.')
    if (!options.masterOnly && isDev && data.predatorTypeCode) {
      const definition = PREDATOR_TYPE_BY_CODE.get(data.predatorTypeCode as PredatorTypeCode)
      const settings = character.campaignId ? memorySettings().get(character.campaignId) ?? defaultSettings() : defaultSettings(true)
      if (!definition || !isPredatorTypeEnabled(definition.code, settings)) throw new CharacterCommandError(422, 'Tipo de predação não permitido pela configuração atual.')
      const report = validatePredatorType(definition, { clan: characterText(character.data.cla) || null, bloodPotency: Number(character.data['potencia-de-sangue'] ?? 0), isThinBlood: character.data.creationType === 'THIN_BLOOD' || character.data.isThinBlood === true, enabled: true, overrides: campaignPredatorOverrides(character.campaignId) })
      if (!report.valid) throw new CharacterCommandError(422, 'A ficha possui restrições para este tipo de predação.')
    }
    const projected = structuredClone(character.data)
    const fields = options.masterOnly ? ['predatorTypeOverrides'] : ['predador', 'predatorTypeCode', 'predatorTypeSelection', 'predatorTypeBaseHumanity', 'predatorTypeBaseBloodPotency', 'predatorTypeRelationshipRequirements', 'humanidade', 'potencia-de-sangue']
    for (const field of fields) {
      if (Object.hasOwn(data, field)) projected[field] = structuredClone(data[field])
      else delete projected[field]
    }
    const canonicalHumanity = readSessionState(character.data, character.gameState).humanity
    if (options.masterOnly) projected.humanidade = canonicalHumanity
    else if (projected.predatorTypeSelection) {
      const selection = projected.predatorTypeSelection as PredatorTypeSelection
      const definition = PREDATOR_TYPE_BY_CODE.get(selection.code)
      if (!definition) throw new CharacterCommandError(422, 'Tipo de predação inválido.')
      Object.assign(projected, applyPredatorTypeSelection({ ...character.data, humanidade: canonicalHumanity }, definition, selection).data)
    } else if (character.data.predatorTypeSelection) {
      projected.humanidade = removePredatorTypeSelection({ ...character.data, humanidade: canonicalHumanity }).humanidade
    }
    character.data = applySecondaryAttributes(projected, projected)
    if (!options.masterOnly) applyPredatorEffects(character)
    if (!Number.isSafeInteger(character.data.humanidade) || Number(character.data.humanidade) < 0 || Number(character.data.humanidade) > 10) throw new CharacterCommandError(422, 'Humanidade inválida.')
    if (options.masterOnly) character.status = 'DRAFT'
    if (character.gameState.humanity !== undefined) character.gameState.humanity = character.data.humanidade
    return { ok: true, derived: { humanidade: character.data.humanidade, bloodPotency: character.data['potencia-de-sangue'] } }
  })
}
