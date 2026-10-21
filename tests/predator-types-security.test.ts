import { beforeEach, describe, expect, it } from 'vitest'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { createTestCampaign, createTestCharacter, preparePostgresTest } from './postgres-test-helpers'
import { getPredatorTypeSettings, isPredatorTypeEnabled, persistPredatorTypeData, sanitizePredatorTypeSettings, savePredatorTypeSettings } from '@/lib/predator-types'
import { PREDATOR_TYPES } from '@/lib/vtm-v5/predator-types'

const settings = { enabledSources: ['COREBOOK'] as ['COREBOOK'], enabledCodes: null, disabledCodes: [] }
const operation = { expectedRevision: 0, eventType: 'PREDATOR_TYPE_APPLIED', payload: { code: 'SIREN' } }

async function readCharacter(id: string) {
  const result = await db.execute<{ data: Record<string, unknown>; status: string; revision: number; total_xp: number; validation_report: unknown }>(sql`SELECT data, status, revision, total_xp, validation_report FROM characters WHERE id = ${id}::uuid`)
  return result.rows[0]
}

async function ledgerCount(id: string) {
  const result = await db.execute<{ count: number }>(sql`SELECT count(*)::int AS count FROM character_ledger_events WHERE character_id = ${id}::uuid`)
  return result.rows[0].count
}

