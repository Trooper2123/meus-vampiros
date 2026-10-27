import { beforeEach, describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { getCommandCharacter } from '@/lib/character-commands'
import { createTestCampaign, createTestCharacter, preparePostgresTest } from './postgres-test-helpers'

const session = vi.hoisted(() => {
  vi.stubEnv('NODE_ENV', 'test')
  return vi.fn()
})
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: session }))

import { PATCH } from '@/app/api/characters/route'
import { POST as batchGrant } from '@/app/api/campaigns/[id]/xp/route'

let characterId: string, campaignId: string, otherCharacterId: string, otherCampaignId: string, independentId: string
const key = randomUUID()
let payload = { characterId: '', amount: 5, reason: 'Sessão', idempotencyKey: key }
async function ledger() { return (await db.execute(sql`SELECT id FROM character_ledger_events WHERE character_id IN (${characterId}::uuid, ${otherCharacterId}::uuid, ${independentId}::uuid)`)).rows }
async function balances() { return Promise.all([characterId, otherCharacterId, independentId].map(async id => (await getCommandCharacter(id))!.totalXp)) }

function request(body: unknown, method = 'PATCH'): Request {
  return new Request('http://localhost/api/characters', { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
}

describe('API de XP com autorização e persistência PostgreSQL', () => {
  beforeEach(async () => {
    preparePostgresTest()
    campaignId = (await createTestCampaign('narrator')).id
    otherCampaignId = (await createTestCampaign('other-narrator')).id
    characterId = (await createTestCharacter('player', campaignId)).id
    otherCharacterId = (await createTestCharacter('player', otherCampaignId)).id
    independentId = (await createTestCharacter('player', null)).id
    await db.execute(sql`UPDATE characters SET status = 'APPROVED', total_xp = 10, spent_xp = 4 WHERE id IN (${characterId}::uuid, ${otherCharacterId}::uuid, ${independentId}::uuid)`)
    payload = { characterId, amount: 5, reason: 'Sessão', idempotencyKey: key }
    session.mockReset()
    session.mockResolvedValue({ user: { sub: 'narrator' } })
  })

  it('Narrador atribui XP à ficha de jogador e retry não duplica', async () => {
    const first = await PATCH(request(payload))
    expect(first.status).toBe(200)
    const body = await first.json()
    expect(body).toMatchObject({ totalXp: 15, spentXp: 4, availableXp: 11, revision: 1 })
    const retry = await PATCH(request(payload))
    expect(retry.status).toBe(200)
    expect(await retry.json()).toEqual(body)
    expect((await getCommandCharacter(characterId))!.totalXp).toBe(15)
    expect((await ledger())).toHaveLength(1)
  })

  it('recusa acesso não autenticado', async () => {
    session.mockResolvedValue(null)
    expect((await PATCH(request(payload))).status).toBe(401)
    expect((await batchGrant(request({ ...payload, characterIds: [characterId] }, 'POST'), { params: Promise.resolve({ id: campaignId }) })).status).toBe(401)
    expect((await ledger())).toHaveLength(0)
  })

  it.each(['player', 'other', 'other-narrator'])('recusa atribuição por %s', async actor => {
    session.mockResolvedValue({ user: { sub: actor } })
    expect((await PATCH(request(payload))).status).toBe(403)
    expect((await getCommandCharacter(characterId))!.totalXp).toBe(10)
    expect((await ledger())).toHaveLength(0)
  })

  it('recusa ficha independente ou pertencente a outra mesa', async () => {
    expect((await PATCH(request({ ...payload, characterId: independentId }))).status).toBe(403)
    expect((await PATCH(request({ ...payload, characterId: otherCharacterId }))).status).toBe(403)
    expect((await ledger())).toHaveLength(0)
  })

  it('ficha inexistente retorna 404 sem registrar concessão', async () => {
    expect((await PATCH(request({ ...payload, characterId: '99999999-9999-4999-8999-999999999999' }))).status).toBe(404)
    expect((await ledger())).toHaveLength(0)
  })

  it.each([null, [], { characterId: "' OR 1=1" }, { idempotencyKey: 'invalid' }, { amount: 0 }, { amount: -1 }, { amount: 1.5 }, { amount: 10001 }, { amount: '5' }, { reason: '' }, { reason: 42 }, { reason: 'a'.repeat(501) }, { totalXp: 999 }])('recusa payload inv?lido %j', async overrides => {
    const body = overrides && !Array.isArray(overrides) ? { ...payload, ...overrides } : overrides
    expect((await PATCH(request(body))).status).toBe(400)
    expect((await getCommandCharacter(characterId))!.totalXp).toBe(10)
    expect(await ledger()).toHaveLength(0)
  })

  it('recusa JSON malformado', async () => {
    expect((await PATCH(new Request('http://localhost/api/characters', { method: 'PATCH', body: '{' }))).status).toBe(400)
    expect((await ledger())).toHaveLength(0)
  })

  it('chave com payload divergente retorna 409', async () => {
    expect((await PATCH(request(payload))).status).toBe(200)
    expect((await PATCH(request({ ...payload, amount: 6 }))).status).toBe(409)
    expect((await getCommandCharacter(characterId))!.totalXp).toBe(15)
    expect((await ledger())).toHaveLength(1)
  })

  it('XP inconsistente retorna 422 sem modificar dados', async () => {
    await db.execute(sql`UPDATE characters SET spent_xp = 11 WHERE id = ${characterId}::uuid`)
    expect((await PATCH(request(payload))).status).toBe(422)
    expect((await getCommandCharacter(characterId))).toMatchObject({ totalXp: 10, spentXp: 11, revision: 0 })
    expect((await ledger())).toHaveLength(0)
  })

  it('valida lote inteiro antes de conceder, impedindo mistura de campanhas', async () => {
    const response = await batchGrant(request({ amount: 5, reason: 'Sessão', idempotencyKey: key, characterIds: [characterId, otherCharacterId] }, 'POST'), { params: Promise.resolve({ id: campaignId }) })
    expect(response.status).toBe(403)
    expect((await balances())).toEqual([10, 10, 10])
    expect((await ledger())).toHaveLength(0)
  })

  it('recusa jogador ou Narrador de outra mesa no endpoint em lote', async () => {
    for (const actor of ['player', 'other-narrator']) {
      session.mockResolvedValue({ user: { sub: actor } })
      expect((await batchGrant(request({ amount: 5, reason: 'Sessão', idempotencyKey: key, characterIds: [characterId] }, 'POST'), { params: Promise.resolve({ id: campaignId }) })).status).toBe(403)
    }
    expect((await ledger())).toHaveLength(0)
  })

  it('lote autorizado concede uma vez por ficha mesmo com retry', async () => {
    await db.execute(sql`UPDATE characters SET campaign_id = ${campaignId}::uuid WHERE id = ${otherCharacterId}::uuid`)
    const body = { amount: 5, reason: 'Sessão', idempotencyKey: key, characterIds: [characterId, otherCharacterId] }
    const context = { params: Promise.resolve({ id: campaignId }) }
    const first = await batchGrant(request(body, 'POST'), context)
    expect(first.status).toBe(200)
    expect(await first.json()).toMatchObject({ complete: true, results: [{ characterId, totalXp: 15 }, { characterId: otherCharacterId, totalXp: 15 }] })
    expect((await batchGrant(request(body, 'POST'), context)).status).toBe(200)
    expect((await balances())).toEqual([15, 15, 10])
    expect((await ledger())).toHaveLength(2)
  })
})
