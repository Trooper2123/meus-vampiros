import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ session: vi.fn(), access: vi.fn(), duplicate: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), membership: vi.fn() }))
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: mocks.session }))
vi.mock('@/lib/db', () => ({ ensureAllTables: vi.fn() }))
vi.mock('@/lib/campaigns', () => ({ hasMasterAccess: vi.fn().mockResolvedValue(false), getCampaignById: vi.fn() }))
vi.mock('@/lib/auth/authorization', () => ({ canEditCharacter: vi.fn(), canManageCampaign: vi.fn() }))
vi.mock('@/lib/availability', () => ({ isUserInCampaign: mocks.membership }))
vi.mock('@/lib/characters', () => ({ getCharacterAccessRecord: mocks.access, duplicateCharacter: mocks.duplicate, getCharacterById: mocks.get, getCharacterForViewer: mocks.get, createCharacter: mocks.create, updateCharacter: mocks.update, getCharactersForCampaign: vi.fn(), updateCharacterXp: vi.fn(), normalizeDisciplines: vi.fn(), deleteCharacter: vi.fn() }))

import { POST as duplicate } from '../app/api/characters/[id]/duplicate/route'
import { GET, POST, PUT } from '@/app/api/characters/route'

const id = '11111111-1111-4111-8111-111111111111'
const context = { params: Promise.resolve({ id }) }
const request = (body: unknown, method = 'POST') => new Request('http://localhost/api/characters', { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

describe('autorização de fichas independentes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.session.mockResolvedValue({ user: { sub: 'owner' } })
    mocks.access.mockResolvedValue({ userId: 'owner', characterType: 'PLAYER_VAMPIRE' })
    mocks.duplicate.mockResolvedValue({ id: 'new-id' })
    mocks.create.mockResolvedValue({ id })
    mocks.get.mockResolvedValue({ id, campaignId: null, data: {} })
    mocks.membership.mockResolvedValue(false)
  })

  it('recusa duplicação sem autenticação', async () => {
    mocks.session.mockResolvedValue(null)
    expect((await duplicate(request({}), context)).status).toBe(401)
    expect(mocks.duplicate).not.toHaveBeenCalled()
  })

  it.each(['other', 'narrator'])('recusa cópia por %s sem propriedade', async (userId) => {
    mocks.session.mockResolvedValue({ user: { sub: userId } })
    expect((await duplicate(request({}), context)).status).toBe(403)
    expect(mocks.duplicate).not.toHaveBeenCalled()
  })

  it('recusa UUID manipulado e NPC', async () => {
    expect((await duplicate(request({}), { params: Promise.resolve({ id: "' OR 1=1" }) })).status).toBe(400)
    mocks.access.mockResolvedValue({ userId: 'owner', characterType: 'HUMAN_NPC' })
    expect((await duplicate(request({}), context)).status).toBe(403)
  })

  it('permite cópia própria', async () => {
    expect((await duplicate(request({}), context)).status).toBe(201)
    expect(mocks.duplicate).toHaveBeenCalledWith(id, 'owner')
  })

  it('não retorna anotações privadas ou overrides no JSON destinado ao jogador', async () => {
    const characters = await import('@/lib/characters')
    vi.mocked(characters.normalizeDisciplines).mockImplementation((data) => data)
    mocks.get.mockResolvedValue({ id, campaignId: null, data: { notas: 'Pessoal', narratorNotes: 'Segredo do narrador', predatorTypeOverrides: [{ privateReason: 'Segredo' }] } })
    const response = await GET(new Request(`http://localhost/api/characters?id=${id}`))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.character.data).toEqual({ notas: 'Pessoal' })
  })

  it('aceita campanha nula e elimina overrides forjados', async () => {
    expect((await POST(request({ name: 'Helena', campaignId: null, data: { masterOverride: true, predatorTypeOverrides: ['bypass'] } }))).status).toBe(201)
    expect(mocks.create.mock.calls[0][1].data).toMatchObject({ masterOverride: false })
    expect(mocks.create.mock.calls[0][1].data).not.toHaveProperty('predatorTypeOverrides')
  })

  it('recusa entrada em campanha por simples conhecimento do UUID', async () => {
    expect((await POST(request({ name: 'Helena', campaignId: id }))).status).toBe(403)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('recusa edição de terceiros e alterações de vínculo', async () => {
    mocks.get.mockResolvedValueOnce(null)
    expect((await PUT(request({ id, name: 'Helena' }, 'PUT'))).status).toBe(403)
    expect((await PUT(request({ id, campaignId: id }, 'PUT'))).status).toBe(409)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it.each([null, [], { id: 'invalid' }, { data: [] }, { name: 123 }, { campaignId: 123 }])('recusa entradas inválidas: %j', async (body) => {
    expect((await POST(request(body))).status).toBe(400)
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
