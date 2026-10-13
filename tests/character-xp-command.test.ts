import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.hoisted(() => { vi.stubEnv('DATABASE_URL', undefined); vi.stubEnv('NODE_ENV', 'test') })

import { grantCharacterXp } from '@/lib/character-xp'
import { runCharacterCommand } from '@/lib/character-commands'
import type { DevCharacter } from '@/lib/dev-db'

const characterId = '11111111-1111-4111-8111-111111111111'
const campaignId = '22222222-2222-4222-8222-222222222222'

function character(): DevCharacter {
  const now = new Date()
  return { id: characterId, userId: 'player', createdByUserId: 'player', name: 'Helena', concept: null, clan: null, generation: null, status: 'APPROVED', characterType: 'PLAYER_VAMPIRE', campaignId, data: { notas: 'Preservar' }, totalXp: 10, spentXp: 4, revision: 0, gameState: { fome: 2 }, createdAt: now, updatedAt: now }
}

describe('comandos de concessão de XP com provider em memória', () => {
  beforeEach(() => {
    const now = new Date()
    global.__devDb = { characters: [character()], campaigns: [{ id: campaignId, masterUserId: 'narrator', name: 'Mesa', theme: null, principios: null, averageXp: null, status: 'Ativa', lastSessionAt: null, createdAt: now, updatedAt: now }], possessions: [], characterLedgerEvents: [] }
  })

  it('Narrador concede à ficha de jogador e registra autoria, motivo e saldo', async () => {
    expect(await grantCharacterXp('narrator', characterId, 5, '  Sessão  ', 'grant-1')).toEqual({ ok: true, totalXp: 15, spentXp: 4, availableXp: 11, revision: 1 })
    expect(global.__devDb!.characters[0]).toMatchObject({ totalXp: 15, spentXp: 4, revision: 1, data: { notas: 'Preservar' }, gameState: { fome: 2 } })
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(1)
    expect(global.__devDb!.characterLedgerEvents[0]).toMatchObject({ characterId, eventType: 'XP_GRANTED', createdByUserId: 'narrator', payload: { commandKey: 'grant-1', input: { amount: 5, reason: 'Sessão' }, before: { totalXp: 10, spentXp: 4 }, after: { totalXp: 15, availableXp: 11 } } })
  })

  it.each(['player', 'other', 'other-narrator'])('recusa %s sem autoridade e mantém saldo', async actorId => {
    await expect(grantCharacterXp(actorId, characterId, 5, 'Sessão', 'grant-1')).rejects.toMatchObject({ status: 403 })
    expect(global.__devDb!.characters[0].totalXp).toBe(10)
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
  })

  it('recusa ficha independente, campanha divergente e ficha inexistente', async () => {
    await expect(grantCharacterXp('narrator', characterId, 5, 'Sessão', 'grant-1', 'another-campaign')).rejects.toMatchObject({ status: 403 })
    global.__devDb!.characters[0].campaignId = null
    await expect(grantCharacterXp('narrator', characterId, 5, 'Sessão', 'grant-1')).rejects.toMatchObject({ status: 403 })
    await expect(grantCharacterXp('narrator', 'unknown', 5, 'Sessão', 'grant-1')).rejects.toMatchObject({ status: 404 })
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
  })

  it.each([0, -1, 1.5, NaN, Infinity, 10001, Number.MAX_SAFE_INTEGER + 1])('recusa quantidade inválida %s', amount => {
    expect(() => grantCharacterXp('narrator', characterId, amount, 'Sessão', 'grant-1')).toThrow()
    expect(global.__devDb!.characters[0].totalXp).toBe(10)
  })

  it.each(['', '   ', 'a'.repeat(501)])('recusa motivo inválido', reason => {
    expect(() => grantCharacterXp('narrator', characterId, 5, reason, 'grant-1')).toThrow()
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
  })

  it('retry devolve resposta original mesmo após uma nova concessão', async () => {
    const first = await grantCharacterXp('narrator', characterId, 5, 'Sessão', 'grant-1')
    await grantCharacterXp('narrator', characterId, 7, 'Bônus', 'grant-2')
    expect(await grantCharacterXp('narrator', characterId, 5, 'Sessão', 'grant-1')).toEqual(first)
    expect(global.__devDb!.characters[0]).toMatchObject({ totalXp: 22, revision: 2 })
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(2)
  })

  it('mesma chave com payload diferente retorna conflito sem alterar saldo', async () => {
    await grantCharacterXp('narrator', characterId, 5, 'Sessão', 'grant-1')
    await expect(grantCharacterXp('narrator', characterId, 6, 'Sessão', 'grant-1')).rejects.toMatchObject({ status: 409 })
    await expect(grantCharacterXp('narrator', characterId, 5, 'Outro motivo', 'grant-1')).rejects.toMatchObject({ status: 409 })
    expect(global.__devDb!.characters[0].totalXp).toBe(15)
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(1)
  })

  it('concessões concorrentes com chaves distintas acumulam sem perda', async () => {
    await Promise.all(Array.from({ length: 20 }, (_, index) => grantCharacterXp('narrator', characterId, 1, 'Sessão', `grant-${index}`)))
    expect(global.__devDb!.characters[0]).toMatchObject({ totalXp: 30, spentXp: 4, revision: 20 })
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(20)
  })

  it('concessões concorrentes com chave igual registram e incrementam uma vez', async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => grantCharacterXp('narrator', characterId, 5, 'Sessão', 'grant-1')))
    expect(results.every(result => result.totalXp === 15 && result.revision === 1)).toBe(true)
    expect(global.__devDb!.characters[0]).toMatchObject({ totalXp: 15, revision: 1 })
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(1)
  })

  it.each([{ totalXp: 10, spentXp: 11 }, { totalXp: 10, spentXp: -1 }, { totalXp: 10.5, spentXp: 1 }, { totalXp: 10, spentXp: 1.5 }, { totalXp: 1000000, spentXp: 0 }])('recusa XP inconsistente ou acima do limite %j', async balance => {
    Object.assign(global.__devDb!.characters[0], balance)
    await expect(grantCharacterXp('narrator', characterId, 5, 'Sessão', 'grant-1')).rejects.toMatchObject({ status: 422 })
    expect(global.__devDb!.characters[0]).toMatchObject({ ...balance, revision: 0 })
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
  })

  it('comando valida revisão e não persiste mutação que lança erro', async () => {
    await expect(runCharacterCommand('narrator', characterId, { key: 'revision', payload: {}, type: 'TEST', expectedRevision: 5 }, entry => entry.masterId === 'narrator', () => ({ ok: true }))).rejects.toMatchObject({ status: 409 })
    await expect(runCharacterCommand('narrator', characterId, { key: 'failed', payload: {}, type: 'TEST' }, entry => entry.masterId === 'narrator', entry => { entry.totalXp = 999; entry.data.notas = 'Alteradas'; throw new Error('Falha controlada') })).rejects.toThrow('Falha controlada')
    expect(global.__devDb!.characters[0]).toMatchObject({ totalXp: 10, revision: 0, data: { notas: 'Preservar' } })
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
  })
})
