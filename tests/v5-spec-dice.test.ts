import { beforeEach, expect, it, vi } from 'vitest'
vi.hoisted(() => { vi.stubEnv('DATABASE_URL', undefined); vi.stubEnv('NODE_ENV', 'test') })
import { evaluateV5Roll, evaluateCheck, countV5Dice, resolveV5Count, resolveTakingHalf, resolveAutomaticWin, resolveBasicContest } from '@/lib/vtm-v5/dice-evaluator'
import { executeCharacterRoll, type RollInput } from '@/lib/character-rolls'
import { adjudicateCharacterRoll, getCharacterRollHistory, rerollCharacterDice } from '@/lib/character-roll-history'

const id = '11111111-1111-4111-8111-111111111111'
const campaignId = '22222222-2222-4222-8222-222222222222'
const input: RollInput = { attribute: 'forca', skillId: 'briga', difficulty: 2, visibility: 'PUBLIC', reason: 'Teste', expectedRevision: 0, idempotencyKey: 'test-roll' }
const provider = { rollD10: vi.fn<(count: number) => number[]>() }

beforeEach(() => {
  const now = new Date()
  global.__devDb = {
    characters: [{ id, userId: 'player', createdByUserId: 'player', name: 'Helena', concept: null, clan: null, generation: null, status: 'APPROVED', characterType: 'PLAYER_VAMPIRE', campaignId, data: { forca: 3, vigor: 2, determinacao: 2, compostura: 2, 'habilidade-briga': 2 }, totalXp: 10, spentXp: 0, revision: 0, gameState: { hunger: 2, condition: 'ACTIVE' }, createdAt: now, updatedAt: now }],
    campaigns: [{ id: campaignId, masterUserId: 'narrator', name: 'Mesa', theme: null, principios: null, averageXp: null, status: 'Ativa', lastSessionAt: null, createdAt: now, updatedAt: now }], possessions: [], characterLedgerEvents: [],
  }
  provider.rollD10.mockReset().mockImplementation(count => Array(count).fill(6))
})

it.each([
  [[6, 7, 1], [], 2, 2, 'SUCCESS'], [[10, 10], [], 4, 4, 'CRITICAL'], [[10, 10, 10], [], 5, 5, 'CRITICAL'], [[10, 10, 10, 10], [], 8, 8, 'CRITICAL'],
  [[10], [10], 4, 4, 'MESSY_CRITICAL'], [[6], [10], 2, 2, 'SUCCESS'], [[6], [1], 1, 1, 'SUCCESS'], [[6], [1], 2, 1, 'BESTIAL_FAILURE'], [[2], [1], 2, 0, 'BESTIAL_FAILURE'], [[10, 10], [1], 5, 4, 'BESTIAL_FAILURE'],
] as const)('exemplo normativo N%j H%j alvo %i', (normal, hunger, difficulty, successes, outcome) => {
  expect(evaluateV5Roll(normal, hunger, difficulty)).toMatchObject({ successes, outcome, margin: successes - difficulty, totalFailure: successes === 0, critical: outcome === 'CRITICAL' || outcome === 'MESSY_CRITICAL' })
})

it('contagem é independente da vitória; falha total e bestial coexistem', () => {
  const count = countV5Dice([10, 10], [1])
  expect(resolveV5Count(count, 4)).toMatchObject({ critical: true, bestialFailure: false })
  expect(resolveV5Count(count, 5)).toMatchObject({ critical: false, bestialFailure: true, margin: -1 })
  expect(evaluateV5Roll([2], [1], 2)).toMatchObject({ totalFailure: true, bestialFailure: true })
})

it('Taking Half, vitória automática, disputa básica e check permanecem distintos', () => {
  expect(resolveTakingHalf(7, 4)).toEqual({ successes: 3, margin: -1, success: false, critical: false })
  expect(resolveAutomaticWin(8, 4)).toEqual({ successes: 4, margin: 0, success: true, critical: false })
  expect(() => resolveAutomaticWin(7, 4)).toThrow()
  expect(resolveBasicContest(3, 3)).toMatchObject({ success: true, tie: true })
  expect(evaluateCheck(10)).toEqual({ die: 10, successes: 1, success: true, critical: false })
})

it('Fome substitui dados sem aumentar parada, mesmo quando maior que ela', async () => {
  global.__devDb!.characters[0].data.forca = 1
  global.__devDb!.characters[0].gameState!.hunger = 5
  expect(await executeCharacterRoll('player', id, input, provider)).toMatchObject({ pool: 3, result: { normalDice: [], hungerDice: [6, 6, 6] } })
})

it.each(['CHECK', 'WILLPOWER', 'HUMANITY'] as const)('%s não recebe Fome nem rerrolagem de Vontade', async mode => {
  const roll = await executeCharacterRoll('player', id, { ...input, mode }, provider)
  expect(roll).toMatchObject({ result: { hungerDice: [] }, canReroll: false })
  await expect(rerollCharacterDice('player', id, String(roll.id), { dieIds: ['N:0'], expectedRevision: 1, idempotencyKey: 'retry' }, provider)).rejects.toMatchObject({ status: 422 })
})

