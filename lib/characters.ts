import { characterText } from '@/lib/vtm-v5/text'
import type { DisciplineAcquisition } from './vtm-v5/discipline-access'
import { xpAcquisitions, validateDisciplineAllocation } from './discipline-allocation'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { CREATION_ADJUSTMENTS } from '@/lib/vtm-v5/presets'
import type { CharacterVisibility, CreationType } from '@/lib/vtm-v5/types'
import { applySecondaryAttributes } from '@/lib/vtm-v5/secondary-attributes'
import { projectIndependentCharacter } from '@/lib/character-duplicate'
import { getCommandCharacter, runCharacterCommand, CharacterCommandError, type CommandCharacter } from '@/lib/character-commands'
import { randomUUID } from 'node:crypto'
import { readSessionState, type SessionState } from '@/lib/vtm-v5/session-state'
import { mergeCharacterSkills } from '@/lib/vtm-v5/skills'
import { creationEffects, validateCreationEffects, type CreationEffect } from '@/lib/creation-effects'
import { characterSpecialties } from '@/lib/character-specialties'
import { assertBloodPotencyInput } from './character-blood-potency'
import { validateInvitedClan } from './campaign-invitations'
import { projectCreationGrants } from './vtm-v5/creation-grants'
import type { Specialty } from '@/lib/vtm-v5/specialties'


/**
 * Converte o formato legado de disciplinas (objeto nomeado) para o formato atual (array).
 * Fichas criadas antes da refatoração do item 7 do plano armazenam disciplinas como:
 *   { 'Animalismo': { level: 2, powers: [...] }, ... }
 * O novo formato esperado pelo frontend é:
 *   [{ id: 'disciplina-1', name: 'Animalismo', level: 2, powers: [...] }]
 * Esta função é idempotente — se já for um array, retorna sem modificar.
 */
export function normalizeDisciplines(data: Record<string, unknown>): Record<string, unknown> {
  const raw = data['disciplinas']
  if (!raw || Array.isArray(raw)) return data
  if (typeof raw !== 'object') return data

  const legacyObj = raw as Record<string, unknown>
  const converted = Object.entries(legacyObj).map(([name, val], index) => {
    const entry = (typeof val === 'object' && val !== null ? val : {}) as Record<string, unknown>
    return {
      id: `compat-${index + 1}-${name.toLowerCase().replace(/\s+/g, '-')}`,
      name,
      level: typeof entry['level'] === 'number' ? entry['level'] : 0,
      powers: Array.isArray(entry['powers']) ? entry['powers'] : [],
    }
  })

  return { ...data, disciplinas: converted }
}

export type CharacterSummary = {
  id: string
  characterType?: string
  name: string
  concept: string | null
  clan: string | null
  generation: string | null
  status: string
  updatedAt: string
  campaignId: string | null
  campaignName: string | null
  campaignTheme: string | null
  campaignPrincipios: string | null
  spentXp: string | null
  totalXp: string | null
}

export async function getCharactersForUser(userId: string): Promise<CharacterSummary[]> {

  const result = await db.execute<{
    id: string
    name: string
    concept: string | null
    clan: string | null
    generation: string | null
    status: string
    character_type: string
    updated_at: Date
    campaign_id: string | null
    campaign_name: string | null
    campaign_theme: string | null
    campaign_principios: string | null
    spent_xp: string | null
    total_xp: string | null
  }>(sql`
    SELECT ch.id, ch.character_type, ch.name, ch.concept, ch.clan, ch.generation, ch.status, ch.updated_at,
           ch.campaign_id, c.name AS campaign_name, c.theme AS campaign_theme, c.principios AS campaign_principios,
           ch.spent_xp, ch.total_xp
    FROM characters ch
    LEFT JOIN campaigns c ON c.id = ch.campaign_id
    WHERE ch.user_id = ${userId}
    ORDER BY ch.updated_at DESC
  `)

  return result.rows.map((character) => ({
    id: character.id,
    characterType: character.character_type,
    name: character.name,
    concept: character.concept,
    clan: character.clan,
    generation: character.generation,
    status: character.status,
    updatedAt: new Date(character.updated_at).toISOString(),
    campaignId: character.campaign_id,
    campaignName: character.campaign_name,
    campaignTheme: character.campaign_theme,
    campaignPrincipios: character.campaign_principios,
    spentXp: character.spent_xp,
    totalXp: character.total_xp,
  }))
}

