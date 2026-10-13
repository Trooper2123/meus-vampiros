import { randomUUID } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({ db: null }))
import { devCreateCampaign, devCreateCharacter, devGetCharacterAccessRecord } from '@/lib/dev-db'
import { getChronicleAwakePanel, startChronicleNight, validateNightRequest, type NightRequest } from '@/lib/chronicle-nights'

function fixtures() {
  const campaign = devCreateCampaign('awake-master', { name: 'Mesa', theme: null, principios: null, averageXp: null, status: 'active', lastSessionAt: null })
  const character = devCreateCharacter('awake-player', { name: 'Vampiro', campaignId: campaign.id, data: { fome: 2, humanidade: 7, vigor: 2, determinacao: 2, compostura: 2 } })
  devGetCharacterAccessRecord(character.id)!.status = 'APPROVED'
  const input: NightRequest = { inGameDate: '1999-12-31', characterIds: [character.id], idempotencyKey: randomUUID(), confirmed: true }
  return { campaign, character: devGetCharacterAccessRecord(character.id)!, input }
}

describe('Awake atômico no provider em memória', () => {
  beforeEach(() => { global.__devDb = undefined; global.__chronicleNightMemory = undefined })

  it.each([1, 5, 6, 10])('resolve o limite do D10 %s sem alterar recursos não relacionados', async roll => {
    const { campaign, character, input } = fixtures()
    character.gameState = { healthDamage: { superficial: 1, aggravated: 1 }, healthCurrent: 3, willpowerDamage: { superficial: 1, aggravated: 0 }, willpowerCurrent: 3, stains: 2 }
    const night = await startChronicleNight('awake-master', campaign.id, input, { rollD10: () => [roll] })
    expect(night.results[0]).toMatchObject({ roll, outcome: roll < 6 ? 'AWAKENED_HUNGRIER' : 'AWAKENED', after: { hunger: roll < 6 ? 3 : 2, healthDamage: { superficial: 1, aggravated: 1 }, willpowerDamage: { superficial: 1, aggravated: 0 }, stains: 2 } })
    expect(character.gameState?.hunger).toBe(roll < 6 ? 3 : 2)
    expect(character.data.fome).toBe(roll < 6 ? 3 : 2)
    expect(character.revision).toBe(1)
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(1)
    expect((await getChronicleAwakePanel('awake-master', campaign.id)).characters[0].lastProcessedNight).toBe(1)
  })

  it('falha com Fome 5 causa torpor sem Fome 6', async () => {
    const { campaign, character, input } = fixtures()
    character.data.fome = 5
    const night = await startChronicleNight('awake-master', campaign.id, input, { rollD10: () => [1] })
    expect(night.results[0].after).toMatchObject({ hunger: 5, condition: 'TORPOR', torpor: { cause: 'HUNGER', startedAtNightId: night.id, humanityAtEntry: 7 } })
  })

  it('torpor não rola nem recupera automaticamente e preserva causa', async () => {
    const { campaign, character, input } = fixtures()
    character.gameState = { condition: 'TORPOR', torpor: { cause: 'DAMAGE', humanityAtEntry: 6 }, hunger: 4 }
    const rollD10 = vi.fn(() => [6])
    const night = await startChronicleNight('awake-master', campaign.id, input, { rollD10 })
    expect(rollD10).not.toHaveBeenCalled()
    expect(night.results[0]).toMatchObject({ roll: null, outcome: 'SKIPPED', after: { condition: 'TORPOR', hunger: 4, torpor: { cause: 'DAMAGE', humanityAtEntry: 6 } } })
  })

  it('empalado continua impedido de agir', async () => {
    const { campaign, character, input } = fixtures()
    character.gameState = { condition: 'STAKED' }
    const night = await startChronicleNight('awake-master', campaign.id, input, { rollD10: () => [6] })
    expect(night.results[0].after.condition).toBe('STAKED')
  })

  it('sono diurno pode despertar durante a noite sem outros testes', async () => {
    const { campaign, character, input } = fixtures()
    character.gameState = { condition: 'DAY_SLEEP' }
    const night = await startChronicleNight('awake-master', campaign.id, input, { rollD10: () => [6] })
    expect(night.results[0].after.condition).toBe('ACTIVE')
  })

  it('retry concorrente preserva resultado, rolagem, ledger e número da noite', async () => {
    const { campaign, character, input } = fixtures()
    const rollD10 = vi.fn(() => [1])
    const results = await Promise.all([startChronicleNight('awake-master', campaign.id, input, { rollD10 }), startChronicleNight('awake-master', campaign.id, input, { rollD10 })])
    expect(results[0]).toEqual(results[1])
    expect(rollD10).toHaveBeenCalledTimes(1)
    expect(character.gameState?.hunger).toBe(3)
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(1)
    expect((await getChronicleAwakePanel('awake-master', campaign.id)).nights).toHaveLength(1)
  })

  it('duas chaves novas na mesma data iniciam noites distintas em sequência', async () => {
    const { campaign, character, input } = fixtures()
    const nights = await Promise.all([startChronicleNight('awake-master', campaign.id, input, { rollD10: () => [1] }), startChronicleNight('awake-master', campaign.id, { ...input, idempotencyKey: randomUUID() }, { rollD10: () => [1] })])
    expect(nights.map(night => night.nightNumber)).toEqual([1, 2])
    expect(character.gameState?.hunger).toBe(4)
  })

  it('mesma chave com outro conteúdo é conflito sem rerrolar', async () => {
    const { campaign, input } = fixtures()
    const rollD10 = vi.fn(() => [6])
    await startChronicleNight('awake-master', campaign.id, input, { rollD10 })
    await expect(startChronicleNight('awake-master', campaign.id, { ...input, inGameDate: '2000-01-01' }, { rollD10 })).rejects.toMatchObject({ status: 409 })
    expect(rollD10).toHaveBeenCalledTimes(1)
  })

  it('valida toda seleção estrangeira antes de rolar e mantém não selecionados', async () => {
    const { campaign, character, input } = fixtures()
    const other = devCreateCharacter('other-player', { name: 'Outra mesa', data: {} })
    const rollD10 = vi.fn(() => [1])
    await expect(startChronicleNight('awake-master', campaign.id, { ...input, characterIds: [character.id, other.id] }, { rollD10 })).rejects.toMatchObject({ status: 403 })
    expect(rollD10).not.toHaveBeenCalled()
    expect(character.data.fome).toBe(2)
    expect((await getChronicleAwakePanel('awake-master', campaign.id)).nights).toHaveLength(0)
    await startChronicleNight('awake-master', campaign.id, input, { rollD10 })
    expect(devGetCharacterAccessRecord(other.id)?.gameState).toEqual({})
  })

  it.each(['DRAFT', 'DISABLED', 'ARCHIVED'])('recusa ficha %s antes de efeitos', async status => {
    const { campaign, character, input } = fixtures()
    character.status = status
    const rollD10 = vi.fn(() => [6])
    await expect(startChronicleNight('awake-master', campaign.id, input, { rollD10 })).rejects.toMatchObject({ status: 400 })
    expect(rollD10).not.toHaveBeenCalled()
  })

  it('recusa não vampiro e morto definitivo sem ressuscitar', async () => {
    const { campaign, character, input } = fixtures()
    character.characterType = 'HUMAN_NPC'
    await expect(startChronicleNight('awake-master', campaign.id, input)).rejects.toMatchObject({ status: 400 })
    character.characterType = 'PLAYER_VAMPIRE'
    character.gameState = { condition: 'FINAL_DEATH' }
    await expect(startChronicleNight('awake-master', campaign.id, input)).rejects.toMatchObject({ status: 400 })
    expect((await getChronicleAwakePanel('awake-master', campaign.id)).characters[0].eligible).toBe(false)
  })

  it('falha do provedor no meio do lote não publica nada nem aplica efeito', async () => {
    const { campaign, character, input } = fixtures()
    const second = devCreateCharacter('second-player', { name: 'Segundo', campaignId: campaign.id, data: { fome: 1 } })
    devGetCharacterAccessRecord(second.id)!.status = 'APPROVED'
    const rollD10 = vi.fn().mockReturnValueOnce([1]).mockImplementationOnce(() => { throw new Error('Falha no dado') })
    const selection = { ...input, characterIds: [character.id, second.id] }
    await expect(startChronicleNight('awake-master', campaign.id, selection, { rollD10 })).rejects.toThrow('Falha no dado')
    expect(character.data.fome).toBe(2)
    expect(devGetCharacterAccessRecord(second.id)?.data.fome).toBe(1)
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
    expect((await getChronicleAwakePanel('awake-master', campaign.id)).nights).toHaveLength(0)
    const retry = await startChronicleNight('awake-master', campaign.id, selection, { rollD10: () => [6] })
    expect(retry.nightNumber).toBe(1)
  })

  it.each([0, 11, 2.5])('recusa resultado de dado inválido %s sem publicar', async roll => {
    const { campaign, input } = fixtures()
    await expect(startChronicleNight('awake-master', campaign.id, input, { rollD10: () => [roll] })).rejects.toMatchObject({ status: 500 })
    expect((await getChronicleAwakePanel('awake-master', campaign.id)).nights).toHaveLength(0)
  })

  it('jogador, outro narrador e terceiro não consultam nem iniciam a noite', async () => {
    const { campaign, input } = fixtures()
    for (const actor of ['awake-player', 'other-master', 'stranger']) {
      await expect(startChronicleNight(actor, campaign.id, input)).rejects.toMatchObject({ status: 403 })
      await expect(getChronicleAwakePanel(actor, campaign.id)).rejects.toMatchObject({ status: 403 })
    }
  })

  it('valida datas reais, seleção única, confirmação e rejeita resultados enviados pelo cliente', () => {
    const { input } = fixtures()
    expect(validateNightRequest(input)).toBe(true)
    expect(validateNightRequest({ ...input, inGameDate: '2024-02-29' })).toBe(true)
    for (const invalid of [{ ...input, inGameDate: '2023-02-29' }, { ...input, inGameDate: '0000-01-01' }, { ...input, inGameDate: '2026-13-01' }, { ...input, characterIds: [] }, { ...input, characterIds: [...input.characterIds, ...input.characterIds] }, { ...input, confirmed: false }, { ...input, results: [10] }, { ...input, roll: 10 }]) expect(validateNightRequest(invalid)).toBe(false)
  })
})
