import { randomUUID } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { preparePostgresTest, createTestCampaign, createTestCharacter } from './postgres-test-helpers'
import { getChronicleAwakePanel, startChronicleNight, validateNightRequest, type NightRequest } from '@/lib/chronicle-nights'

async function fixtures() {
  preparePostgresTest()
  const campaign = await createTestCampaign('awake-master', 'Mesa')
  const character = await createTestCharacter('awake-player', campaign.id, 'Vampiro', { fome: 2, humanidade: 7, vigor: 2, determinacao: 2, compostura: 2 })
  await db.execute(sql`UPDATE characters SET status='APPROVED', character_type='PLAYER_VAMPIRE', game_state='{"hunger":2,"humanity":7,"condition":"ACTIVE"}'::jsonb WHERE id=${character.id}::uuid`)
  const input: NightRequest = { inGameDate: '1999-12-31', characterIds: [character.id], idempotencyKey: randomUUID(), confirmed: true }
  return { campaign, character, input }
}
const readCharacter = async (id: string) => (await db.execute(sql`SELECT data, game_state AS "gameState", status, character_type AS "characterType", revision FROM characters WHERE id=${id}::uuid`)).rows[0] as Record<string, any>
const setCharacter = (id: string, field: 'data' | 'game_state' | 'status' | 'character_type', value: unknown) => db.execute(sql`UPDATE characters SET ${sql.raw(field)}=${typeof value === 'object' && value !== null ? JSON.stringify(value) : value}${field === 'data' || field === 'game_state' ? sql.raw('::jsonb') : sql.raw('')} WHERE id=${id}::uuid`)
const ledger = async (id: string) => (await db.execute(sql`SELECT id FROM character_ledger_events WHERE character_id=${id}::uuid`)).rows