it('substitui um 10 comum, perde crítico com Fome, cobra uma vez e preserva original', async () => {
  provider.rollD10.mockReturnValueOnce([10, 6, 2, 10, 1]).mockReturnValueOnce([2])
  const roll = await executeCharacterRoll('player', id, input, provider)
  expect(roll).toMatchObject({ result: { outcome: 'MESSY_CRITICAL' } })
  const command = { dieIds: ['N:0'], expectedRevision: 1, idempotencyKey: 'reroll-once' }
  const revised = await rerollCharacterDice('player', id, String(roll.id), command, provider)
  expect(revised).toMatchObject({ revision: 2, result: { outcome: 'SUCCESS', successes: 2, normalDice: [2, 6, 2] }, revisions: [{ number: 0, result: { normalDice: [10, 6, 2] } }, { number: 1, replacements: [{ dieId: 'N:0', before: 10, after: 2 }] }] })
  expect(await rerollCharacterDice('player', id, String(roll.id), command, provider)).toEqual(revised)
  expect(global.__devDb!.characters[0].gameState!.willpowerDamage).toEqual({ superficial: 1, aggravated: 0 })
  expect(provider.rollD10).toHaveBeenCalledTimes(2)
  await expect(rerollCharacterDice('player', id, String(roll.id), { ...command, expectedRevision: 2, idempotencyKey: 'second' }, provider)).rejects.toMatchObject({ status: 422 })
})

it.each([[], ['H:0'], ['N:0', 'N:0'], ['N:0', 'N:00'], ['N:0', 'N:1', 'N:2', 'N:3'], ['N:99']].map(dieIds => ({ dieIds })))('rejeita seleção inválida $dieIds sem gasto', async ({ dieIds }) => {
  const roll = await executeCharacterRoll('player', id, input, provider)
  await expect(rerollCharacterDice('player', id, String(roll.id), { dieIds, expectedRevision: 1, idempotencyKey: 'invalid' }, provider)).rejects.toMatchObject({ status: 400 })
  expect(global.__devDb!.characters[0].revision).toBe(1)
})

it('rerrolagens concorrentes não cobram duas vezes e não gastam Vontade indisponível', async () => {
  const roll = await executeCharacterRoll('player', id, input, provider)
  const results = await Promise.allSettled(['a', 'b'].map(idempotencyKey => rerollCharacterDice('player', id, String(roll.id), { dieIds: ['N:0'], expectedRevision: 1, idempotencyKey }, provider)))
  expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
  expect(global.__devDb!.characters[0].gameState!.willpowerCurrent).toBe(3)
})

it('resposta inválida do provider não grava revisão nem cobra Vontade', async () => {
  const roll = await executeCharacterRoll('player', id, input, provider)
  const before = structuredClone(global.__devDb)
  provider.rollD10.mockReturnValue([11])
  await expect(rerollCharacterDice('player', id, String(roll.id), { dieIds: ['N:0'], expectedRevision: 1, idempotencyKey: 'invalid-provider' }, provider)).rejects.toThrow()
  expect(global.__devDb).toEqual(before)
})

it('separa segredo, dificuldade reservada e anotações privadas do DTO do jogador', async () => {
  const roll = await executeCharacterRoll('narrator', id, { ...input, hiddenDifficulty: true, difficulty: 47 }, provider)
  await adjudicateCharacterRoll('narrator', id, String(roll.id), { kind: 'COMPLICATION', note: 'SEGREDO-DO-NARRADOR', expectedRevision: 1, idempotencyKey: 'decision' })
  const player = await getCharacterRollHistory('player', id)
  expect(player.rolls[0].result).not.toHaveProperty('difficulty')
  expect(player.rolls[0].revisions[0].result).not.toHaveProperty('margin')
  expect(JSON.stringify(player)).not.toContain('SEGREDO-DO-NARRADOR')
  expect(player.rolls[0].sources.every(source => !Object.hasOwn(source, 'file'))).toBe(true)
  expect(JSON.stringify(await getCharacterRollHistory('narrator', id))).toContain('SEGREDO-DO-NARRADOR')
  await executeCharacterRoll('narrator', id, { ...input, visibility: 'SECRET', expectedRevision: 2, idempotencyKey: 'secret' }, provider)
  expect((await getCharacterRollHistory('player', id)).rolls).toHaveLength(1)
  await expect(getCharacterRollHistory('stranger', id)).rejects.toMatchObject({ status: 403 })
})

