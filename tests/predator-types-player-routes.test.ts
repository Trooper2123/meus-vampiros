import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getSessionOrDev: vi.fn(), getCharacterAccessRecord: vi.fn(), appendCharacterLedgerEvent: vi.fn(), canManageCampaign: vi.fn(), isUserInCampaign: vi.fn(), getPredatorTypeSettings: vi.fn(), persistPredatorTypeData: vi.fn() }))
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: mocks.getSessionOrDev }))
vi.mock('@/lib/campaign-invitations', () => ({ campaignPredatorOverrides: vi.fn().mockResolvedValue([]) }))
vi.mock('@/lib/auth/authorization', () => ({ canManageCampaign: mocks.canManageCampaign }))
vi.mock('@/lib/availability', () => ({ isUserInCampaign: mocks.isUserInCampaign }))
vi.mock('@/lib/characters', () => ({ getCharacterAccessRecord: mocks.getCharacterAccessRecord, appendCharacterLedgerEvent: mocks.appendCharacterLedgerEvent }))
vi.mock('@/lib/predator-types', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/predator-types')>()), getPredatorTypeSettings: mocks.getPredatorTypeSettings, persistPredatorTypeData: mocks.persistPredatorTypeData }))

import { GET } from '@/app/api/predator-types/route'
import { POST } from '@/app/api/characters/[id]/predator-type/route'
import { PREDATOR_TYPE_BY_CODE, type PredatorTypeCode } from '@/lib/vtm-v5/predator-types'

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
  it('mantém predações desabilitadas visíveis com motivo e confirmação bloqueada', async () => {
    mocks.getPredatorTypeSettings.mockResolvedValue({ ...settings, disabledCodes: ['CONFIDANT'] })
    mocks.getCharacterAccessRecord.mockResolvedValue({ id: '11111111-1111-4111-8111-111111111111', userId: 'auth0|owner', campaignId: '22222222-2222-4222-8222-222222222222', status: 'DRAFT', data: { cla: 'Malkavian' } })
    const response = await GET(new Request('http://localhost/api/predator-types?characterId=11111111-1111-4111-8111-111111111111'))
    const body = await response.json()
    expect(body.predatorTypes.find((entry: { code: string }) => entry.code === 'CONFIDANT')).toMatchObject({ selectable: false, publicWarnings: [expect.objectContaining({ blocking: true, code: 'PREDATOR_TYPE_DISABLED_FOR_CAMPAIGN' })] })
  })

  it('permite consultar e escolher tipos sem habilitação de Narrador em ficha independente', async () => {
    const response = await GET(new Request('http://localhost/api/predator-types?characterId=11111111-1111-4111-8111-111111111111'))
    const body = await response.json()
    expect(body.predatorTypes).toHaveLength(41)
    expect(body.predatorTypes.find((entry: { code: string }) => entry.code === 'BUSINESS_OWNER')).toMatchObject({ selectable: true, publicWarnings: [] })
    expect(body.predatorTypes[0]).not.toHaveProperty('commonRisks')
    expect(body.predatorTypes[0]).not.toHaveProperty('flawsOrCosts')
  })

  it('impede outro usuário de consultar a ficha', async () => {
    mocks.getSessionOrDev.mockResolvedValue({ user: { sub: 'auth0|other' } })
    expect((await GET(new Request('http://localhost/api/predator-types?characterId=11111111-1111-4111-8111-111111111111'))).status).toBe(403)
  })

  it('retorna escolhas salvas projetadas para restaurar o seletor sem campos privados', async () => {
    mocks.getCharacterAccessRecord.mockResolvedValueOnce({ userId: 'auth0|owner', campaignId: null, data: { predatorTypeCode: 'OSIRIS', predatorTypeSelection: { code: 'OSIRIS', specialty: 'Performance (Canto)', discipline: 'Presença', optionCodes: ['FOLLOWERS:FAME:2'], privateNarratorNote: 'segredo' } } })
    const response = await GET(new Request('http://localhost/api/predator-types?characterId=11111111-1111-4111-8111-111111111111'))
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    const body = await response.json()
    expect(body.selection).toEqual({ code: 'OSIRIS', specialty: 'Performance (Canto)', discipline: 'Presença', optionCodes: ['FOLLOWERS:FAME:2'] })
    expect(JSON.stringify(body)).not.toContain('segredo')
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

  it.each(['SABBAT_RECLAIMER', 'TITHE_COLLECTOR'] as PredatorTypeCode[])('recusa %s mesmo com fonte habilitada e perfil enviado pelo cliente', async code => {
    mocks.getPredatorTypeSettings.mockResolvedValue({ enabledSources: ['COREBOOK'], enabledCodes: [code], disabledCodes: [] })
    const entry = PREDATOR_TYPE_BY_CODE.get(code)!
    const body = { code, specialty: entry.specialtyOptions[0], discipline: entry.disciplineOptions[0], optionCodes: (entry.choiceGroups ?? []).map(group => `${group.code}:${group.options[0].code}:${group.totalDots}`), creationType: 'ANCILLA' }
    const response = await POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify(body) }), context)
    expect(response.status).toBe(422)
    expect(mocks.persistPredatorTypeData).not.toHaveBeenCalled()
  })

  it.each([1, 3, 5])('registra a pontuação %i definida pelo jogador quando a fonte não informa o custo', async dots => {
    const entry = PREDATOR_TYPE_BY_CODE.get('ROADSIDE_KILLER')!
    const optionCodes = [`PREY_EXCLUSION:LOCAL_RESIDENTS:${dots}`]
    const response = await POST(new Request('http://localhost', { method: 'POST', body: JSON.stringify({ code: entry.code, specialty: entry.specialtyOptions[0], discipline: entry.disciplineOptions[0], optionCodes }) }), context)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ selection: { code: entry.code, optionCodes } })
    expect(mocks.persistPredatorTypeData).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ predatorTypeSelection: expect.objectContaining({ optionCodes }) }), 'auth0|owner', expect.any(Object))
  })

  it('permite Extorsionista em ficha independente sem habilitação de Narrador', async () => {
    const entry = PREDATOR_TYPE_BY_CODE.get('EXTORTIONIST')!
    const request = () => new Request('http://localhost', { method: 'POST', body: JSON.stringify({ code: entry.code, specialty: entry.specialtyOptions[0], discipline: 'Dominação', optionCodes: ['PROTECTION:CONTACTS:1', 'PROTECTION:RESOURCES:2'] }) })
    expect((await POST(request(), context)).status).toBe(200)
    expect(mocks.persistPredatorTypeData).toHaveBeenCalledOnce()
  })
})