describe('segurança dos serviços de predação no PostgreSQL', () => {
  beforeEach(preparePostgresTest)

  it('mantém suplementos desativados por padrão, inclusive sem mesa', async () => {
    const independent = await getPredatorTypeSettings(null)
    expect(independent.enabledSources).toEqual(['COREBOOK'])
    expect(PREDATOR_TYPES.filter(entry => isPredatorTypeEnabled(entry.code, independent))).toHaveLength(10)
    independent.enabledSources.length = 0
    expect((await getPredatorTypeSettings(null)).enabledSources).toHaveLength(1)
    const campaign = await createTestCampaign('test|settings-master')
    const linked = await getPredatorTypeSettings(campaign.id)
    expect(isPredatorTypeEnabled('BUSINESS_OWNER', linked)).toBe(false)
    expect(isPredatorTypeEnabled('SIREN', linked)).toBe(true)
  })

  it('recusa material comunitário sem habilitação e permite escolha explícita do Narrador', async () => {
    const character = await createTestCharacter('test|predator-owner', null, 'Ficha', { humanidade: 7 })
    const data = { humanidade: 7, predatorTypeCode: 'BUSINESS_OWNER', predador: 'Business Owner' }
    await expect(persistPredatorTypeData(character.id, data, 'test|predator-owner', operation)).rejects.toMatchObject({ status: 422 })
    const campaign = await createTestCampaign('test|predator-master')
    await db.execute(sql`UPDATE characters SET campaign_id = ${campaign.id}::uuid WHERE id = ${character.id}::uuid`)
    await expect(persistPredatorTypeData(character.id, data, 'test|predator-owner', operation)).rejects.toMatchObject({ status: 422 })
    await savePredatorTypeSettings(campaign.id, { ...settings, enabledCodes: ['BUSINESS_OWNER'] }, 'test|predator-master')
    await persistPredatorTypeData(character.id, data, 'test|predator-owner', operation)
    expect((await readCharacter(character.id)).data.predatorTypeCode).toBe('BUSINESS_OWNER')
    expect((await readCharacter(character.id)).revision).toBe(1)
  })

  it.each([[], {}, { ...settings, enabledSources: ['INVALID'] }, { ...settings, enabledCodes: ['INVALID'] }, { ...settings, disabledCodes: [1] }, { ...settings, masterOverride: true }])('rejeita configurações inválidas: %j', input => {
    expect(sanitizePredatorTypeSettings(input)).toBeNull()
  })

  it('autoriza somente o Narrador atual e isola referências de configuração', async () => {
    const campaign = await createTestCampaign('test|settings-master')
    await expect(savePredatorTypeSettings(campaign.id, settings, 'test|player')).rejects.toMatchObject({ status: 403 })
    const saved = await savePredatorTypeSettings(campaign.id, settings, 'test|settings-master')
    saved.disabledCodes.push('SIREN')
    const read = await getPredatorTypeSettings(campaign.id)
    expect(read.disabledCodes).toEqual([])
    read.disabledCodes.push('BAGGER')
    expect((await getPredatorTypeSettings(campaign.id)).disabledCodes).toEqual([])
    await db.execute(sql`UPDATE campaigns SET master_user_id = 'test|new-master' WHERE id = ${campaign.id}::uuid`)
    await expect(savePredatorTypeSettings(campaign.id, settings, 'test|settings-master')).rejects.toMatchObject({ status: 403 })
  })

  it('protege propriedade, revisão, campos econômicos e auditoria atômica', async () => {
    const character = await createTestCharacter('test|predator-owner', null, 'Ficha', { humanidade: 7, fome: 3, segredo: 'preservado' })
    const data = { humanidade: 8, fome: 3, segredo: 'preservado', predador: 'Siren', predatorTypeCode: 'SIREN', 'experiencia-total': 999, narratorNotes: 'forjado' }
    await expect(persistPredatorTypeData(character.id, data, 'test|other', operation)).rejects.toMatchObject({ status: 403 })
    expect(await ledgerCount(character.id)).toBe(0)
    await persistPredatorTypeData(character.id, data, 'test|predator-owner', operation)
    const saved = await readCharacter(character.id)
    expect(saved).toMatchObject({ revision: 1, total_xp: 0, data: { humanidade: 8, fome: 3, segredo: 'preservado', predatorTypeCode: 'SIREN' } })
    expect(saved.data).not.toHaveProperty('narratorNotes')
    expect(saved.data).not.toHaveProperty('experiencia-total')
    expect(await ledgerCount(character.id)).toBe(1)
    await expect(persistPredatorTypeData(character.id, data, 'test|predator-owner', operation)).rejects.toMatchObject({ status: 409 })
    expect(await ledgerCount(character.id)).toBe(1)
  })

  it('reverifica o status na gravação e preserva estado quando rejeita', async () => {
    const character = await createTestCharacter('test|predator-owner', null, 'Ficha')
    await db.execute(sql`UPDATE characters SET status = 'APPROVED' WHERE id = ${character.id}::uuid`)
    await expect(persistPredatorTypeData(character.id, { predador: 'Siren' }, 'test|predator-owner', operation)).rejects.toMatchObject({ status: 409 })
    expect(await readCharacter(character.id)).toMatchObject({ revision: 0, data: {} })
  })

  it('override só pode ser gravado pelo Narrador atual e invalida aprovação', async () => {
    const campaign = await createTestCampaign('test|predator-master')
    const character = await createTestCharacter('test|predator-owner', campaign.id, 'Ficha', { humanidade: 7 })
    await db.execute(sql`UPDATE characters SET status = 'APPROVED' WHERE id = ${character.id}::uuid`)
    const input = { predatorTypeOverrides: [{ ruleCode: 'PREDATOR_BAGGER_VENTRUE' }], humanidade: 0 }
    const override = { ...operation, masterOnly: true, eventType: 'PREDATOR_TYPE_OVERRIDE_CREATED' }
    await expect(persistPredatorTypeData(character.id, input, 'test|predator-owner', override)).rejects.toMatchObject({ status: 403 })
    await persistPredatorTypeData(character.id, input, 'test|predator-master', override)
    expect(await readCharacter(character.id)).toMatchObject({ status: 'DRAFT', data: { humanidade: 7, predatorTypeOverrides: input.predatorTypeOverrides } })
  })

  it('alterar configuração invalida aprovação e audita apenas fichas afetadas', async () => {
    const campaign = await createTestCampaign('test|predator-master')
    const character = await createTestCharacter('test|predator-owner', campaign.id, 'Na mesa', { predatorTypeCode: 'SIREN' })
    const other = await createTestCharacter('test|predator-owner', null, 'Independente', { predatorTypeCode: 'SIREN' })
    await db.execute(sql`UPDATE characters SET status = 'APPROVED', validation_report = '{"valid":true}'::jsonb WHERE id IN (${character.id}::uuid, ${other.id}::uuid)`)
    await savePredatorTypeSettings(campaign.id, { ...settings, disabledCodes: ['SIREN'] }, 'test|predator-master')
    expect(await readCharacter(character.id)).toMatchObject({ status: 'DRAFT', revision: 1, validation_report: null })
    expect(await readCharacter(other.id)).toMatchObject({ status: 'APPROVED', revision: 0 })
    expect(await ledgerCount(character.id)).toBe(1)
  })

  it('recusa seleção preparada antes de uma mudança de política da mesa', async () => {
    const campaign = await createTestCampaign('test|predator-master')
    const character = await createTestCharacter('test|predator-owner', campaign.id, 'Ficha')
    await savePredatorTypeSettings(campaign.id, { ...settings, disabledCodes: ['SIREN'] }, 'test|predator-master')
    await expect(persistPredatorTypeData(character.id, { predatorTypeCode: 'SIREN' }, 'test|predator-owner', operation)).rejects.toMatchObject({ status: 422 })
    expect(await readCharacter(character.id)).toMatchObject({ revision: 0, data: {} })
  })
})