export async function getCharactersForCampaign(campaignId: string) {

  const result = await db.execute<{
    id: string
    name: string
    concept: string | null
    clan: string | null
    generation: string | null
    spent_xp: string | null
    total_xp: string | null
  }>(sql`
    SELECT id, name, concept, clan, generation, spent_xp, total_xp
    FROM characters
    WHERE campaign_id = ${campaignId}::uuid
    ORDER BY name ASC
  `)

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    concept: row.concept,
    clan: row.clan,
    generation: row.generation,
    status: 'Ativo',
    campaignId,
    spentXp: row.spent_xp ? Number.parseInt(row.spent_xp, 10) : 0,
    totalXp: row.total_xp ? Number.parseInt(row.total_xp, 10) : 0,
  }))
}

export async function updateCharacterXp(characterId: string, totalXp: number) {

  await db.execute(sql`
    UPDATE characters
    SET total_xp = ${totalXp}, updated_at = NOW()
    WHERE id = ${characterId}::uuid
  `)
  return { ok: true }
}

export async function getCharacterById(id: string, userId: string) {
  const result = await db.execute<{ id: string; name: string; status: string; character_type: string; data: unknown; campaign_id: string | null; total_xp: number; spent_xp: number; revision: number; game_state: Record<string, unknown> }>(sql`
    SELECT id, name, status, character_type, data, campaign_id, total_xp, spent_xp, revision, game_state FROM characters WHERE id = ${id}::uuid AND user_id = ${userId}
  `)
  const row = result.rows[0]
  if (!row) return null
  const normalizedData = normalizeDisciplines(
    (row.data && typeof row.data === 'object' ? row.data : {}) as Record<string, unknown>
  )
  const state: Partial<SessionState> = Object.keys(row.game_state ?? {}).length ? readSessionState(normalizedData, row.game_state) : {}
  return { creationGrants: projectCreationGrants(row.game_state ?? {}), id: row.id, name: row.name ?? '', status: row.status, characterType: row.character_type, revision: row.revision, data: { ...normalizedData, 'experiencia-total': row.total_xp, 'experiencia-gasta': row.spent_xp, ...(state.hunger !== undefined ? { fome: state.hunger } : {}), ...(state.humanity !== undefined ? { humanidade: state.humanity } : {}), ...(state.healthCurrent !== undefined ? { vitalidade: state.healthCurrent } : {}), ...(state.willpowerCurrent !== undefined ? { vontade: state.willpowerCurrent } : {}), ...(state.healthDamage ? { healthDamage: state.healthDamage, willpowerDamage: state.willpowerDamage } : {}) }, campaignId: row.campaign_id, campaign: null }
}

export async function getCharacterForViewer(id: string, viewerId: string) {
  const access = await getCommandCharacter(id)
  if (!access || (access.ownerId !== viewerId && access.masterId !== viewerId)) return null
  return getCharacterById(id, access.ownerId)
}

export async function getCharacterAccessRecord(id: string) {
  const character = await getCommandCharacter(id)
  return character ? { id: character.id, userId: character.ownerId, campaignId: character.campaignId, status: character.status, revision: character.revision, characterType: character.characterType, data: normalizeDisciplines(character.data), gameState: character.gameState, masterId: character.masterId } : null
}

export async function saveCharacterValidation(id: string, report: unknown) {
  await db.execute(sql`UPDATE characters SET validation_report = ${JSON.stringify(report)}::jsonb, validated_at = NOW() WHERE id = ${id}::uuid`)
}

export async function setCharacterStatus(id: string, status: string) {
  await db.execute(sql`UPDATE characters SET status = ${status}, updated_at = NOW() WHERE id = ${id}::uuid`)
}

