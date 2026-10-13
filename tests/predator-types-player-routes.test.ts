import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getSessionOrDev: vi.fn(), getCharacterAccessRecord: vi.fn(), appendCharacterLedgerEvent: vi.fn(), canManageCampaign: vi.fn(), isUserInCampaign: vi.fn(), getPredatorTypeSettings: vi.fn(), persistPredatorTypeData: vi.fn() }))
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: mocks.getSessionOrDev }))
vi.mock('@/lib/auth/authorization', () => ({ canManageCampaign: mocks.canManageCampaign }))
vi.mock('@/lib/availability', () => ({ isUserInCampaign: mocks.isUserInCampaign }))
vi.mock('@/lib/characters', () => ({ getCharacterAccessRecord: mocks.getCharacterAccessRecord, appendCharacterLedgerEvent: mocks.appendCharacterLedgerEvent }))
vi.mock('@/lib/predator-types', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/predator-types')>()), getPredatorTypeSettings: mocks.getPredatorTypeSettings, persistPredatorTypeData: mocks.persistPredatorTypeData }))

import { GET } from '@/app/api/predator-types/route'
import { POST } from '@/app/api/characters/[id]/predator-type/route'

const context = { params: Promise.resolve({ id: '11111111-1111-4111-8111-111111111111' }) }
const settings = { enabledSources: ['COREBOOK'] as const, enabledCodes: null, disabledCodes: [] }

describe('rotas públicas de tipos de predação', () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.getSessionOrDev.mockResolvedValue({ user: { sub: 'auth0|owner' } }); mocks.getPredatorTypeSettings.mockResolvedValue(settings); mocks.persistPredatorTypeData.mockResolvedValue(true); mocks.getCharacterAccessRecord.mockResolvedValue({ id: '11111111-1111-4111-8111-111111111111', userId: 'auth0|owner', campaignId: null, status: 'DRAFT', characterType: 'PLAYER_VAMPIRE', data: { cla: 'Toreador', humanidade: 7, 'potencia-de-sangue': 1 } })
  })

  it('exige autenticação no catálogo', async () => {
    mocks.getSessionOrDev.mockResolvedValue(null)
    expect((await GET(new Request('http://localhost/api/predator-types'))).status).toBe(401)
  })

  it('retorna somente os dez tipos básicos e não vaza campos privados', async () => {
    const response = await GET(new Request('http://localhost/api/predator-types?characterId=11111111-1111-4111-8111-111111111111'))
    const body = await response.json()
    expect(body.predatorTypes).toHaveLength(10)
    expect(body.predatorTypes[0]).not.toHaveProperty('commonRisks')
    expect(body.predatorTypes[0]).not.toHaveProperty('flawsOrCosts')
  })

  it('impede outro usuário de consultar a ficha', async () => {
    mocks.getSessionOrDev.mockResolvedValue({ user: { sub: 'auth0|other' } })
    expect((await GET(new Request('http://localhost/api/predator-types?characterId=11111111-1111-4111-8111-111111111111'))).status).toBe(403)
  })

  it('aplica uma seleção válida e gera ledger uma única vez', async () => {
    const request = () => new Request('http://localhost', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: 'SIREN', specialty: 'Persuasão (Sedução)', discipline: 'Presença', optionCodes: [] }) })
    const first = await POST(request(), context)
    expect(first.status).toBe(200)
    expect(mocks.persistPredatorTypeData).toHaveBeenCalledOnce()
    expect(mocks.appendCharacterLedgerEvent).not.toHaveBeenCalled()
    expect(mocks.persistPredatorTypeData).toHaveBeenCalledWith(expect.any(String), expect.any(Object), 'auth0|owner', expect.objectContaining({ eventType: 'PREDATOR_TYPE_APPLIED' }))
  })

  it('recusa ficha fora de rascunho e escolhas incompletas', async () => {
    mocks.getCharacterAccessRecord.mockResolvedValueOnce({ id: '11111111-1111-4111-8111-111111111111', userId: 'auth0|owner', campaignId: null, status: 'APPROVED', data: {} })
    const locked = await POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify({ code: 'SIREN' }) }), context)
    expect(locked.status).toBe(409)
    const incomplete = await POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify({ code: 'SIREN', specialty: '', discipline: '', optionCodes: [] }) }), context)
    expect(incomplete.status).toBe(422)
  })
})
