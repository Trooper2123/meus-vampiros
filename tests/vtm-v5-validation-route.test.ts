import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  canManageCampaign: vi.fn(),
  ensureAllTables: vi.fn(),
  getCharacterAccessRecord: vi.fn(),
  getSessionOrDev: vi.fn(),
  saveCharacterValidation: vi.fn(),
  appendCharacterLedgerEvent: vi.fn(),
}))

vi.mock('@/lib/auth0', () => ({ getSessionOrDev: mocks.getSessionOrDev }))
vi.mock('@/lib/auth/authorization', () => ({ canManageCampaign: mocks.canManageCampaign }))
vi.mock('@/lib/db', () => ({ ensureAllTables: mocks.ensureAllTables }))
vi.mock('@/lib/characters', () => ({
  appendCharacterLedgerEvent: mocks.appendCharacterLedgerEvent,
  getCharacterAccessRecord: mocks.getCharacterAccessRecord,
  saveCharacterValidation: mocks.saveCharacterValidation,
}))

import { POST } from '../app/api/characters/[id]/validate/route'

const CHARACTER_ID = '11111111-1111-4111-8111-111111111111'

function context(id = CHARACTER_ID) {
  return { params: Promise.resolve({ id }) }
}

function validPersistedData() {
  return {
    characterType: 'PLAYER_VAMPIRE',
    creationType: 'FLEDGLING',
    cla: 'Toreador',
    geracao: 13,
    humanidade: 7,
    'potencia-de-sangue': 1,
    forca: 4,
    destreza: 3,
    vigor: 3,
    carisma: 3,
    manipulacao: 2,
    compostura: 2,
    inteligencia: 2,
    raciocinio: 2,
    determinacao: 1,
    'convicoes-crenca-1': 'Proteger os inocentes',
    'convicoes-pilar-1': 'Helena',
    disciplinas: [
      { name: 'Presença', level: 2, powers: [{ name: 'Fascínio' }, { name: 'Assombro' }] },
      { name: 'Rapidez', level: 1, powers: [{ name: 'Reflexos rápidos' }] },
    ],
    predador: 'Siren',
    advantages: ['Recursos', 'Aliados'],
    flaws: ['Inimigo', 'Segredo sombrio'],
    vantagens: [{ name: 'Recursos', level: 3 }, { name: 'Aliados', level: 4 }], defeitos: [{ name: 'Inimigo', level: 1 }, { name: 'Segredo sombrio', level: 1 }],
  }
}

describe('POST /api/characters/[id]/validate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSessionOrDev.mockResolvedValue({ user: { sub: 'auth0|owner' } })
    mocks.canManageCampaign.mockResolvedValue(false)
    mocks.getCharacterAccessRecord.mockResolvedValue({
      id: CHARACTER_ID,
      userId: 'auth0|owner',
      campaignId: null,
      status: 'DRAFT',
      characterType: 'PLAYER_VAMPIRE',
      data: validPersistedData(),
    })
  })

  it('retorna 401 quando não há sessão', async () => {
    mocks.getSessionOrDev.mockResolvedValue(null)

    const response = await POST(new Request('http://localhost'), context())

    expect(response.status).toBe(401)
    expect(mocks.getCharacterAccessRecord).not.toHaveBeenCalled()
  })

  it('valida a ficha do dono e persiste o relatório', async () => {
    const response = await POST(new Request('http://localhost'), context())
    const report = await response.json()

    expect(response.status).toBe(200)
    expect(report).toMatchObject({ valid: true, errors: [], derived: { health: 6, willpower: 3 } })
    expect(mocks.saveCharacterValidation).toHaveBeenCalledWith(CHARACTER_ID, report)
    expect(mocks.appendCharacterLedgerEvent).toHaveBeenCalledWith(CHARACTER_ID, 'VALIDATION', 'RULE_ENGINE', expect.objectContaining({ valid: true }), 'auth0|owner')
  })

  it('retorna 403 para usuário sem acesso à ficha', async () => {
    mocks.getSessionOrDev.mockResolvedValue({ user: { sub: 'auth0|intruso' } })

    const response = await POST(new Request('http://localhost'), context())

    expect(response.status).toBe(403)
    expect(mocks.saveCharacterValidation).not.toHaveBeenCalled()
  })

  it('permite que o Mestre da campanha valide a ficha', async () => {
    mocks.getSessionOrDev.mockResolvedValue({ user: { sub: 'auth0|modelo.md' } })
    mocks.getCharacterAccessRecord.mockResolvedValue({
      id: CHARACTER_ID,
      userId: 'auth0|owner',
      campaignId: '22222222-2222-4222-8222-222222222222',
      status: 'DRAFT',
      characterType: 'PLAYER_VAMPIRE',
      data: validPersistedData(),
    })
    mocks.canManageCampaign.mockResolvedValue(true)

    const response = await POST(new Request('http://localhost'), context())

    expect(response.status).toBe(200)
    expect(mocks.saveCharacterValidation).toHaveBeenCalledOnce()
  })
})
