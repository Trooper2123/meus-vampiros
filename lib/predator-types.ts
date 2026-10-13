import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applySecondaryAttributes } from '@/lib/vtm-v5/secondary-attributes'
import { PREDATOR_TYPE_BY_CODE, PREDATOR_TYPE_CODES, PREDATOR_TYPE_SOURCES, normalizePredatorType, type PredatorTypeCode, type PredatorTypeSettings, type PredatorTypeSource } from '@/lib/vtm-v5/predator-types'

const isDev = process.env.NODE_ENV !== 'production' && !process.env.DATABASE_URL
const defaultSettings = (): PredatorTypeSettings => ({ enabledSources: ['COREBOOK'], enabledCodes: null, disabledCodes: [] })

declare global {
   
  var __predatorTypeSettings: Map<string, PredatorTypeSettings> | undefined
}

const memorySettings = globalThis.__predatorTypeSettings ?? new Map<string, PredatorTypeSettings>()
globalThis.__predatorTypeSettings = memorySettings

export function sanitizePredatorTypeSettings(input: unknown): PredatorTypeSettings | null {
  if (!input || typeof input !== 'object') return null
  const value = input as Record<string, unknown>
  const enabledSources = Array.isArray(value.enabledSources) ? value.enabledSources.filter((entry): entry is PredatorTypeSource => typeof entry === 'string' && PREDATOR_TYPE_SOURCES.includes(entry as PredatorTypeSource)) : []
  const enabledCodes = value.enabledCodes === null ? null : Array.isArray(value.enabledCodes) ? value.enabledCodes.filter((entry): entry is PredatorTypeCode => typeof entry === 'string' && PREDATOR_TYPE_CODES.includes(entry as PredatorTypeCode)) : null
  const disabledCodes = Array.isArray(value.disabledCodes) ? value.disabledCodes.filter((entry): entry is PredatorTypeCode => typeof entry === 'string' && PREDATOR_TYPE_CODES.includes(entry as PredatorTypeCode)) : []
  if (!enabledSources.includes('COREBOOK')) enabledSources.unshift('COREBOOK')
  return { enabledSources: [...new Set(enabledSources)], enabledCodes: enabledCodes ? [...new Set(enabledCodes)] : null, disabledCodes: [...new Set(disabledCodes)] }
}

export async function getPredatorTypeSettings(campaignId: string | null): Promise<PredatorTypeSettings> {
  if (!campaignId) return defaultSettings()
  if (isDev) return memorySettings.get(campaignId) ?? defaultSettings()
  const result = await db.execute<{ enabled_sources: PredatorTypeSource[]; enabled_codes: PredatorTypeCode[] | null; disabled_codes: PredatorTypeCode[] }>(sql`
    SELECT enabled_sources, enabled_codes, disabled_codes FROM campaign_predator_type_settings WHERE campaign_id = ${campaignId}::uuid
  `)
  const row = result.rows[0]
  return row ? { enabledSources: row.enabled_sources, enabledCodes: row.enabled_codes, disabledCodes: row.disabled_codes } : defaultSettings()
}

export async function savePredatorTypeSettings(campaignId: string, settings: PredatorTypeSettings, userId: string) {
  if (isDev) {
    memorySettings.set(campaignId, settings)
    return settings
  }
  await db.execute(sql`
    INSERT INTO campaign_predator_type_settings (campaign_id, enabled_sources, enabled_codes, disabled_codes, updated_by_user_id)
    VALUES (${campaignId}::uuid, ${JSON.stringify(settings.enabledSources)}::jsonb, ${settings.enabledCodes ? JSON.stringify(settings.enabledCodes) : null}::jsonb, ${JSON.stringify(settings.disabledCodes)}::jsonb, ${userId})
    ON CONFLICT (campaign_id) DO UPDATE SET enabled_sources = EXCLUDED.enabled_sources, enabled_codes = EXCLUDED.enabled_codes, disabled_codes = EXCLUDED.disabled_codes, updated_by_user_id = EXCLUDED.updated_by_user_id, updated_at = now()
  `)
  return settings
}

export function isPredatorTypeEnabled(code: PredatorTypeCode, settings: PredatorTypeSettings): boolean {
  const definition = PREDATOR_TYPE_BY_CODE.get(code)
  if (!definition || settings.disabledCodes.includes(code)) return false
  if (settings.enabledCodes?.includes(code)) return true
  return settings.enabledSources.includes(definition.source)
}

export async function persistPredatorTypeData(characterId: string, data: Record<string, unknown>) {
  data = applySecondaryAttributes(data, data)
  if (isDev) {
    const character = globalThis.__devDb?.characters.find((entry) => entry.id === characterId)
    if (character) { character.data = data; character.updatedAt = new Date() }
    return Boolean(character)
  }
  const result = await db.execute<{ id: string }>(sql`UPDATE characters SET data = ${JSON.stringify(data)}::jsonb, updated_at = now() WHERE id = ${characterId}::uuid RETURNING id`)
  return Boolean(result.rows[0])
}

export async function backfillLegacyPredatorTypes() {
  if (isDev) {
    let migrated = 0
    let unknown = 0
    for (const character of globalThis.__devDb?.characters ?? []) {
      if (character.data.predatorTypeCode) continue
      const legacy = character.data.predador
      const code = normalizePredatorType(legacy)
      if (code) { character.data.predatorTypeCode = code; migrated += 1 }
      else if (legacy) unknown += 1
    }
    return { migrated, unknown }
  }
  const result = await db.execute<{ id: string; data: Record<string, unknown> }>(sql`SELECT id, data FROM characters WHERE data ? 'predador' AND NOT data ? 'predatorTypeCode'`)
  let migrated = 0
  let unknown = 0
  for (const row of result.rows) {
    const code = normalizePredatorType(row.data.predador)
    if (!code) { unknown += 1; continue }
    await persistPredatorTypeData(row.id, { ...row.data, predatorTypeCode: code })
    migrated += 1
  }
  return { migrated, unknown }
}
