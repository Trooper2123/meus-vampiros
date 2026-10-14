import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.hoisted(() => { vi.stubEnv('DATABASE_URL', undefined); vi.stubEnv('NODE_ENV', 'test') })

import { executeCharacterRoll, type RollInput } from '@/lib/character-rolls'
import { evaluateV5Roll } from '@/lib/vtm-v5/dice-evaluator'
import { serverDiceProvider } from '@/lib/vtm-v5/dice-provider'

const id = '11111111-1111-4111-8111-111111111111'
const campaignId = '22222222-2222-4222-8222-222222222222'
const input: RollInput = { attribute: 'forca', skillId: 'briga', difficulty: 2, visibility: 'PUBLIC', reason: 'Combate', expectedRevision: 0, idempotencyKey: 'roll-1' }
const provider = { rollD10: vi.fn<(count: number) => number[]>() }

describe('rolagens V5 autoritativas com provider injetável', () => {
  beforeEach(() => {
    const now = new Date()
    global.__devDb = {
      characters: [{ id, userId: 'player', createdByUserId: 'player', name: 'Helena', concept: null, clan: null, generation: null, status: 'APPROVED', characterType: 'PLAYER_VAMPIRE', campaignId, data: { forca: 3, vigor: 2, determinacao: 2, compostura: 2, 'habilidade-briga': 2 }, totalXp: 10, spentXp: 0, revision: 0, gameState: { hunger: 2, condition: 'ACTIVE', specialties: [{ id: 'briga-specialty', skillId: 'briga', name: 'Agarrar', origin: 'XP', status: 'APPROVED', costXp: 3 }] }, createdAt: now, updatedAt: now }],
      campaigns: [{ id: campaignId, masterUserId: 'narrator', name: 'Mesa', theme: null, principios: null, averageXp: null, status: 'Ativa', lastSessionAt: null, createdAt: now, updatedAt: now }], possessions: [], characterLedgerEvents: [],
    }
    provider.rollD10.mockReset()
    provider.rollD10.mockImplementation(count => Array(count).fill(6))
  })

  it('monta pool da ficha e substitui dados normais pelos dados de Fome', async () => {
    provider.rollD10.mockReturnValue([10, 10, 2, 6, 1])
    const result = await executeCharacterRoll('player', id, input, provider)
    expect(provider.rollD10).toHaveBeenCalledExactlyOnceWith(5)
    expect(result).toMatchObject({ pool: 5, specialtyBonus: 0, visibility: 'PUBLIC', revision: 1, result: { normalDice: [10, 10, 2], hungerDice: [6, 1], successes: 5, outcome: 'CRITICAL' } })
    expect(global.__devDb!.characters[0].gameState!.hunger).toBe(2)
    expect(global.__devDb!.characterLedgerEvents[0]).toMatchObject({ eventType: 'DICE_ROLLED', createdByUserId: 'player', payload: { input, after: { pool: 5 } } })
  })

  it('Narrador confirma especialidade aplicável e adiciona somente um dado', async () => {
    const result = await executeCharacterRoll('narrator', id, { ...input, specialtyId: 'briga-specialty' }, provider)
    expect(result).toMatchObject({ pool: 6, specialtyBonus: 1 })
    expect(provider.rollD10).toHaveBeenCalledExactlyOnceWith(6)
  })

  it('dono sem mesa pode usar especialidade, mas não rolar secretamente', async () => {
    global.__devDb!.characters[0].campaignId = null
    await expect(executeCharacterRoll('player', id, { ...input, visibility: 'SECRET' }, provider)).rejects.toMatchObject({ status: 403 })
    await expect(executeCharacterRoll('player', id, { ...input, specialtyId: 'briga-specialty' }, provider)).resolves.toMatchObject({ specialtyBonus: 1, pool: 6 })
  })

  it.each([{ specialtyId: 'briga-specialty' }, { visibility: 'SECRET' as const }])('jogador não declara aplicação de bônus nem rolagem secreta %j', async override => {
    await expect(executeCharacterRoll('player', id, { ...input, ...override }, provider)).rejects.toMatchObject({ status: 403 })
    expect(provider.rollD10).not.toHaveBeenCalled()
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
  })

  it('apenas Narrador da campanha executa rolagem secreta', async () => {
    await expect(executeCharacterRoll('other-narrator', id, { ...input, visibility: 'SECRET' }, provider)).rejects.toMatchObject({ status: 403 })
    expect(provider.rollD10).not.toHaveBeenCalled()
    expect(await executeCharacterRoll('narrator', id, { ...input, visibility: 'SECRET' }, provider)).toMatchObject({ visibility: 'SECRET' })
  })

  it.each(['TORPOR', 'STAKED', 'FINAL_DEATH'])('condição %s impede ação normal antes de chamar provider', async condition => {
    global.__devDb!.characters[0].gameState!.condition = condition
    await expect(executeCharacterRoll('player', id, input, provider)).rejects.toMatchObject({ status: 409 })
    expect(provider.rollD10).not.toHaveBeenCalled()
  })

  it.each(['DRAFT', 'PENDING_REVIEW', 'ARCHIVED'])('ficha %s não rola', async status => {
    global.__devDb!.characters[0].status = status
    await expect(executeCharacterRoll('player', id, input, provider)).rejects.toMatchObject({ status: 422 })
    expect(provider.rollD10).not.toHaveBeenCalled()
  })

  it.each([{ forca: 0 }, { forca: 6 }, { forca: 1.5 }, { 'habilidade-briga': -1 }, { 'habilidade-briga': 6 }, { 'habilidade-briga': 1.5 }])('atributos ou habilidades inválidos não chamam engine %j', async data => {
    Object.assign(global.__devDb!.characters[0].data, data)
    await expect(executeCharacterRoll('player', id, input, provider)).rejects.toMatchObject({ status: 422 })
    expect(provider.rollD10).not.toHaveBeenCalled()
  })

  it.each([{ id: 'unknown' }, { id: 'briga-specialty', status: 'PENDING' }, { id: 'briga-specialty', skillId: 'academicos' }])('especialidade inexistente, pendente ou de outra habilidade é recusada %j', async override => {
    const specialties = global.__devDb!.characters[0].gameState!.specialties as Record<string, unknown>[]
    if (override.id !== 'unknown') Object.assign(specialties[0], override)
    await expect(executeCharacterRoll('narrator', id, { ...input, specialtyId: override.id }, provider)).rejects.toMatchObject({ status: 422 })
    expect(provider.rollD10).not.toHaveBeenCalled()
  })

  it('retry usa dado já registrado e payload divergente retorna conflito', async () => {
    const first = await executeCharacterRoll('player', id, input, provider)
    expect(await executeCharacterRoll('player', id, input, provider)).toEqual(first)
    await expect(executeCharacterRoll('player', id, { ...input, difficulty: 3 }, provider)).rejects.toMatchObject({ status: 409 })
    await expect(executeCharacterRoll('player', id, { ...input, idempotencyKey: 'stale' }, provider)).rejects.toMatchObject({ status: 409 })
    expect(provider.rollD10).toHaveBeenCalledTimes(1)
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(1)
  })

  it('requests concorrentes da mesma chave usam uma única amostra', async () => {
    const results = await Promise.all(Array.from({ length: 10 }, () => executeCharacterRoll('player', id, input, provider)))
    expect(results.every(result => result.revision === 1)).toBe(true)
    expect(provider.rollD10).toHaveBeenCalledTimes(1)
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(1)
  })

  it('provider com quantidade incorreta não registra resultado', async () => {
    provider.rollD10.mockReturnValue([6])
    await expect(executeCharacterRoll('player', id, input, provider)).rejects.toMatchObject({ status: 500 })
    expect(global.__devDb!.characters[0].revision).toBe(0)
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
  })
})