export async function createCharacter(
  userId: string,
  payload: { name?: string; data?: Record<string, unknown>; campaignId?: string | null; visibility?: CharacterVisibility },
  resourceSource?: Record<string, unknown>,
  creationState?: { creationEffects: CreationEffect[]; specialties: Specialty[]; disciplineAcquisitions?: DisciplineAcquisition[] },
  policyConsent?: { campaignId: string; acceptedAt: string; acceptedBy: string }
) {
  const candidateData = normalizeDisciplines(payload.data ?? {})
  const allocationState: Record<string, unknown> = creationState ? structuredClone(creationState) : {}
  validateDisciplineAllocation({ data: candidateData, gameState: allocationState, campaignId: payload.campaignId ?? null, masterId: null, characterType: characterText(candidateData.characterType ?? 'PLAYER_VAMPIRE') })
  payload = { ...payload, data: candidateData }
  assertBloodPotencyInput(payload.data ?? {})
  payload = { ...payload, data: applySecondaryAttributes(payload.data ?? {}, resourceSource) }
  const initialXp = CREATION_ADJUSTMENTS[(payload.data?.creationType ?? 'FLEDGLING') as CreationType]?.initialXp ?? 0
  const initialState = { ...readSessionState(payload.data ?? {}, resourceSource ? { healthDamage: resourceSource.healthDamage, willpowerDamage: resourceSource.willpowerDamage } : {}), ...allocationState, ...(policyConsent ? { policyConsent } : {}) }
  const { name, data, campaignId } = payload
  const result = await db.execute<{ id: string }>(sql`
    INSERT INTO characters (user_id, created_by_user_id, character_type, name, concept, clan, generation, data, game_state, total_xp, campaign_id, status, visibility)
    VALUES (${userId}, ${userId}, ${data?.characterType ?? 'PLAYER_VAMPIRE'}, ${name}, ${data?.conceito ?? null}, ${data?.cla ?? null}, ${data?.geracao ?? null}, ${JSON.stringify(data ?? {})}::jsonb, ${JSON.stringify((data?.characterType ?? 'PLAYER_VAMPIRE') === 'PLAYER_VAMPIRE' ? initialState : {})}::jsonb, ${(data?.characterType ?? 'PLAYER_VAMPIRE') === 'PLAYER_VAMPIRE' ? initialXp : 0}, ${campaignId ?? null}::uuid, 'DRAFT', ${payload.visibility ?? 'PLAYER_VISIBLE'})
    RETURNING id
  `)
  const id = result.rows[0]?.id
  if (id) {
    const creationType = (data?.creationType ?? 'FLEDGLING') as CreationType
    const adjustment = CREATION_ADJUSTMENTS[creationType] ?? CREATION_ADJUSTMENTS.FLEDGLING
    await appendCharacterLedgerEvent(id, 'INITIAL_ADJUSTMENT', 'RULE_ENGINE', { creationType, ...adjustment, secondaryAttributes: data?.secondaryAttributes }, userId)
  }
  return { id }
}

export async function appendCharacterLedgerEvent(characterId: string, eventType: string, origin: string, payload: Record<string, unknown>, createdByUserId: string) {
  await db.execute(sql`
    INSERT INTO character_ledger_events (character_id, event_type, origin, payload, created_by_user_id)
    VALUES (${characterId}::uuid, ${eventType}, ${origin}, ${JSON.stringify(payload)}::jsonb, ${createdByUserId})
  `)
  return { ok: true }
}

export async function updateCharacterStatus(id: string, userId: string, status: string) {

  await db.execute(sql`
    UPDATE characters
    SET status = ${status}, updated_at = NOW()
    WHERE id = ${id}::uuid AND user_id = ${userId}
  `)
  return { ok: true }
}

export async function deleteCharacter(id: string, userId: string) {

  await db.execute(sql`
    DELETE FROM characters WHERE id = ${id}::uuid AND user_id = ${userId}
  `)
  return { ok: true }
}

export async function updateCharacter(
  id: string,
  userId: string,
  payload: { name?: string; data?: Record<string, unknown>; campaignId?: string | null; expectedRevision?: number }
) {
  const previous = await getCharacterById(id, userId)
  if (!previous) return null
  return runCharacterCommand(userId, id, { key: randomUUID(), type: 'CHARACTER_EDITED', expectedRevision: payload.expectedRevision ?? previous.revision, payload }, character => character.ownerId === userId, async character => {
    if (['ARCHIVED', 'DISABLED'].includes(character.status)) throw new CharacterCommandError(409, 'Esta ficha precisa ser reativada pelo Narrador antes da edição.')
    if (payload.campaignId !== undefined && payload.campaignId !== character.campaignId) throw new CharacterCommandError(409, 'A alteração do vínculo exige aprovação da mesa.')
    if (payload.data) await applyCharacterDataEdit(character, payload.data)
    if (payload.name !== undefined) {
      character.name = payload.name
      if ('nome' in character.data) character.data.nome = payload.name
    }
    character.characterType = characterText(character.data.characterType ?? character.characterType)
    return { ok: true, status: character.status }
  })
}

