import { randomUUID } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { preparePostgresTest, createTestCampaign, createTestCharacter } from './postgres-test-helpers'

const mocks = vi.hoisted(() => ({ session: vi.fn(), ensure: vi.fn(), rollD10: vi.fn(() => [6]) }))
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: mocks.session }))
vi.mock('@/lib/db', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/db')>(), ensureAllTables: mocks.ensure }))
vi.mock('@/lib/vtm-v5/dice-provider', () => ({ serverDiceProvider: { rollD10: mocks.rollD10 } }))

import { GET, POST } from '@/app/api/campaigns/[id]/nights/awake/route'

const request = (body: unknown) => new Request('http://localhost/api/campaigns/awake', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

describe('rota Awake com serviço e provider de memória reais', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.session.mockResolvedValue({ user: { sub: 'master-route' } }) })

  async function fixture() {
    preparePostgresTest()
    const campaign = await createTestCampaign('master-route', 'Mesa')
    const character = await createTestCharacter('player-route', campaign.id, 'Vampiro', { fome: 1 })
    await db.execute(sql`UPDATE characters SET status='APPROVED', character_type='PLAYER_VAMPIRE', data=data || '{"fome":1}'::jsonb, game_state='{"hunger":1,"humanity":7,"condition":"ACTIVE"}'::jsonb WHERE id=${character.id}::uuid`)
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
    const { context, body } = await fixture()
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
    const { context, body } = await fixture()
    expect((await GET(request({}), { params: Promise.resolve({ id: "' OR 1=1" }) })).status).toBe(400)
    expect((await POST(new Request('http://localhost/api/awake', { method: 'POST', body: '{' }), context)).status).toBe(400)
    for (const invalid of [null, [], { ...body, inGameDate: '2026-02-30' }, { ...body, roll: 10 }, { ...body, characterIds: [randomUUID(), randomUUID()], confirmed: false }]) expect((await POST(request(invalid), context)).status).toBe(400)
    expect(mocks.rollD10).not.toHaveBeenCalled()
  })

  it('403 em seleção cruzada sem efeito e replay retorna mesmo resultado', async () => {
    const { context, body, character } = await fixture()
    const other = await createTestCharacter('other', null, 'Independente', {})
    expect((await POST(request({ ...body, characterIds: [character.id, other.id] }), context)).status).toBe(403)
    expect((await db.execute(sql`SELECT revision FROM characters WHERE id=${character.id}::uuid`)).rows[0].revision).toBe(0)
    const first = await (await POST(request(body), context)).json()
    const second = await (await POST(request(body), context)).json()
    expect(first).toEqual(second)
    expect(mocks.rollD10).toHaveBeenCalledTimes(1)
    expect((await POST(request({ ...body, inGameDate: '2001-01-02' }), context)).status).toBe(409)
  })
})
