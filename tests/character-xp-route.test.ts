import { beforeEach, describe, expect, it, vi } from 'vitest'

const session = vi.hoisted(() => {
  vi.stubEnv('DATABASE_URL', undefined)
  vi.stubEnv('NODE_ENV', 'test')
  return vi.fn()
})
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: session }))

import { PATCH } from '@/app/api/characters/route'
import { POST as batchGrant } from '@/app/api/campaigns/[id]/xp/route'
import type { DevCharacter } from '@/lib/dev-db'

const characterId = '11111111-1111-4111-8111-111111111111'
const campaignId = '22222222-2222-4222-8222-222222222222'
const otherCharacterId = '33333333-3333-4333-8333-333333333333'
const otherCampaignId = '44444444-4444-4444-8444-444444444444'
const independentId = '55555555-5555-4555-8555-555555555555'
const key = '66666666-6666-4666-8666-666666666666'
const payload = { characterId, amount: 5, reason: 'Sessão', idempotencyKey: key }

function request(body: unknown, method = 'PATCH'): Request {
  return new Request('http://localhost/api/characters', { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
}

function character(id: string, mesaId: string | null): DevCharacter {
  const now = new Date()
  return { id, userId: 'player', createdByUserId: 'player', name: 'Helena', concept: null, clan: null, generation: null, status: 'APPROVED', characterType: 'PLAYER_VAMPIRE', campaignId: mesaId, data: {}, totalXp: 10, spentXp: 4, revision: 0, createdAt: now, updatedAt: now }
}

describe('API de XP com autorização e persistência reais em memória', () => {
  beforeEach(() => {
    const now = new Date()
    const campaign = { id: campaignId, masterUserId: 'narrator', name: 'Mesa', theme: null, principios: null, averageXp: null, status: 'Ativa', lastSessionAt: null, createdAt: now, updatedAt: now }
    global.__devDb = { characters: [character(characterId, campaignId), character(otherCharacterId, otherCampaignId), character(independentId, null)], campaigns: [campaign, { ...campaign, id: otherCampaignId, masterUserId: 'other-narrator' }], possessions: [], characterLedgerEvents: [] }
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
    expect(global.__devDb!.characters[0].totalXp).toBe(15)
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(1)
  })

  it('recusa acesso não autenticado', async () => {
    session.mockResolvedValue(null)
    expect((await PATCH(request(payload))).status).toBe(401)
    expect((await batchGrant(request({ ...payload, characterIds: [characterId] }, 'POST'), { params: Promise.resolve({ id: campaignId }) })).status).toBe(401)
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
  })

  it.each(['player', 'other', 'other-narrator'])('recusa atribuição por %s', async actor => {
    session.mockResolvedValue({ user: { sub: actor } })
    expect((await PATCH(request(payload))).status).toBe(403)
    expect(global.__devDb!.characters[0].totalXp).toBe(10)
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
  })

  it('recusa ficha independente ou pertencente a outra mesa', async () => {
    expect((await PATCH(request({ ...payload, characterId: independentId }))).status).toBe(403)
    expect((await PATCH(request({ ...payload, characterId: otherCharacterId }))).status).toBe(403)
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
  })

  it('ficha inexistente retorna 404 sem registrar concessão', async () => {
    expect((await PATCH(request({ ...payload, characterId: '99999999-9999-4999-8999-999999999999' }))).status).toBe(404)
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
  })

  it.each([null, [], { ...payload, characterId: "' OR 1=1" }, { ...payload, idempotencyKey: 'invalid' }, { ...payload, amount: 0 }, { ...payload, amount: -1 }, { ...payload, amount: 1.5 }, { ...payload, amount: 10001 }, { ...payload, amount: '5' }, { ...payload, reason: '' }, { ...payload, reason: 42 }, { ...payload, reason: 'a'.repeat(501) }, { ...payload, totalXp: 999 }])('recusa payload inválido %j', async body => {
    expect((await PATCH(request(body))).status).toBe(400)
    expect(global.__devDb!.characters[0].totalXp).toBe(10)
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
  })

  it('recusa JSON malformado', async () => {
    expect((await PATCH(new Request('http://localhost/api/characters', { method: 'PATCH', body: '{' }))).status).toBe(400)
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
  })

  it('chave com payload divergente retorna 409', async () => {
    expect((await PATCH(request(payload))).status).toBe(200)
    expect((await PATCH(request({ ...payload, amount: 6 }))).status).toBe(409)
    expect(global.__devDb!.characters[0].totalXp).toBe(15)
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(1)
  })

  it('XP inconsistente retorna 422 sem modificar dados', async () => {
    global.__devDb!.characters[0].spentXp = 11
    expect((await PATCH(request(payload))).status).toBe(422)
    expect(global.__devDb!.characters[0]).toMatchObject({ totalXp: 10, spentXp: 11, revision: 0 })
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
  })

  it('valida lote inteiro antes de conceder, impedindo mistura de campanhas', async () => {
    const response = await batchGrant(request({ amount: 5, reason: 'Sessão', idempotencyKey: key, characterIds: [characterId, otherCharacterId] }, 'POST'), { params: Promise.resolve({ id: campaignId }) })
    expect(response.status).toBe(403)
    expect(global.__devDb!.characters.map(entry => entry.totalXp)).toEqual([10, 10, 10])
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
  })

  it('recusa jogador ou Narrador de outra mesa no endpoint em lote', async () => {
    for (const actor of ['player', 'other-narrator']) {
      session.mockResolvedValue({ user: { sub: actor } })
      expect((await batchGrant(request({ amount: 5, reason: 'Sessão', idempotencyKey: key, characterIds: [characterId] }, 'POST'), { params: Promise.resolve({ id: campaignId }) })).status).toBe(403)
    }
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
  })

  it('lote autorizado concede uma vez por ficha mesmo com retry', async () => {
    global.__devDb!.characters[1].campaignId = campaignId
    const body = { amount: 5, reason: 'Sessão', idempotencyKey: key, characterIds: [characterId, otherCharacterId] }
    const context = { params: Promise.resolve({ id: campaignId }) }
    const first = await batchGrant(request(body, 'POST'), context)
    expect(first.status).toBe(200)
    expect(await first.json()).toMatchObject({ complete: true, results: [{ characterId, totalXp: 15 }, { characterId: otherCharacterId, totalXp: 15 }] })
    expect((await batchGrant(request(body, 'POST'), context)).status).toBe(200)
    expect(global.__devDb!.characters.map(entry => entry.totalXp)).toEqual([15, 15, 10])
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(2)
  })
})
