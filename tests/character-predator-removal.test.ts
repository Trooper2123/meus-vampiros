import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applyPredatorTypeSelection, removePredatorTypeSelection, PREDATOR_TYPE_BY_CODE } from '@/lib/vtm-v5/predator-types'

const mocks = vi.hoisted(() => ({ session: vi.fn(), access: vi.fn(), persist: vi.fn(), ledger: vi.fn() }))
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: mocks.session }))
vi.mock('@/lib/characters', () => ({ getCharacterAccessRecord: mocks.access, appendCharacterLedgerEvent: mocks.ledger }))
vi.mock('@/lib/predator-types', () => ({ persistPredatorTypeData: mocks.persist, getPredatorTypeSettings: vi.fn(), isPredatorTypeEnabled: vi.fn() }))

import { DELETE } from '@/app/api/characters/[id]/predator-type/route'

const id = '11111111-1111-4111-8111-111111111111'
const context = { params: Promise.resolve({ id }) }
const request = () => new Request('http://localhost', { method: 'DELETE' })

describe('remoção de predador e recursos consumidos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.session.mockResolvedValue({ user: { sub: 'owner' } })
    mocks.access.mockResolvedValue({ userId: 'owner', status: 'DRAFT', data: { predador: 'Alleycat', humanidade: 6 } })
  })

  it('troca e remove modificadores preservando perdas posteriores de Humanidade', () => {
    const alleycat = PREDATOR_TYPE_BY_CODE.get('ALLEYCAT')!
    const consensualist = PREDATOR_TYPE_BY_CODE.get('CONSENSUALIST')!
    const selection = { code: alleycat.code, specialty: '', discipline: '', optionCodes: [] }
    const original = applyPredatorTypeSelection({ humanidade: 7 }, alleycat, selection).data
    const consumed = { ...original, humanidade: 4 }
    const changed = applyPredatorTypeSelection(consumed, consensualist, { ...selection, code: consensualist.code }).data
    expect(changed.humanidade).toBe(6)
    const removed = removePredatorTypeSelection(changed)
    expect(removed.humanidade).toBe(5)
    expect(removed).not.toHaveProperty('predatorTypeSelection')
    expect(removed).not.toHaveProperty('predatorTypeCode')
    expect(removePredatorTypeSelection(removed).humanidade).toBe(5)
  })

  it('permite remoção pelo proprietário em rascunho', async () => {
    expect((await DELETE(request(), context)).status).toBe(200)
    expect(mocks.persist).toHaveBeenCalledWith(id, expect.objectContaining({ predador: '', humanidade: 6 }), 'owner', expect.objectContaining({ eventType: 'PREDATOR_TYPE_REMOVED' }))
    expect(mocks.ledger).not.toHaveBeenCalled()
  })

  it('recusa acesso não autenticado e de terceiros', async () => {
    mocks.session.mockResolvedValueOnce(null)
    expect((await DELETE(request(), context)).status).toBe(401)
    mocks.access.mockResolvedValue({ userId: 'other', status: 'DRAFT', data: {} })
    expect((await DELETE(request(), context)).status).toBe(403)
    expect(mocks.persist).not.toHaveBeenCalled()
  })

  it('recusa remoção de ficha aprovada e UUID inválido', async () => {
    mocks.access.mockResolvedValue({ userId: 'owner', status: 'APPROVED', data: {} })
    expect((await DELETE(request(), context)).status).toBe(409)
    expect((await DELETE(request(), { params: Promise.resolve({ id: 'invalid' }) })).status).toBe(400)
    expect(mocks.persist).not.toHaveBeenCalled()
  })
})
