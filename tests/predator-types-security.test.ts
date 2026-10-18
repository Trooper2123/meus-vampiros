import { beforeEach, describe, expect, it, vi } from 'vitest'
import { devCreateCampaign, devCreateCharacter } from '@/lib/dev-db'
import { getPredatorTypeSettings, isPredatorTypeEnabled, persistPredatorTypeData, sanitizePredatorTypeSettings, savePredatorTypeSettings } from '@/lib/predator-types'
import { PREDATOR_TYPES } from '@/lib/vtm-v5/predator-types'

const settings = { enabledSources: ['COREBOOK'] as ['COREBOOK'], enabledCodes: null, disabledCodes: [] }

describe('segurança dos serviços de predação em memória real', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('DATABASE_URL', '')
    global.__devDb = undefined
    global.__predatorTypeSettings?.clear()
  })

  const campaign = (masterUserId = 'master') => devCreateCampaign(masterUserId, { name: 'Mesa', theme: null, principios: null, averageXp: 0, status: 'Ativa', lastSessionAt: null })
  const operation = { expectedRevision: 0, eventType: 'PREDATOR_TYPE_APPLIED', payload: { code: 'SIREN' } }

  it('mantém suplementos desativados por padrão, inclusive sem mesa', async () => {
    const independent = await getPredatorTypeSettings(null)
    expect(independent.enabledSources).toEqual(['COREBOOK'])
    expect(PREDATOR_TYPES.filter(entry => isPredatorTypeEnabled(entry.code, independent))).toHaveLength(10)
    independent.enabledSources.length = 0
    expect((await getPredatorTypeSettings(null)).enabledSources).toHaveLength(1)
    const linked = await getPredatorTypeSettings(campaign().id)
    expect(isPredatorTypeEnabled('BUSINESS_OWNER', linked)).toBe(false)
    expect(isPredatorTypeEnabled('SIREN', linked)).toBe(true)
  })

  it('recusa material comunitário sem habilitação e permite escolha explícita do Narrador', async () => {
    const character = devCreateCharacter('owner', { data: { humanidade: 7 } })
    const data = { ...character.data, predatorTypeCode: 'BUSINESS_OWNER', predador: 'Business Owner' }
    await expect(persistPredatorTypeData(character.id, data, 'owner', operation)).rejects.toMatchObject({ status: 422 })
    character.campaignId = campaign().id
    await expect(persistPredatorTypeData(character.id, data, 'owner', operation)).rejects.toMatchObject({ status: 422 })
    await savePredatorTypeSettings(character.campaignId!, { ...settings, enabledCodes: ['BUSINESS_OWNER'] }, 'master')
    await persistPredatorTypeData(character.id, data, 'owner', operation)
    expect(character.data.predatorTypeCode).toBe('BUSINESS_OWNER')
    expect(character.revision).toBe(1)
  })

  it.each([[], {}, { ...settings, enabledSources: ['INVALID'] }, { ...settings, enabledCodes: ['INVALID'] }, { ...settings, disabledCodes: [1] }, { ...settings, masterOverride: true }])('rejeita configurações inválidas sem normalização permissiva: %j', input => {
    expect(sanitizePredatorTypeSettings(input)).toBeNull()
  })

  it('autoriza somente o Narrador atual e isola referências de configuração', async () => {
    const mesa = campaign()
    await expect(savePredatorTypeSettings(mesa.id, settings, 'player')).rejects.toMatchObject({ status: 403 })
    const saved = await savePredatorTypeSettings(mesa.id, settings, 'master')
    saved.disabledCodes.push('SIREN')
    const read = await getPredatorTypeSettings(mesa.id)
    expect(read.disabledCodes).toEqual([])
    read.disabledCodes.push('BAGGER')
    expect((await getPredatorTypeSettings(mesa.id)).disabledCodes).toEqual([])
    const stored = global.__devDb!.campaigns.find(entry => entry.id === mesa.id)!
    stored.masterUserId = 'other'
    await expect(savePredatorTypeSettings(mesa.id, settings, 'master')).rejects.toMatchObject({ status: 403 })
  })

  it('protege propriedade, revisão, campos econômicos e auditoria atômica', async () => {
    const character = devCreateCharacter('owner', { data: { humanidade: 7, fome: 3, segredo: 'preservado' } })
    const data = { ...character.data, predador: 'Siren', predatorTypeCode: 'SIREN', humanidade: 8, 'experiencia-total': 999, narratorNotes: 'forjado' }
    await expect(persistPredatorTypeData(character.id, data, 'other', operation)).rejects.toMatchObject({ status: 403 })
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
    await persistPredatorTypeData(character.id, data, 'owner', operation)
    expect(character).toMatchObject({ revision: 1, totalXp: 0, data: { humanidade: 8, fome: 3, segredo: 'preservado', predatorTypeCode: 'SIREN' } })
    expect(character.data).not.toHaveProperty('narratorNotes')
    expect(character.data).not.toHaveProperty('experiencia-total')
    expect(global.__devDb!.characterLedgerEvents.filter(entry => entry.characterId === character.id)).toHaveLength(1)
    await expect(persistPredatorTypeData(character.id, data, 'owner', operation)).rejects.toMatchObject({ status: 409 })
    expect(global.__devDb!.characterLedgerEvents.filter(entry => entry.characterId === character.id)).toHaveLength(1)
  })

  it('reverifica o status dentro da gravação e preserva estado em rejeição', async () => {
    const character = devCreateCharacter('owner', {})
    character.status = 'APPROVED'
    await expect(persistPredatorTypeData(character.id, { predador: 'Siren' }, 'owner', operation)).rejects.toMatchObject({ status: 409 })
    expect(character.revision).toBe(0)
    expect(character.data).toEqual({})
  })

  it('override só pode ser gravado pelo Narrador atual e invalida aprovação', async () => {
    const mesa = campaign()
    const character = devCreateCharacter('owner', { campaignId: mesa.id, data: { humanidade: 7 } })
    character.status = 'APPROVED'
    const input = { predatorTypeOverrides: [{ ruleCode: 'PREDATOR_BAGGER_VENTRUE' }], humanidade: 0 }
    const override = { ...operation, masterOnly: true, eventType: 'PREDATOR_TYPE_OVERRIDE_CREATED' }
    await expect(persistPredatorTypeData(character.id, input, 'owner', override)).rejects.toMatchObject({ status: 403 })
    await persistPredatorTypeData(character.id, input, 'master', override)
    expect(character.status).toBe('DRAFT')
    expect(character.data.humanidade).toBe(7)
    expect(character.data.predatorTypeOverrides).toEqual(input.predatorTypeOverrides)
  })

  it('alterar configuração invalida aprovação e audita fichas afetadas atomicamente', async () => {
    const mesa = campaign()
    const character = devCreateCharacter('owner', { campaignId: mesa.id, data: { predatorTypeCode: 'SIREN' } })
    character.status = 'APPROVED'
    character.validationReport = { valid: true }
    const other = devCreateCharacter('owner', { data: { predatorTypeCode: 'SIREN' } })
    other.status = 'APPROVED'
    await savePredatorTypeSettings(mesa.id, { ...settings, disabledCodes: ['SIREN'] }, 'master')
    expect(character).toMatchObject({ status: 'DRAFT', revision: 1 })
    expect(character.validationReport).toBeUndefined()
    expect(other).toMatchObject({ status: 'APPROVED', revision: 0 })
    expect(global.__devDb!.characterLedgerEvents.filter(event => event.characterId === character.id)).toHaveLength(1)
  })

  it('recusa seleção preparada antes de uma mudança de política da mesa', async () => {
    const mesa = campaign()
    const character = devCreateCharacter('owner', { campaignId: mesa.id })
    await savePredatorTypeSettings(mesa.id, { ...settings, disabledCodes: ['SIREN'] }, 'master')
    await expect(persistPredatorTypeData(character.id, { predatorTypeCode: 'SIREN' }, 'owner', operation)).rejects.toMatchObject({ status: 422 })
    expect(character.revision).toBe(0)
    expect(character.data).toEqual({})
  })
})