describe('avaliador e provider V5', () => {
  it.each([
    { normal: [6, 9], hunger: [2], difficulty: 2, successes: 2, outcome: 'SUCCESS' },
    { normal: [10, 10], hunger: [6], difficulty: 4, successes: 5, outcome: 'CRITICAL' },
    { normal: [10], hunger: [10], difficulty: 4, successes: 4, outcome: 'MESSY_CRITICAL' },
    { normal: [6, 2], hunger: [1], difficulty: 2, successes: 1, outcome: 'BESTIAL_FAILURE' },
    { normal: [6, 2], hunger: [3], difficulty: 2, successes: 1, outcome: 'FAILURE' },
    { normal: [10, 10, 10, 10], hunger: [], difficulty: 8, successes: 8, outcome: 'CRITICAL' },
  ])('classifica sucessos e consequências %j', sample => {
    expect(evaluateV5Roll(sample.normal, sample.hunger, sample.difficulty)).toMatchObject({ successes: sample.successes, outcome: sample.outcome })
  })

  it.each([0, 11, -1, 1.5, NaN, Infinity])('recusa face inválida %s', die => {
    expect(() => evaluateV5Roll([die], [], 1)).toThrow()
    expect(() => evaluateV5Roll([], [die], 1)).toThrow()
  })

  it.each([0, -1, 51, 1.5, NaN])('recusa dificuldade inválida %s', difficulty => expect(() => evaluateV5Roll([6], [], difficulty)).toThrow())
  it('recusa pool acima de 50 e produz apenas d10 no provider real', () => {
    expect(() => evaluateV5Roll(Array(51).fill(6), [], 1)).toThrow()
    expect(serverDiceProvider.rollD10(0)).toEqual([])
    const dice = serverDiceProvider.rollD10(50)
    expect(dice).toHaveLength(50)
    expect(dice.every(die => Number.isInteger(die) && die >= 1 && die <= 10)).toBe(true)
  })
  it.each([-1, 51, 1.5, NaN, Infinity])('provider recusa quantidade %s', count => expect(() => serverDiceProvider.rollD10(count)).toThrow())
})
