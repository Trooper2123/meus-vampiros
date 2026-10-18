import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createCharacter: vi.fn(),
  getSessionOrDev: vi.fn(),
  hasMasterAccess: vi.fn(),
}))

vi.mock('@/lib/auth0', () => ({ getSessionOrDev: mocks.getSessionOrDev }))
vi.mock('@/lib/campaigns', () => ({
  getCampaignById: vi.fn(),
  hasMasterAccess: mocks.hasMasterAccess,
}))
vi.mock('@/lib/characters', () => ({
  createCharacter: mocks.createCharacter,
  deleteCharacter: vi.fn(),
  getCharacterById: vi.fn(),
  getCharactersForCampaign: vi.fn(),
  normalizeDisciplines: vi.fn(),
  updateCharacter: vi.fn(),
  updateCharacterXp: vi.fn(),
}))
vi.mock('@/lib/db', () => ({ ensureAllTables: vi.fn() }))
vi.mock('@/lib/auth/authorization', () => ({
  canEditCharacter: vi.fn(),
  canManageCampaign: vi.fn(),
}))

import { POST } from '../app/api/characters/route'

function createRequest(characterType: string) {
  return new Request('http://localhost/api/characters', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Nova ficha', data: { characterType } }),
  })
}

describe('controle de tipos de ficha por perfil', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSessionOrDev.mockResolvedValue({ user: { sub: 'auth0|usuario' } })
    mocks.hasMasterAccess.mockResolvedValue(false)
    mocks.createCharacter.mockResolvedValue({ id: '11111111-1111-4111-8111-111111111111' })
  })

  it.each(['PLAYER_VAMPIRE', 'RETAINER'])('permite %s para jogador', async (characterType) => {
    const response = await POST(createRequest(characterType))

    expect(response.status).toBe(201)
    expect(mocks.createCharacter).toHaveBeenCalledOnce()
  })

  it.each(['HUMAN_NPC', 'VAMPIRE_NPC'])('recusa %s para jogador', async (characterType) => {
    const response = await POST(createRequest(characterType))

    expect(response.status).toBe(403)
    expect(mocks.createCharacter).not.toHaveBeenCalled()
  })

  it.each(['HUMAN_NPC', 'VAMPIRE_NPC'])('recusa %s fora da mesa mesmo para Mestre', async (characterType) => {
    mocks.hasMasterAccess.mockResolvedValue(true)

    const response = await POST(createRequest(characterType))

    expect(response.status).toBe(403)
    expect(mocks.createCharacter).not.toHaveBeenCalled()
  })
})