export async function duplicateCharacter(id: string, userId: string) {
  const original = await getCharacterById(id, userId)
  if (original?.characterType !== 'PLAYER_VAMPIRE') return null
  const data = projectIndependentCharacter(original.data as Record<string, unknown>)
  const source = await getCommandCharacter(id)
  if (source?.ownerId !== userId) return null
  const effects = creationEffects(source).map(({ origin, kind, id: effectId, disciplineId, name, dots, baseDots }) => ({ origin, kind, id: effectId, disciplineId, name, dots, baseDots }))
  for (const field of ['disciplinas', 'vantagens', 'defeitos']) {
    const originals = Array.isArray(source.data[field]) ? source.data[field] as Record<string, unknown>[] : []
    const copies = Array.isArray(data[field]) ? data[field] as Record<string, unknown>[] : []
    copies.forEach((row, index) => { if (effects.some(effect => effect.id === originals[index]?.id)) row.id = originals[index].id })
  }
  for (const field of ['clanCode', 'clanRulesVersion', 'predatorDisciplineBonus', 'predatorEffectsVersion', 'creationAdvantageDots', 'creationFlawDots']) if (source.data[field] !== undefined) data[field] = structuredClone(source.data[field])
  if (source.data.clanSelection) data.clanSelection = structuredClone(source.data.clanSelection)
  const specialties = characterSpecialties(source).filter(entry => entry.origin === 'PREDATOR').map(({ id: specialtyId, skillId, name, origin, grantId }) => ({ id: specialtyId, skillId, name, origin, grantId, status: 'APPROVED' as const, costXp: 0 }))
  return createCharacter(userId, { name: `${original.name} — Cópia`, campaignId: null, data }, data, { creationEffects: effects, specialties, disciplineAcquisitions: xpAcquisitions(source).map(({ id: acquisitionId, disciplineId, source: acquisitionSource, fromLevel, targetLevel, xpCost }) => ({ id: acquisitionId, disciplineId, source: acquisitionSource, fromLevel, targetLevel, xpCost })) })
}

async function applyCharacterDataEdit(character: CommandCharacter, incoming: Record<string, unknown>) {
  const mechanicalFields = new Set(['forca', 'destreza', 'vigor', 'carisma', 'manipulacao', 'compostura', 'inteligencia', 'raciocinio', 'determinacao', 'cla', 'geracao', 'characterType', 'creationType', 'disciplinas', 'vantagens', 'defeitos', 'retainer', 'npc', 'potencia-de-sangue', 'isCaitiff', 'isThinBlood'])

  await assertEditableCharacterFields(incoming,character)
  const changedMechanics = Object.entries(incoming).some(([field, value]) => (mechanicalFields.has(field) || /^habilidade-/iu.test(field) || field.startsWith('convicoes-')) && JSON.stringify(value) !== JSON.stringify(character.data[field]))
  if (changedMechanics && character.status !== 'DRAFT') character.status = 'DRAFT'
  let mergedData: Record<string, unknown>
  try { mergedData = mergeCharacterSkills(character.data, incoming) }
  catch { throw new CharacterCommandError(422, 'Habilidades ou pontos inválidos.') }
  character.data = applySecondaryAttributes(mergedData, character.data)
  if (!character.campaignId) {
    character.gameState.creationEffects = creationEffects(character).filter(effect => effect.kind !== 'DISCIPLINE' || effect.origin !== 'CLAN')
    character.gameState.disciplineAcquisitions = xpAcquisitions(character).filter(entry => entry.source !== 'CLAN')
  }
  validateCreationEffects(character)
  validateDisciplineAllocation(character)
  delete character.data['experiencia-total']
  delete character.data['experiencia-gasta']
}

async function assertEditableCharacterFields(incoming: Record<string,unknown>,character: CommandCharacter) {
if(incoming.characterType!==undefined&&incoming.characterType!==character.characterType) throw new CharacterCommandError(422,'O tipo da ficha não pode ser alterado.')
for(const field of ['gameState','disciplineAccessGrants','disciplineAcquisitions']) if(Object.hasOwn(incoming,field)) throw new CharacterCommandError(422,'Autorizações e aquisições exigem o comando específico.')
assertBloodPotencyInput(incoming,character.data)
if(character.campaignId) await validateInvitedClan(character.campaignId,incoming)
if(character.data.clanRulesVersion||character.data.predatorEffectsVersion) {
for(const field of ['cla','clanCode','clanSelection','clanRulesVersion','isCaitiff','isThinBlood','creationType','creationAdvantageDots','creationFlawDots']) {
if(Object.hasOwn(incoming,field)&&JSON.stringify(incoming[field])!==JSON.stringify(character.data[field])) throw new CharacterCommandError(422,'Altere o clã pelo seletor específico, não pela edição geral.')
}
}
}
