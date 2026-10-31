import { beforeEach, describe, expect, it } from 'vitest'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { grantCharacterXp } from '@/lib/character-xp'
import { getCommandCharacter, runCharacterCommand } from '@/lib/character-commands'
import { preparePostgresTest, createTestCampaign, createTestCharacter } from './postgres-test-helpers'

let characterId: string
const ledger = async () => (await db.execute(sql`SELECT event_type, origin, payload, created_by_user_id FROM character_ledger_events WHERE character_id = ${characterId}::uuid ORDER BY created_at`)).rows as Array<Record<string, any>>

describe('comandos de concessão de XP com PostgreSQL isolado', () => {
  beforeEach(async () => {
    preparePostgresTest()
    const campaign = await createTestCampaign('narrator')
    const character = await createTestCharacter('player', campaign.id, 'Helena', { notas: 'Preservar' })
    characterId = character.id
    await db.execute(sql`UPDATE characters SET status = 'APPROVED', character_type = 'PLAYER_VAMPIRE', total_xp = 10, spent_xp = 4, revision = 0, game_state = '{"fome":2}'::jsonb WHERE id = ${characterId}::uuid`)
  })

  it('Narrador concede à ficha de jogador e registra autoria, motivo e saldo', async () => {
    expect(await grantCharacterXp('narrator', characterId, 5, '  Sessão  ', 'grant-1')).toEqual({ ok: true, totalXp: 15, spentXp: 4, availableXp: 11, revision: 1 })
    expect(await getCommandCharacter(characterId)).toMatchObject({ totalXp: 15, spentXp: 4, revision: 1, data: { notas: 'Preservar' }, gameState: { fome: 2 } })
    expect(await ledger()).toMatchObject([{ event_type: 'XP_GRANTED', origin: 'USER_ACTION', created_by_user_id: 'narrator', payload: { commandKey: 'grant-1', input: { amount: 5, reason: 'Sessão' }, before: { totalXp: 10, spentXp: 4 }, after: { totalXp: 15, availableXp: 11 } } }])
  })

  it.each(['player', 'other', 'other-narrator'])('recusa %s sem autoridade e mantém saldo', async actorId => {
    await expect(grantCharacterXp(actorId, characterId, 5, 'Sessão', 'grant-1')).rejects.toMatchObject({ status: 403 })
    expect((await getCommandCharacter(characterId))?.totalXp).toBe(10)
    expect(await ledger()).toHaveLength(0)
  })

  it('recusa ficha independente, campanha divergente e ficha inexistente', async () => {
    await expect(grantCharacterXp('narrator', characterId, 5, 'Sessão', 'grant-1', 'another-campaign')).rejects.toMatchObject({ status: 403 })
    await db.execute(sql`UPDATE characters SET campaign_id = NULL WHERE id = ${characterId}::uuid`)
    await expect(grantCharacterXp('narrator', characterId, 5, 'Sessão', 'grant-1')).rejects.toMatchObject({ status: 403 })
    await expect(grantCharacterXp('narrator', '11111111-1111-4111-8111-111111111111', 5, 'Sessão', 'grant-1')).rejects.toMatchObject({ status: 404 })
    expect(await ledger()).toHaveLength(0)
  })

  it.each([0, -1, 1.5, NaN, Infinity, 10001, Number.MAX_SAFE_INTEGER + 1])('recusa quantidade inválida %s', amount => {
    expect(() => grantCharacterXp('narrator', characterId, amount, 'Sessão', 'grant-1')).toThrow()
  })

  it.each(['', '   ', 'a'.repeat(501)])('recusa motivo inválido', reason => {
    expect(() => grantCharacterXp('narrator', characterId, 5, reason, 'grant-1')).toThrow()
  })

  it('retry devolve resposta original mesmo após uma nova concessão', async () => {
    const first = await grantCharacterXp('narrator', characterId, 5, 'Sessão', 'grant-1')
    await grantCharacterXp('narrator', characterId, 7, 'Bônus', 'grant-2')
    expect(await grantCharacterXp('narrator', characterId, 5, 'Sessão', 'grant-1')).toEqual(first)
    expect(await getCommandCharacter(characterId)).toMatchObject({ totalXp: 22, revision: 2 })
    expect(await ledger()).toHaveLength(2)
  })

  it('mesma chave com payload diferente retorna conflito sem alterar saldo', async () => {
    await grantCharacterXp('narrator', characterId, 5, 'Sessão', 'grant-1')
    await expect(grantCharacterXp('narrator', characterId, 6, 'Sessão', 'grant-1')).rejects.toMatchObject({ status: 409 })
    await expect(grantCharacterXp('narrator', characterId, 5, 'Outro motivo', 'grant-1')).rejects.toMatchObject({ status: 409 })
    expect((await getCommandCharacter(characterId))?.totalXp).toBe(15)
    expect(await ledger()).toHaveLength(1)
  })

  it('concessões concorrentes com chaves distintas acumulam sem perda', async () => {
    await Promise.all(Array.from({ length: 20 }, (_, index) => grantCharacterXp('narrator', characterId, 1, 'Sessão', `grant-${index}`)))
    expect(await getCommandCharacter(characterId)).toMatchObject({ totalXp: 30, spentXp: 4, revision: 20 })
    expect(await ledger()).toHaveLength(20)
  })

  it('concessões concorrentes com chave igual registram e incrementam uma vez', async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => grantCharacterXp('narrator', characterId, 5, 'Sessão', 'grant-1')))
    expect(results.every(result => result.totalXp === 15 && result.revision === 1)).toBe(true)
    expect(await getCommandCharacter(characterId)).toMatchObject({ totalXp: 15, revision: 1 })
    expect(await ledger()).toHaveLength(1)
  })

  it.each([{ totalXp: 10, spentXp: 11 }, { totalXp: 10, spentXp: -1 }, { totalXp: 1000000, spentXp: 0 }])('recusa XP inconsistente ou acima do limite %j', async balance => {
    await db.execute(sql`UPDATE characters SET total_xp = ${balance.totalXp}, spent_xp = ${balance.spentXp} WHERE id = ${characterId}::uuid`)
    await expect(grantCharacterXp('narrator', characterId, 5, 'Sessão', 'grant-1')).rejects.toMatchObject({ status: 422 })
    expect(await getCommandCharacter(characterId)).toMatchObject({ ...balance, revision: 0 })
    expect(await ledger()).toHaveLength(0)
  })

  it('comando valida revisão e desfaz alteração quando a operação falha', async () => {
    await expect(runCharacterCommand('narrator', characterId, { key: 'revision', payload: {}, type: 'TEST', expectedRevision: 5 }, entry => entry.masterId === 'narrator', () => ({ ok: true }))).rejects.toMatchObject({ status: 409 })
    await expect(runCharacterCommand('narrator', characterId, { key: 'failed', payload: {}, type: 'TEST' }, entry => entry.masterId === 'narrator', entry => { entry.totalXp = 999; entry.data.notas = 'Alteradas'; throw new Error('Falha controlada') })).rejects.toThrow('Falha controlada')
    expect(await getCommandCharacter(characterId)).toMatchObject({ totalXp: 10, revision: 0, data: { notas: 'Preservar' } })
    expect(await ledger()).toHaveLength(0)
  })
})
