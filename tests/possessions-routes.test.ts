import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ session: vi.fn(), ensure: vi.fn() }))
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: mocks.session }))
vi.mock('@/lib/db', () => ({ ensureAllTables: mocks.ensure, db: null, getLiveKitRoom: vi.fn() }))

import { GET, POST, PUT } from '../app/api/possessions/route'
import { devCreateCharacter, devCreateCampaign, devGetCharacterAccessRecord } from '../lib/dev-db'

const request = (body: unknown, method = 'POST') => new Request('http://localhost/api/possessions', { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

describe('itens com provider em memória e handlers reais', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.session.mockResolvedValue({ user: { sub: 'item-player' } })
  })

  it('retorna 401 antes de preparar banco', async () => {
    mocks.session.mockResolvedValue(null)
    for (const handler of [GET, POST, PUT]) expect((await handler(request({}))).status).toBe(401)
    expect(mocks.ensure).not.toHaveBeenCalled()
  })

  it.each([null, [], { characterId: 'invalid', label: 'Item' }, { characterId: '11111111-1111-4111-8111-111111111111', label: 'x'.repeat(201) }])('recusa entrada inválida %j', async (body) => {
    expect((await POST(request(body))).status).toBe(400)
  })

  it('recusa JSON malformado', async () => {
    for (const handler of [POST, PUT]) expect((await handler(new Request('http://localhost/api/possessions', { method: 'POST', body: '{' }))).status).toBe(400)
  })

  it('deriva campanha, bloqueia forja e permite narrador conceder/aprovar', async () => {
    const campaign = devCreateCampaign('item-master', { name: 'Mesa de itens', theme: null, principios: null, averageXp: null, status: 'active', lastSessionAt: null })
    const character = devCreateCharacter('item-player', { name: 'Jogador', data: {} })
    devGetCharacterAccessRecord(character.id)!.campaignId = campaign.id
    expect((await POST(request({ characterId: character.id, label: 'Forja', origin: 'master' }))).status).toBe(403)
    expect((await POST(request({ characterId: character.id, label: 'Outra mesa', campaignId: '11111111-1111-4111-8111-111111111111' }))).status).toBe(403)
    const created = await POST(request({ characterId: character.id, label: 'Proposta', status: 'aprovado' }))
    const { possession } = await created.json()
    expect(possession).toMatchObject({ campaignId: campaign.id, origin: 'player', status: 'pendente' })
    expect((await PUT(request({ id: possession.id, status: 'aprovado' }, 'PUT'))).status).toBe(403)
    mocks.session.mockResolvedValue({ user: { sub: 'item-master' } })
    expect((await GET(new Request(`http://localhost/api/possessions?characterId=${character.id}`))).status).toBe(200)
    expect((await PUT(request({ id: possession.id, status: 'aprovado' }, 'PUT'))).status).toBe(200)
    const grant = await POST(request({ characterId: character.id, label: 'Concedido', origin: 'master' }))
    expect((await grant.json()).possession).toMatchObject({ origin: 'master', status: 'aprovado' })
    mocks.session.mockResolvedValue({ user: { sub: 'other-master' } })
    expect((await GET(new Request(`http://localhost/api/possessions?characterId=${character.id}`))).status).toBe(403)
    expect((await PUT(request({ id: possession.id, status: 'reprovado' }, 'PUT'))).status).toBe(403)
    devGetCharacterAccessRecord(character.id)!.campaignId = null
    mocks.session.mockResolvedValue({ user: { sub: 'item-master' } })
    expect((await PUT(request({ id: possession.id, status: 'aprovado' }, 'PUT'))).status).toBe(403)
    const afterUnlink = await GET(new Request(`http://localhost/api/possessions?campaignId=${campaign.id}`))
    expect((await afterUnlink.json()).possessions).toEqual([])
  })

  it('independente permanece pendente e não pode ser aprovado por terceiros', async () => {
    const character = devCreateCharacter('item-player', { name: 'Independente', data: {} })
    const response = await POST(request({ characterId: character.id, label: 'Item independente' }))
    const { possession } = await response.json()
    expect(possession).toMatchObject({ campaignId: null, status: 'pendente' })
    mocks.session.mockResolvedValue({ user: { sub: 'item-master' } })
    expect((await PUT(request({ id: possession.id, status: 'aprovado' }, 'PUT'))).status).toBe(403)
  })
})