it('oferta de custo exige falha parcial, Narrador e aceitação explícita do dono', async () => {
  provider.rollD10.mockReturnValue([6, 2, 2, 2, 2])
  const roll = await executeCharacterRoll('player', id, input, provider)
  await expect(adjudicateCharacterRoll('player', id, String(roll.id), { kind: 'OFFER_COST', note: 'Custo', expectedRevision: 1, idempotencyKey: 'forged' })).rejects.toMatchObject({ status: 403 })
  const offered = await adjudicateCharacterRoll('narrator', id, String(roll.id), { kind: 'OFFER_COST', note: 'Deixar uma pista', expectedRevision: 1, idempotencyKey: 'offer' })
  const offerId = (offered.adjudications as { id: string }[])[0].id
  const accepted = await adjudicateCharacterRoll('player', id, String(roll.id), { kind: 'ACCEPT_COST', offerId, note: 'Aceito', expectedRevision: 2, idempotencyKey: 'accept' })
  expect(accepted).toMatchObject({ result: { success: false, successes: 1 }, adjudications: [{ kind: 'OFFER_COST' }, { kind: 'ACCEPT_COST' }] })
  expect(global.__devDb!.characters[0].gameState!.stains).toBeUndefined()
})

it('bloqueia gasto sem capacidade disponível de Vontade', async () => {
  const roll = await executeCharacterRoll('player', id, input, provider)
  global.__devDb!.characters[0].gameState!.willpowerDamage = { superficial: 4, aggravated: 0 }
  await expect(rerollCharacterDice('player', id, String(roll.id), { dieIds: ['N:0'], expectedRevision: 1, idempotencyKey: 'empty' }, provider)).rejects.toMatchObject({ status: 422 })
  expect(provider.rollD10).toHaveBeenCalledTimes(1)
})

it('adjudica crítico com Fome sem alterar dados, sucessos ou recursos', async () => {
  provider.rollD10.mockReturnValue([10, 6, 2, 10, 1])
  const roll = await executeCharacterRoll('player', id, input, provider)
  const result = await adjudicateCharacterRoll('narrator', id, String(roll.id), { kind: 'NARRATIVE_FAILURE', note: 'A solução rompe a discrição necessária.', shared: true, expectedRevision: 1, idempotencyKey: 'narrative-failure' })
  expect(result).toMatchObject({ result: { successes: 5, outcome: 'MESSY_CRITICAL' }, canReroll: false, adjudications: [{ kind: 'NARRATIVE_FAILURE' }] })
  expect(global.__devDb!.characters[0].gameState!.stains).toBeUndefined()
  expect(global.__devDb!.characters[0].gameState!.humanity).toBeUndefined()
})

it('Narrador de nova mesa não recebe segredos ou dificuldade reservada da mesa anterior', async () => {
  const roll = await executeCharacterRoll('narrator', id, { ...input, hiddenDifficulty: true }, provider)
  await adjudicateCharacterRoll('narrator', id, String(roll.id), { kind: 'COMPLICATION', note: 'PRIVATE-OLD-CAMPAIGN', expectedRevision: 1, idempotencyKey: 'old-decision' })
  await executeCharacterRoll('narrator', id, { ...input, visibility: 'SECRET', expectedRevision: 2, idempotencyKey: 'old-secret' }, provider)
  const nextCampaign = '44444444-4444-4444-8444-444444444444'
  global.__devDb!.campaigns.push({ ...global.__devDb!.campaigns[0], id: nextCampaign, masterUserId: 'new-narrator' })
  global.__devDb!.characters[0].campaignId = nextCampaign
  const history = await getCharacterRollHistory('new-narrator', id)
  expect(history.rolls).toHaveLength(1)
  expect(history.rolls[0].result).not.toHaveProperty('difficulty')
  expect(history.rolls[0].canReroll).toBe(false)
  expect(JSON.stringify(history)).not.toContain('PRIVATE-OLD-CAMPAIGN')
})

it.each(['TAKING_HALF', 'AUTOMATIC'] as const)('%s exige Narrador e não sorteia dados nem cria complicações', async mode => {
  await expect(executeCharacterRoll('player', id, { ...input, mode }, provider)).rejects.toMatchObject({ status: 403 })
  const result = await executeCharacterRoll('narrator', id, { ...input, mode }, provider)
  expect(result).toMatchObject({ canReroll: false, result: { normalDice: [], hungerDice: [], critical: false, messyCritical: false, bestialFailure: false } })
  expect(provider.rollD10).not.toHaveBeenCalled()
})

it('retry reavalia DTO e não entrega anotação privada após perda do papel de Narrador', async () => {
  global.__devDb!.characters[0].userId = 'narrator'
  const roll = await executeCharacterRoll('narrator', id, input, provider)
  await adjudicateCharacterRoll('narrator', id, String(roll.id), { kind: 'COMPLICATION', note: 'PRIVATE-FORMER-ROLE', expectedRevision: 1, idempotencyKey: 'private-note' })
  const command = { dieIds: ['N:0'], expectedRevision: 2, idempotencyKey: 'role-reroll' }
  const first = await rerollCharacterDice('narrator', id, String(roll.id), command, provider)
  expect(JSON.stringify(first)).toContain('PRIVATE-FORMER-ROLE')
  global.__devDb!.campaigns[0].masterUserId = 'new-narrator'
  const retried = await rerollCharacterDice('narrator', id, String(roll.id), command, provider)
  expect(JSON.stringify(retried)).not.toContain('PRIVATE-FORMER-ROLE')
  expect(retried.result).toEqual(first.result)
  expect(provider.rollD10).toHaveBeenCalledTimes(2)
})
