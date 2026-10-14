import { beforeEach, describe, expect, it, vi } from 'vitest'

const session = vi.hoisted(() => {
  vi.stubEnv('DATABASE_URL', undefined)
  vi.stubEnv('NODE_ENV', 'test')
  return vi.fn()
})
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: session }))

import { GET, POST } from '@/app/api/characters/[id]/rolls/route'

const id = '11111111-1111-4111-8111-111111111111'
const campaignId = '22222222-2222-4222-8222-222222222222'
const key = '33333333-3333-4333-8333-333333333333'
const context = { params: Promise.resolve({ id }) }
const input = { attribute: 'forca', skillId: 'briga', difficulty: 2, visibility: 'PUBLIC', reason: 'Combate', expectedRevision: 0, idempotencyKey: key }

function request(body: unknown): Request {
  return new Request(`http://localhost/api/characters/${id}/rolls`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
}

describe('API de rolagens com provider real e sessão mockada', () => {
  beforeEach(() => {
    const now = new Date()
    global.__devDb = {
      characters: [{ id, userId: 'player', createdByUserId: 'player', name: 'Helena', concept: null, clan: null, generation: null, status: 'APPROVED', characterType: 'PLAYER_VAMPIRE', campaignId, data: { forca: 3, vigor: 2, determinacao: 2, compostura: 2, 'habilidade-briga': 2 }, totalXp: 10, spentXp: 0, revision: 0, gameState: { hunger: 2, condition: 'ACTIVE', specialties: [{ id: 'approved', skillId: 'briga', name: 'Agarrar', origin: 'XP', status: 'APPROVED', costXp: 3 }, { id: 'pending', skillId: 'briga', name: 'Garras', origin: 'XP', status: 'PENDING', costXp: 3 }] }, createdAt: now, updatedAt: now }],
      campaigns: [{ id: campaignId, masterUserId: 'narrator', name: 'Mesa', theme: null, principios: null, averageXp: null, status: 'Ativa', lastSessionAt: null, createdAt: now, updatedAt: now }], possessions: [], characterLedgerEvents: [],
    }
    session.mockReset()
    session.mockResolvedValue({ user: { sub: 'player' } })
  })

  it('GET fornece apenas opções permitidas e distingue Narrador', async () => {
    const owner = await GET(new Request('http://localhost'), context)
    expect(owner.status).toBe(200)
    expect(await owner.json()).toMatchObject({ canUseSpecialties: false, canRollSecret: false, skills: { briga: 2 }, specialties: [{ id: 'approved' }] })
    session.mockResolvedValue({ user: { sub: 'narrator' } })
    expect(await (await GET(new Request('http://localhost'), context)).json()).toMatchObject({ canUseSpecialties: true, canRollSecret: true })
  })

  it('GET permite especialidade independente sem liberar rolagem secreta', async () => {
    global.__devDb!.characters[0].campaignId = null
    expect(await (await GET(new Request('http://localhost'), context)).json()).toMatchObject({ canUseSpecialties: true, canRollSecret: false })
  })

  it('GET permite especialidade independente sem liberar rolagem secreta', async () => {
    global.__devDb!.characters[0].campaignId = null
    expect(await (await GET(new Request('http://localhost'), context)).json()).toMatchObject({ canUseSpecialties: true, canRollSecret: false })
  })

  it('POST calcula pool no servidor e retry conserva o resultado persistido', async () => {
    const first = await POST(request(input), context)
    expect(first.status).toBe(200)
    const body = await first.json()
    expect(body).toMatchObject({ pool: 5, specialtyBonus: 0, revision: 1, visibility: 'PUBLIC' })
    expect(body.result.normalDice).toHaveLength(3)
    expect(body.result.hungerDice).toHaveLength(2)
    expect(await (await POST(request(input), context)).json()).toEqual(body)
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(1)
  })

  it.each(['other', 'other-narrator'])('GET e POST não autorizam %s', async actor => {
    session.mockResolvedValue({ user: { sub: actor } })
    expect((await GET(new Request('http://localhost'), context)).status).toBe(403)
    expect((await POST(request(input), context)).status).toBe(403)
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
  })

  it('GET e POST exigem autenticação', async () => {
    session.mockResolvedValue(null)
    expect((await GET(new Request('http://localhost'), context)).status).toBe(401)
    expect((await POST(request(input), context)).status).toBe(401)
  })

  it('jogador não atribui especialidade ou visibilidade secreta', async () => {
    expect((await POST(request({ ...input, specialtyId: 'approved' }), context)).status).toBe(403)
    expect((await POST(request({ ...input, visibility: 'SECRET' }), context)).status).toBe(403)
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
  })

  it('GET do jogador não inclui resultados secretos ou ledger privado', async () => {
    session.mockResolvedValue({ user: { sub: 'narrator' } })
    const rolled = await POST(request({ ...input, visibility: 'SECRET', reason: 'Segredo exclusivo do Narrador' }), context)
    expect(rolled.status).toBe(200)
    expect(global.__devDb!.characterLedgerEvents[0].payload).toMatchObject({ input: { reason: 'Segredo exclusivo do Narrador', visibility: 'SECRET' } })
    session.mockResolvedValue({ user: { sub: 'player' } })
    const response = await GET(new Request('http://localhost'), context)
    expect(response.status).toBe(200)
    const body = await response.text()
    expect(body).not.toContain('Segredo exclusivo do Narrador')
    expect(body).not.toContain('normalDice')
    expect(body).not.toContain('characterLedgerEvents')
  })

  it.each([null, [], { ...input, attribute: 'pool-livre' }, { ...input, skillId: 2 }, { ...input, difficulty: -1 }, { ...input, difficulty: 0 }, { ...input, difficulty: 51 }, { ...input, difficulty: 1.5 }, { ...input, visibility: 'PRIVATE' }, { ...input, reason: '' }, { ...input, expectedRevision: -1 }, { ...input, idempotencyKey: 'invalid' }, { ...input, specialtyId: ['approved', 'pending'] }])('recusa intenção inválida %j', async body => {
    expect((await POST(request(body), context)).status).toBe(400)
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
  })

  it.each(['pool', 'result', 'roll', 'modifiers', 'specialtyBonus', 'mode'])('recusa parâmetro mecânico forjado %s', async field => {
    expect((await POST(request({ ...input, [field]: field === 'mode' ? 'FREE_POOL' : 999 }), context)).status).toBe(400)
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
  })

  it('chave com payload divergente e revisão antiga recebem 409', async () => {
    expect((await POST(request(input), context)).status).toBe(200)
    expect((await POST(request({ ...input, difficulty: 3 }), context)).status).toBe(409)
    expect((await POST(request({ ...input, idempotencyKey: '44444444-4444-4444-8444-444444444444' }), context)).status).toBe(409)
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(1)
  })

  it('ficha rascunho ou dados internos inválidos são recusados', async () => {
    global.__devDb!.characters[0].status = 'DRAFT'
    expect((await POST(request(input), context)).status).toBe(422)
    global.__devDb!.characters[0].status = 'APPROVED'
    global.__devDb!.characters[0].data.forca = 9
    expect((await POST(request(input), context)).status).toBe(422)
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
  })
})
