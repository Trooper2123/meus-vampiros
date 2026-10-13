import { randomUUID } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ session: vi.fn(), ensure: vi.fn(), rollD10: vi.fn(() => [6]) }))
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: mocks.session }))
vi.mock('@/lib/db', () => ({ ensureAllTables: mocks.ensure, db: null }))
vi.mock('@/lib/vtm-v5/dice-provider', () => ({ serverDiceProvider: { rollD10: mocks.rollD10 } }))

import { devCreateCampaign, devCreateCharacter, devGetCharacterAccessRecord } from '@/lib/dev-db'
import { GET, POST } from '@/app/api/campaigns/[id]/nights/awake/route'

const request = (body: unknown) => new Request('http://localhost/api/campaigns/awake', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

describe('rota Awake com serviço e provider de memória reais', () => {
  beforeEach(() => { vi.clearAllMocks(); global.__devDb = undefined; global.__chronicleNightMemory = undefined; mocks.session.mockResolvedValue({ user: { sub: 'master-route' } }) })

  function fixture() {
    const campaign = devCreateCampaign('master-route', { name: 'Mesa', theme: null, principios: null, averageXp: null, status: 'active', lastSessionAt: null })
    const character = devCreateCharacter('player-route', { name: 'Vampiro', campaignId: campaign.id, data: { fome: 1 } })
    devGetCharacterAccessRecord(character.id)!.status = 'APPROVED'
    return { campaign, character, context: { params: Promise.resolve({ id: campaign.id }) }, body: { inGameDate: '2001-01-01', characterIds: [character.id], idempotencyKey: randomUUID(), confirmed: true } }
  }

  it('401 antes de tocar infraestrutura', async () => {
    mocks.session.mockResolvedValue(null)
    const context = { params: Promise.resolve({ id: randomUUID() }) }
    expect((await GET(request({}), context)).status).toBe(401)
    expect((await POST(request({}), context)).status).toBe(401)
    expect(mocks.ensure).not.toHaveBeenCalled()
  })

  it('autoriza narrador, rejeita jogador e outra mesa sem retornar histórico', async () => {
    const { context, body } = fixture()
    mocks.session.mockResolvedValue({ user: { sub: 'player-route' } })
    expect((await GET(request({}), context)).status).toBe(403)
    expect((await POST(request(body), context)).status).toBe(403)
    mocks.session.mockResolvedValue({ user: { sub: 'other-master' } })
    expect((await GET(request({}), context)).status).toBe(403)
    expect(mocks.rollD10).not.toHaveBeenCalled()
    mocks.session.mockResolvedValue({ user: { sub: 'master-route' } })
    const result = await POST(request(body), context)
    expect(result.status).toBe(200)
    expect((await result.json()).results[0]).toMatchObject({ roll: 6, outcome: 'AWAKENED' })
    const history = await GET(request({}), context)
    expect((await history.json()).nights).toHaveLength(1)
  })

  it('400 para UUID, JSON e data inválidos; resultados/pools do cliente recusados', async () => {
    const { context, body } = fixture()
    expect((await GET(request({}), { params: Promise.resolve({ id: "' OR 1=1" }) })).status).toBe(400)
    expect((await POST(new Request('http://localhost/api/awake', { method: 'POST', body: '{' }), context)).status).toBe(400)
    for (const invalid of [null, [], { ...body, inGameDate: '2026-02-30' }, { ...body, roll: 10 }, { ...body, characterIds: [randomUUID(), randomUUID()], confirmed: false }]) expect((await POST(request(invalid), context)).status).toBe(400)
    expect(mocks.rollD10).not.toHaveBeenCalled()
  })

  it('403 em seleção cruzada sem efeito e replay retorna mesmo resultado', async () => {
    const { context, body, character } = fixture()
    const other = devCreateCharacter('other', { name: 'Independente', data: {} })
    expect((await POST(request({ ...body, characterIds: [character.id, other.id] }), context)).status).toBe(403)
    expect(devGetCharacterAccessRecord(character.id)?.gameState).toEqual({})
    const first = await (await POST(request(body), context)).json()
    const second = await (await POST(request(body), context)).json()
    expect(first).toEqual(second)
    expect(mocks.rollD10).toHaveBeenCalledTimes(1)
    expect((await POST(request({ ...body, inGameDate: '2001-01-02' }), context)).status).toBe(409)
  })
})
