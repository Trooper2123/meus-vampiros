import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getSessionOrDev: vi.fn(), canManageCampaign: vi.fn(), getPredatorTypeSettings: vi.fn(), savePredatorTypeSettings: vi.fn(), getCharactersForCampaign: vi.fn(), getCharacterAccessRecord: vi.fn(), appendCharacterLedgerEvent: vi.fn(), persistPredatorTypeData: vi.fn() }))
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: mocks.getSessionOrDev }))
vi.mock('@/lib/auth/authorization', () => ({ canManageCampaign: mocks.canManageCampaign }))
vi.mock('@/lib/characters', () => ({ getCharactersForCampaign: mocks.getCharactersForCampaign, getCharacterAccessRecord: mocks.getCharacterAccessRecord, appendCharacterLedgerEvent: mocks.appendCharacterLedgerEvent }))
vi.mock('@/lib/predator-types', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/predator-types')>()), getPredatorTypeSettings: mocks.getPredatorTypeSettings, savePredatorTypeSettings: mocks.savePredatorTypeSettings, persistPredatorTypeData: mocks.persistPredatorTypeData }))

import { GET } from '@/app/api/campaigns/[id]/predator-types/route'
import { GET as getClans } from '@/app/api/campaigns/[id]/clans/route'
import { PATCH } from '@/app/api/campaigns/[id]/predator-types/settings/route'
import { POST } from '@/app/api/characters/[id]/predator-type/override/route'

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

  it('protege o catálogo de clãs por sessão, identificador e Narrador atual', async () => {
    mocks.getSessionOrDev.mockResolvedValue(null)
    expect((await getClans(new Request('http://localhost'), campaignContext)).status).toBe(401)
    mocks.getSessionOrDev.mockResolvedValue({ user: { sub: 'auth0|master' } })
    expect((await getClans(new Request('http://localhost'), { params: Promise.resolve({ id: 'invalid' }) })).status).toBe(400)
    mocks.canManageCampaign.mockResolvedValue(false)
    expect((await getClans(new Request('http://localhost'), campaignContext)).status).toBe(403)
    expect(mocks.getCharactersForCampaign).not.toHaveBeenCalled()
  })

  it('projeta apenas clãs usados na mesa e não expõe dados das fichas', async () => {
    mocks.getCharactersForCampaign.mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }])
    mocks.getCharacterAccessRecord.mockImplementation(async (id: string) => ({ campaignId: id === 'c' ? 'other' : '22222222-2222-4222-8222-222222222222', data: id === 'a' ? { clanCode: 'BRUJAH', secret: 'privado' } : id === 'b' ? { cla: 'Brujah' } : { clanCode: 'VENTRUE' } }))
    const body = await (await getClans(new Request('http://localhost'), campaignContext)).json()
    expect(body.clans.map((clan: { code: string }) => clan.code)).toEqual(['BRUJAH'])
    expect(JSON.stringify(body)).not.toContain('privado')
  })

  it('retorna somente tipos utilizados, deduplicando nomes legados e ignorando outra mesa', async () => {
    mocks.getCharactersForCampaign.mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }])
    mocks.getCharacterAccessRecord.mockImplementation(async (id: string) => ({ campaignId: id === 'd' ? 'outra-mesa' : '22222222-2222-4222-8222-222222222222', data: id === 'a' ? { predatorTypeCode: 'SIREN' } : id === 'b' ? { predador: 'Sereia' } : id === 'c' ? { predador: 'desconhecido' } : { predatorTypeCode: 'ALLEYCAT' } }))
    const response = await GET(new Request('http://localhost'), campaignContext); const body = await response.json()
    expect(body.predatorTypes.map((entry: { code: string }) => entry.code)).toEqual(['SIREN'])
    expect(body.predatorTypes[0]).toHaveProperty('commonRisks')
  })

  it('não retorna catálogo completo quando não há personagens com predação', async () => {
    const response = await GET(new Request('http://localhost'), campaignContext)
    expect((await response.json()).predatorTypes).toEqual([])
  })

  it('habilita Players Guide e audita a configuração', async () => {
    const response = await PATCH(new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ enabledSources: ['COREBOOK', 'PLAYERS_GUIDE'], enabledCodes: null, disabledCodes: [] }) }), campaignContext)
    expect(response.status).toBe(200)
    expect(mocks.savePredatorTypeSettings).toHaveBeenCalledOnce()
  })

  it.each(['CREATE', 'REVOKE'])('override individual retirado não persiste %s', async action => {
    const response = await POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify({ ruleCode: 'PREDATOR_BAGGER_VENTRUE', action, justification: 'Tentativa de exceção individual.' }) }), characterContext)
    expect(response.status).toBe(410)
    expect(mocks.persistPredatorTypeData).not.toHaveBeenCalled()
  })

  it('exige autenticação para configuração e override', async () => {
    mocks.getSessionOrDev.mockResolvedValue(null)
    expect((await PATCH(new Request('http://localhost', { method: 'PATCH' }), campaignContext)).status).toBe(401)
    expect((await POST(new Request('http://localhost', { method: 'POST' }), characterContext)).status).toBe(401)
    expect(mocks.persistPredatorTypeData).not.toHaveBeenCalled()
  })

  it('nega override a outro Narrador e preserva a ficha', async () => {
    mocks.canManageCampaign.mockResolvedValue(false)
    expect((await POST(new Request('http://localhost', { method: 'POST' }), characterContext)).status).toBe(403)
    expect(mocks.persistPredatorTypeData).not.toHaveBeenCalled()
  })

  it('rejeita UUID inválido e configuração com campos forjados', async () => {
    expect((await PATCH(new Request('http://localhost', { method: 'PATCH' }), { params: Promise.resolve({ id: 'invalid' }) })).status).toBe(400)
    const response = await PATCH(new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ enabledSources: ['COREBOOK'], enabledCodes: null, disabledCodes: [], masterOverride: true }) }), campaignContext)
    expect(response.status).toBe(400)
    expect(mocks.savePredatorTypeSettings).not.toHaveBeenCalled()
  })
})
