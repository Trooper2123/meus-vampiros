import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  canManageCampaign: vi.fn(),
  ensureAllTables: vi.fn(),
  getCharacterAccessRecord: vi.fn(),
  getSessionOrDev: vi.fn(),
  saveCharacterValidation: vi.fn(),
  setCharacterStatus: vi.fn(),
  appendCharacterLedgerEvent: vi.fn(),
}))

vi.mock('@/lib/auth0', () => ({ getSessionOrDev: mocks.getSessionOrDev }))
vi.mock('@/lib/auth/authorization', () => ({ canManageCampaign: mocks.canManageCampaign }))
vi.mock('@/lib/db', () => ({ ensureAllTables: mocks.ensureAllTables }))
vi.mock('@/lib/characters', () => ({
  appendCharacterLedgerEvent: mocks.appendCharacterLedgerEvent,
  getCharacterAccessRecord: mocks.getCharacterAccessRecord,
  saveCharacterValidation: mocks.saveCharacterValidation,
  setCharacterStatus: mocks.setCharacterStatus,
}))

import { PATCH } from '../app/api/characters/[id]/status/route'

const CHARACTER_ID = '11111111-1111-4111-8111-111111111111'
const CAMPAIGN_ID = '22222222-2222-4222-8222-222222222222'

function request(status: string) {
  return new Request('http://localhost', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status }),
  })
}

function context() {
  return { params: Promise.resolve({ id: CHARACTER_ID }) }
}

function validData() {
  return {
    creationType: 'FLEDGLING', cla: 'Toreador', geracao: 13, humanidade: 7, 'potencia-de-sangue': 1,
    forca: 4, destreza: 3, vigor: 3, carisma: 3, manipulacao: 2, compostura: 2, inteligencia: 2, raciocinio: 2, determinacao: 1,
    'convicoes-crenca-1': 'Proteger os inocentes', 'convicoes-pilar-1': 'Helena', predador: 'Siren',
    disciplinas: [{ name: 'Presença', level: 2, powers: ['Fascínio', 'Assombro'] }, { name: 'Rapidez', level: 1, powers: ['Reflexos rápidos'] }],
    advantages: ['Recursos', 'Aliados'], flaws: ['Inimigo', 'Segredo sombrio'],
  }
}

describe('PATCH /api/characters/[id]/status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSessionOrDev.mockResolvedValue({ user: { sub: 'auth0|owner' } })
    mocks.canManageCampaign.mockResolvedValue(false)
    mocks.getCharacterAccessRecord.mockResolvedValue({
      id: CHARACTER_ID, userId: 'auth0|owner', campaignId: CAMPAIGN_ID,
      status: 'DRAFT', characterType: 'PLAYER_VAMPIRE', data: validData(),
    })
  })

  it('permite que o dono envie uma ficha válida para revisão', async () => {
    const response = await PATCH(request('PENDING_REVIEW'), context())

    expect(response.status).toBe(200)
    expect(mocks.setCharacterStatus).toHaveBeenCalledWith(CHARACTER_ID, 'PENDING_REVIEW')
    expect(mocks.appendCharacterLedgerEvent).toHaveBeenCalledWith(CHARACTER_ID, 'STATUS_CHANGE', 'USER_ACTION', { from: 'DRAFT', to: 'PENDING_REVIEW' }, 'auth0|owner')
  })

  it('bloqueia o envio de uma ficha inválida', async () => {
    mocks.getCharacterAccessRecord.mockResolvedValue({
      id: CHARACTER_ID, userId: 'auth0|owner', campaignId: CAMPAIGN_ID,
      status: 'DRAFT', characterType: 'PLAYER_VAMPIRE', data: {},
    })

    const response = await PATCH(request('PENDING_REVIEW'), context())

    expect(response.status).toBe(422)
    expect(mocks.setCharacterStatus).not.toHaveBeenCalled()
  })

  it('permite que somente o Mestre aprove uma ficha válida', async () => {
    mocks.getSessionOrDev.mockResolvedValue({ user: { sub: 'auth0|mestre' } })
    mocks.canManageCampaign.mockResolvedValue(true)
    mocks.getCharacterAccessRecord.mockResolvedValue({
      id: CHARACTER_ID, userId: 'auth0|owner', campaignId: CAMPAIGN_ID,
      status: 'PENDING_REVIEW', characterType: 'PLAYER_VAMPIRE', data: validData(),
    })

    const response = await PATCH(request('APPROVED'), context())

    expect(response.status).toBe(200)
    expect(mocks.setCharacterStatus).toHaveBeenCalledWith(CHARACTER_ID, 'APPROVED')
  })

  it('rejeita aprovação de ficha inválida pelo Mestre', async () => {
    mocks.getSessionOrDev.mockResolvedValue({ user: { sub: 'auth0|mestre' } })
    mocks.canManageCampaign.mockResolvedValue(true)
    mocks.getCharacterAccessRecord.mockResolvedValue({
      id: CHARACTER_ID, userId: 'auth0|owner', campaignId: CAMPAIGN_ID,
      status: 'PENDING_REVIEW', characterType: 'PLAYER_VAMPIRE', data: {},
    })

    const response = await PATCH(request('APPROVED'), context())

    expect(response.status).toBe(422)
    expect(mocks.setCharacterStatus).not.toHaveBeenCalled()
  })

  it('retorna 409 para transição inexistente', async () => {
    const response = await PATCH(request('APPROVED'), context())

    expect(response.status).toBe(409)
    expect(mocks.setCharacterStatus).not.toHaveBeenCalled()
  })
})