describe('Awake atômico no PostgreSQL isolado', () => {
  beforeEach(preparePostgresTest)

  it.each([1, 5, 6, 10])('resolve o limite do D10 %s sem alterar recursos não relacionados', async roll => {
    const { campaign, character, input } = await fixtures()
    await setCharacter(character.id, 'game_state', { hunger: 2, humanity: 7, condition: 'ACTIVE', healthDamage: { superficial: 1, aggravated: 1 }, healthCurrent: 3, willpowerDamage: { superficial: 1, aggravated: 0 }, willpowerCurrent: 3, stains: 2 })
    const night = await startChronicleNight('awake-master', campaign.id, input, { rollD10: () => [roll] })
    expect(night.results[0]).toMatchObject({ roll, outcome: roll < 6 ? 'AWAKENED_HUNGRIER' : 'AWAKENED', after: { hunger: roll < 6 ? 3 : 2, healthDamage: { superficial: 1, aggravated: 1 }, willpowerDamage: { superficial: 1, aggravated: 0 }, stains: 2 } })
    expect((await readCharacter(character.id)).gameState.hunger).toBe(roll < 6 ? 3 : 2)
    expect((await readCharacter(character.id)).data.fome).toBe(roll < 6 ? 3 : 2)
    expect((await readCharacter(character.id)).revision).toBe(1)
    expect(await ledger(character.id)).toHaveLength(1)
    expect((await getChronicleAwakePanel('awake-master', campaign.id)).characters[0].lastProcessedNight).toBe(1)
  })

  it('falha com Fome 5 causa torpor sem Fome 6', async () => {
    const { campaign, character, input } = await fixtures()
    await setCharacter(character.id, 'data', { fome: 5, humanidade: 7, vigor: 2, determinacao: 2, compostura: 2 })
    await setCharacter(character.id, 'game_state', { hunger: 5, humanity: 7, condition: 'ACTIVE' })
    const night = await startChronicleNight('awake-master', campaign.id, input, { rollD10: () => [1] })
    expect(night.results[0].after).toMatchObject({ hunger: 5, condition: 'TORPOR', torpor: { cause: 'HUNGER', startedAtNightId: night.id, humanityAtEntry: 7 } })
  })

  it('torpor não rola nem recupera automaticamente e preserva causa', async () => {
    const { campaign, character, input } = await fixtures()
    await setCharacter(character.id, 'game_state', { condition: 'TORPOR', torpor: { cause: 'DAMAGE', humanityAtEntry: 6 }, hunger: 4, humanity: 6 })
    const rollD10 = vi.fn(() => [6])
    const night = await startChronicleNight('awake-master', campaign.id, input, { rollD10 })
    expect(rollD10).not.toHaveBeenCalled()
    expect(night.results[0]).toMatchObject({ roll: null, outcome: 'SKIPPED', after: { condition: 'TORPOR', hunger: 4, torpor: { cause: 'DAMAGE', humanityAtEntry: 6 } } })
  })

  it('empalado continua impedido de agir', async () => {
    const { campaign, character, input } = await fixtures()
    await setCharacter(character.id, 'game_state', { hunger: 2, humanity: 7, condition: 'STAKED' })
    const night = await startChronicleNight('awake-master', campaign.id, input, { rollD10: () => [6] })
    expect(night.results[0].after.condition).toBe('STAKED')
  })

  it('sono diurno pode despertar durante a noite sem outros testes', async () => {
    const { campaign, character, input } = await fixtures()
    await setCharacter(character.id, 'game_state', { hunger: 2, humanity: 7, condition: 'DAY_SLEEP' })
    const night = await startChronicleNight('awake-master', campaign.id, input, { rollD10: () => [6] })
    expect(night.results[0].after.condition).toBe('ACTIVE')
  })

  it('retry concorrente preserva resultado, rolagem, ledger e número da noite', async () => {
    const { campaign, character, input } = await fixtures()
    const rollD10 = vi.fn(() => [1])
    const results = await Promise.all([startChronicleNight('awake-master', campaign.id, input, { rollD10 }), startChronicleNight('awake-master', campaign.id, input, { rollD10 })])
    expect(results[0]).toEqual(results[1])
    expect(rollD10).toHaveBeenCalledTimes(1)
    expect((await readCharacter(character.id)).gameState.hunger).toBe(3)
    expect(await ledger(character.id)).toHaveLength(1)
    expect((await getChronicleAwakePanel('awake-master', campaign.id)).nights).toHaveLength(1)
  })

  it('duas chaves novas na mesma data iniciam noites distintas em sequência', async () => {
    const { campaign, character, input } = await fixtures()
    const nights = await Promise.all([startChronicleNight('awake-master', campaign.id, input, { rollD10: () => [1] }), startChronicleNight('awake-master', campaign.id, { ...input, idempotencyKey: randomUUID() }, { rollD10: () => [1] })])
    expect(nights.map(night => night.nightNumber)).toEqual([1, 2])
    expect((await readCharacter(character.id)).gameState.hunger).toBe(4)
  })

  it('mesma chave com outro conteúdo é conflito sem rerrolar', async () => {
    const { campaign, input } = await fixtures()
    const rollD10 = vi.fn(() => [6])
    await startChronicleNight('awake-master', campaign.id, input, { rollD10 })
    await expect(startChronicleNight('awake-master', campaign.id, { ...input, inGameDate: '2000-01-01' }, { rollD10 })).rejects.toMatchObject({ status: 409 })
    expect(rollD10).toHaveBeenCalledTimes(1)
  })

  it('valida toda seleção estrangeira antes de rolar e mantém não selecionados', async () => {
    const { campaign, character, input } = await fixtures()
    const other = await createTestCharacter('other-player', null, 'Outra mesa', {})
    const rollD10 = vi.fn(() => [1])
    await expect(startChronicleNight('awake-master', campaign.id, { ...input, characterIds: [character.id, other.id] }, { rollD10 })).rejects.toMatchObject({ status: 403 })
    expect(rollD10).not.toHaveBeenCalled()
    expect((await readCharacter(character.id)).data.fome).toBe(2)
    expect((await getChronicleAwakePanel('awake-master', campaign.id)).nights).toHaveLength(0)
    await startChronicleNight('awake-master', campaign.id, input, { rollD10 })
    expect((await readCharacter(other.id)).gameState).toEqual({})
  })

  it.each(['DRAFT', 'DISABLED', 'ARCHIVED'])('recusa ficha %s antes de efeitos', async status => {
    const { campaign, character, input } = await fixtures()
    await setCharacter(character.id, 'status', status)
    const rollD10 = vi.fn(() => [6])
    await expect(startChronicleNight('awake-master', campaign.id, input, { rollD10 })).rejects.toMatchObject({ status: 400 })
    expect(rollD10).not.toHaveBeenCalled()
  })

  it('recusa não vampiro e morto definitivo sem ressuscitar', async () => {
    const { campaign, character, input } = await fixtures()
    await setCharacter(character.id, 'character_type', 'HUMAN_NPC')
    await expect(startChronicleNight('awake-master', campaign.id, input)).rejects.toMatchObject({ status: 400 })
    await setCharacter(character.id, 'character_type', 'PLAYER_VAMPIRE')
    await setCharacter(character.id, 'game_state', { hunger: 2, humanity: 7, condition: 'FINAL_DEATH' })
    await expect(startChronicleNight('awake-master', campaign.id, input)).rejects.toMatchObject({ status: 400 })
    expect((await getChronicleAwakePanel('awake-master', campaign.id)).characters[0].eligible).toBe(false)
  })

  it('falha do provedor no meio do lote não publica nada nem aplica efeito', async () => {
    const { campaign, character, input } = await fixtures()
    const second = await createTestCharacter('second-player', campaign.id, 'Segundo', { fome: 1 })
    await db.execute(sql`UPDATE characters SET status='APPROVED', character_type='PLAYER_VAMPIRE', game_state='{"hunger":1,"humanity":7,"condition":"ACTIVE"}'::jsonb WHERE id=${second.id}::uuid`)
    const rollD10 = vi.fn().mockReturnValueOnce([1]).mockImplementationOnce(() => { throw new Error('Falha no dado') })
    const selection = { ...input, characterIds: [character.id, second.id] }
    await expect(startChronicleNight('awake-master', campaign.id, selection, { rollD10 })).rejects.toThrow('Falha no dado')
    expect((await readCharacter(character.id)).data.fome).toBe(2)
    expect((await readCharacter(second.id)).data.fome).toBe(1)
    expect(await ledger(character.id)).toHaveLength(0)
    expect(await ledger(second.id)).toHaveLength(0)
    expect((await getChronicleAwakePanel('awake-master', campaign.id)).nights).toHaveLength(0)
    const retry = await startChronicleNight('awake-master', campaign.id, selection, { rollD10: () => [6] })
    expect(retry.nightNumber).toBe(1)
  })

  it.each([0, 11, 2.5])('recusa resultado de dado inválido %s sem publicar', async roll => {
    const { campaign, input } = await fixtures()
    await expect(startChronicleNight('awake-master', campaign.id, input, { rollD10: () => [roll] })).rejects.toThrow('O provedor de dados retornou resultados inválidos.')
    expect((await getChronicleAwakePanel('awake-master', campaign.id)).nights).toHaveLength(0)
  })

  it('jogador, outro narrador e terceiro não consultam nem iniciam a noite', async () => {
    const { campaign, input } = await fixtures()
    for (const actor of ['awake-player', 'other-master', 'stranger']) {
      await expect(startChronicleNight(actor, campaign.id, input)).rejects.toMatchObject({ status: 403 })
      await expect(getChronicleAwakePanel(actor, campaign.id)).rejects.toMatchObject({ status: 403 })
    }
  })

  it('valida datas reais, seleção única, confirmação e rejeita resultados enviados pelo cliente', () => {
    const input: NightRequest = { inGameDate: '1999-12-31', characterIds: [randomUUID()], idempotencyKey: randomUUID(), confirmed: true }
    expect(validateNightRequest(input)).toBe(true)
    expect(validateNightRequest({ ...input, inGameDate: '2024-02-29' })).toBe(true)
    for (const invalid of [{ ...input, inGameDate: '2023-02-29' }, { ...input, inGameDate: '0000-01-01' }, { ...input, inGameDate: '2026-13-01' }, { ...input, characterIds: [] }, { ...input, characterIds: [...input.characterIds, ...input.characterIds] }, { ...input, confirmed: false }, { ...input, results: [10] }, { ...input, roll: 10 }]) expect(validateNightRequest(invalid)).toBe(false)
  })
})
