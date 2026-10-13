import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getSessionOrDev: vi.fn(), canManageCampaign: vi.fn(), getPredatorTypeSettings: vi.fn(), savePredatorTypeSettings: vi.fn(), getCharactersForCampaign: vi.fn(), getCharacterAccessRecord: vi.fn(), appendCharacterLedgerEvent: vi.fn(), persistPredatorTypeData: vi.fn() }))
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: mocks.getSessionOrDev }))
vi.mock('@/lib/auth/authorization', () => ({ canManageCampaign: mocks.canManageCampaign }))
vi.mock('@/lib/characters', () => ({ getCharactersForCampaign: mocks.getCharactersForCampaign, getCharacterAccessRecord: mocks.getCharacterAccessRecord, appendCharacterLedgerEvent: mocks.appendCharacterLedgerEvent }))
vi.mock('@/lib/predator-types', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/predator-types')>()), getPredatorTypeSettings: mocks.getPredatorTypeSettings, savePredatorTypeSettings: mocks.savePredatorTypeSettings, persistPredatorTypeData: mocks.persistPredatorTypeData }))

import { GET } from '../app/api/campaigns/[id]/predator-types/route'
import { PATCH } from '../app/api/campaigns/[id]/predator-types/settings/route'
import { POST } from '../app/api/characters/[id]/predator-type/override/route'

const campaignContext = { params: Promise.resolve({ id: '22222222-2222-4222-8222-222222222222' }) }
const characterContext = { params: Promise.resolve({ id: '11111111-1111-4111-8111-111111111111' }) }

describe('rotas do Mestre para tipos de predação', () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.getSessionOrDev.mockResolvedValue({ user: { sub: 'auth0|master' } }); mocks.canManageCampaign.mockResolvedValue(true); mocks.getPredatorTypeSettings.mockResolvedValue({ enabledSources: ['COREBOOK'], enabledCodes: null, disabledCodes: [] }); mocks.savePredatorTypeSettings.mockImplementation(async (_id, value) => value); mocks.getCharactersForCampaign.mockResolvedValue([]); mocks.getCharacterAccessRecord.mockResolvedValue({ id: '11111111-1111-4111-8111-111111111111', userId: 'auth0|owner', campaignId: '22222222-2222-4222-8222-222222222222', status: 'DRAFT', data: {} })
  })

  it('nega catálogo completo a quem não gerencia a campanha', async () => {
    mocks.canManageCampaign.mockResolvedValue(false)
    expect((await GET(new Request('http://localhost'), campaignContext)).status).toBe(403)
  })

  it('retorna os 28 tipos com dados privados ao Mestre', async () => {
    const response = await GET(new Request('http://localhost'), campaignContext); const body = await response.json()
    expect(body.predatorTypes).toHaveLength(28)
    expect(body.predatorTypes[0]).toHaveProperty('commonRisks')
  })

  it('habilita Players Guide e audita a configuração', async () => {
    const response = await PATCH(new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ enabledSources: ['COREBOOK', 'PLAYERS_GUIDE'], enabledCodes: null, disabledCodes: [] }) }), campaignContext)
    expect(response.status).toBe(200)
    expect(mocks.savePredatorTypeSettings).toHaveBeenCalledOnce()
  })

  it('cria e revoga override com justificativa e ledger', async () => {
    const create = await POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify({ ruleCode: 'PREDATOR_BAGGER_VENTRUE', action: 'CREATE', justification: 'Exceção aprovada para a crônica.' }) }), characterContext)
    expect(create.status).toBe(200)
    const created = await create.json()
    mocks.getCharacterAccessRecord.mockResolvedValue({ id: '11111111-1111-4111-8111-111111111111', campaignId: '22222222-2222-4222-8222-222222222222', data: { predatorTypeOverrides: created.overrides } })
    const revoke = await POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify({ ruleCode: 'PREDATOR_BAGGER_VENTRUE', action: 'REVOKE', justification: 'A exceção não é mais necessária.' }) }), characterContext)
    expect(revoke.status).toBe(200)
    expect(mocks.appendCharacterLedgerEvent).toHaveBeenCalledTimes(2)
  })

  it('recusa override sem justificativa', async () => {
    const response = await POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify({ ruleCode: 'X', action: 'CREATE', justification: '' }) }), characterContext)
    expect(response.status).toBe(400)
  })
})
