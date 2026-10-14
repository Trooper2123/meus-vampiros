import { beforeEach, describe, expect, it, vi } from 'vitest'

const session = vi.hoisted(() => { vi.stubEnv('DATABASE_URL', undefined); vi.stubEnv('NODE_ENV', 'test'); return vi.fn() })
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: session }))

import { getClanView, selectCharacterClan } from '@/lib/character-clans'
import { updateCharacter } from '@/lib/characters'
import { duplicateCharacter } from '@/lib/characters'
import { persistPredatorTypeData } from '@/lib/predator-types'
import { applyPredatorTypeSelection, PREDATOR_TYPE_BY_CODE, removePredatorTypeSelection } from '@/lib/vtm-v5/predator-types'
import { GET, POST } from '@/app/api/characters/[id]/clan/route'
import type { ClanSelection } from '@/lib/vtm-v5/clans'

const id = '11111111-1111-4111-8111-111111111111'
const campaignId = '22222222-2222-4222-8222-222222222222'
const key = '33333333-3333-4333-8333-333333333333'
const context = { params: Promise.resolve({ id }) }
const selection: ClanSelection = { code: 'NOSFERATU', disciplineDots: { Animalismo: 2, Ofuscação: 1 } }
const stored = () => global.__devDb!.characters[0]
const request = (body: unknown) => new Request(`http://localhost/api/characters/${id}/clan`, { method: 'POST', body: JSON.stringify(body) })

describe('clã: comandos, origens e autorização em memória', () => {
  beforeEach(() => {
    const now = new Date()
    global.__devDb = {
      characters: [{ id, userId: 'player', createdByUserId: 'player', name: 'Helena', concept: null, clan: null, generation: null, status: 'DRAFT', characterType: 'PLAYER_VAMPIRE', campaignId, data: { humanidade: 7, 'potencia-de-sangue': 1 }, totalXp: 10, spentXp: 0, revision: 0, gameState: {}, createdAt: now, updatedAt: now }],
      campaigns: [{ id: campaignId, masterUserId: 'narrator', name: 'Mesa', theme: null, principios: null, averageXp: null, status: 'Ativa', lastSessionAt: null, createdAt: now, updatedAt: now }], possessions: [], characterLedgerEvents: [],
    }
    session.mockReset()
    session.mockResolvedValue({ user: { sub: 'player' } })
  })

  it('aplica uma vez, rastreia o defeito e rejeita revisão obsoleta', async () => {
    const first = await selectCharacterClan(id, 'player', selection, 0, key)
    expect(await selectCharacterClan(id, 'player', selection, 0, key)).toEqual(first)
    expect(stored().data).toMatchObject({ cla: 'Nosferatu', clanCode: 'NOSFERATU', creationFlawDots: 2 })
    expect(stored().data.defeitos).toEqual([expect.objectContaining({ id: 'grant:CLAN:FLAW:Repulsivo', level: 2 })])
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(1)
    await expect(selectCharacterClan(id, 'player', selection, 0, 'stale')).rejects.toMatchObject({ status: 409 })
  })

  it('troca apenas concessões e preserva pontos externos e traços pessoais', async () => {
    await selectCharacterClan(id, 'player', selection, 0, key)
    const rows = stored().data.disciplinas as { name: string; level: number }[]
    rows[0].level += 1
    stored().data.defeitos = [...stored().data.defeitos as object[], { name: 'Pessoal', level: 1 }]
    await selectCharacterClan(id, 'player', { code: 'BRUJAH', disciplineDots: { Rapidez: 2, Potência: 1 } }, 1, 'change')
    expect(stored().data.disciplinas).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'Animalismo', level: 1 }), expect.objectContaining({ name: 'Rapidez', level: 2 })]))
    expect(stored().data.defeitos).toEqual([{ name: 'Pessoal', level: 1 }])
    expect(stored().data.creationFlawDots).toBe(0)
  })

  it('não sobrescreve alocação existente incompatível nem permite apagar concessão', async () => {
    stored().data.disciplinas = [{ id: 'old', name: 'Potência', level: 3 }]
    await expect(selectCharacterClan(id, 'player', selection, 0, key)).rejects.toMatchObject({ status: 409 })
    expect(stored().revision).toBe(0)
    stored().data.disciplinas = []
    await selectCharacterClan(id, 'player', selection, 0, key)
    await expect(updateCharacter(id, 'player', { data: { disciplinas: [] }, expectedRevision: 1 })).rejects.toMatchObject({ status: 422 })
    await expect(updateCharacter(id, 'player', { data: { cla: 'Tremere' }, expectedRevision: 1 })).rejects.toMatchObject({ status: 422 })
  })

  it('valida isolamento e oculta orientações do Narrador', async () => {
    await expect(getClanView(id, 'other')).rejects.toMatchObject({ status: 403 })
    expect((await getClanView(id, 'player')).clans[0]).not.toHaveProperty('guidance')
    expect((await getClanView(id, 'narrator')).clans[0]).toHaveProperty('guidance')
    await expect(selectCharacterClan(id, 'other', selection, 0, key)).rejects.toMatchObject({ status: 403 })
    stored().status = 'APPROVED'
    await expect(selectCharacterClan(id, 'player', selection, 0, key)).rejects.toMatchObject({ status: 409 })
    await selectCharacterClan(id, 'narrator', selection, 0, key)
    expect(stored().status).toBe('DRAFT')
  })

  it('aplica exceções Caitiff/sangue-fraco e restrições cruzadas', async () => {
    stored().data.predatorTypeCode = 'SIREN'
    await expect(selectCharacterClan(id, 'player', selection, 0, key)).rejects.toMatchObject({ status: 422 })
    await expect(selectCharacterClan(id, 'player', { code: 'THIN_BLOOD', disciplineDots: {} }, 0, key)).rejects.toMatchObject({ status: 422 })
    delete stored().data.predatorTypeCode
    await selectCharacterClan(id, 'player', { code: 'THIN_BLOOD', disciplineDots: {} }, 0, key)
    expect(stored().data).toMatchObject({ isThinBlood: true, cla: '', 'potencia-de-sangue': 0 })
  })

  it('retorna 401/403/400 e rejeita campos forjados na API', async () => {
    session.mockResolvedValue(null)
    expect((await GET(new Request('http://localhost'), context)).status).toBe(401)
    expect((await POST(request({}), context)).status).toBe(401)
    session.mockResolvedValue({ user: { sub: 'other' } })
    expect((await GET(new Request('http://localhost'), context)).status).toBe(403)
    session.mockResolvedValue({ user: { sub: 'player' } })
    expect((await POST(request({ selection, expectedRevision: 0, key, masterOverride: true }), context)).status).toBe(400)
    expect((await POST(request({ selection, expectedRevision: 0, key }), context)).status).toBe(200)
    expect((await GET(new Request('http://localhost'), { params: Promise.resolve({ id: 'invalid' }) })).status).toBe(400)
  })

  it('predação independente concede especialidade automaticamente, inclusive na cópia', async () => {
    stored().campaignId = null
    stored().data['habilidade-persuasao'] = 2
    const definition = PREDATOR_TYPE_BY_CODE.get('SIREN')!
    const applied = applyPredatorTypeSelection(stored().data, definition, { code: 'SIREN', specialty: 'Persuasão (Sedução)', discipline: 'Presença', optionCodes: [] })
    await persistPredatorTypeData(id, applied.data, 'player', { expectedRevision: 0, eventType: 'PREDATOR_TYPE_APPLIED', payload: {} })
    expect(stored().gameState!.specialties).toEqual([expect.objectContaining({ status: 'APPROVED', origin: 'PREDATOR' })])
    const copy = await duplicateCharacter(id, 'player')
    expect(global.__devDb!.characters.find(entry => entry.id === copy!.id)!.gameState!.specialties).toEqual([expect.objectContaining({ status: 'APPROVED' })])
  })

  it('predação independente concede especialidade automaticamente, inclusive na cópia', async () => {
    stored().campaignId = null
    stored().data['habilidade-persuasao'] = 2
    const definition = PREDATOR_TYPE_BY_CODE.get('SIREN')!
    const applied = applyPredatorTypeSelection(stored().data, definition, { code: 'SIREN', specialty: 'Persuasão (Sedução)', discipline: 'Presença', optionCodes: [] })
    await persistPredatorTypeData(id, applied.data, 'player', { expectedRevision: 0, eventType: 'PREDATOR_TYPE_APPLIED', payload: {} })
    expect(stored().gameState!.specialties).toEqual([expect.objectContaining({ status: 'APPROVED', origin: 'PREDATOR' })])
    const copy = await duplicateCharacter(id, 'player')
    expect(global.__devDb!.characters.find(entry => entry.id === copy!.id)!.gameState!.specialties).toEqual([expect.objectContaining({ status: 'APPROVED' })])
  })

  it('materializa predação, não duplica concessões e reverte somente sua origem', async () => {
    stored().data['habilidade-persuasao'] = 2
    await selectCharacterClan(id, 'player', { code: 'TOREADOR', disciplineDots: { Auspícios: 2, Presença: 1 } }, 0, key)
    const definition = PREDATOR_TYPE_BY_CODE.get('SIREN')!
    const applied = applyPredatorTypeSelection(stored().data, definition, { code: 'SIREN', specialty: 'Persuasão (Sedução)', discipline: 'Presença', optionCodes: [] })
    await persistPredatorTypeData(id, applied.data, 'player', { expectedRevision: 1, eventType: 'PREDATOR_TYPE_APPLIED', payload: {} })
    expect(stored().data.disciplinas).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'Presença', level: 2 })]))
    expect(stored().gameState!.specialties).toEqual([expect.objectContaining({ origin: 'PREDATOR', status: 'PENDING', costXp: 0 })])
    await persistPredatorTypeData(id, stored().data, 'player', { expectedRevision: 2, eventType: 'PREDATOR_TYPE_APPLIED', payload: {} })
    expect(stored().data.creationAdvantageDots).toBe(2)
    expect(stored().gameState!.specialties).toHaveLength(1)
    stored().gameState!.humanity = 5
    await persistPredatorTypeData(id, removePredatorTypeSelection(stored().data), 'player', { expectedRevision: 3, eventType: 'PREDATOR_TYPE_REMOVED', payload: {} })
    expect(stored().data.disciplinas).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'Presença', level: 1 })]))
    expect(stored().data.creationAdvantageDots).toBe(0)
    expect(stored().gameState!.specialties).toHaveLength(0)
    expect(stored().spentXp).toBe(0)
    expect(stored().gameState!.humanity).toBe(5)
  })

  it('copia origens públicas sem aprovação da mesa ou dados privados', async () => {
    await selectCharacterClan(id, 'player', selection, 0, key)
    stored().gameState!.privateNarratorNotes = 'não copiar'
    const copy = await duplicateCharacter(id, 'player')
    const character = global.__devDb!.characters.find(entry => entry.id === copy!.id)!
    expect(character.data.clanCode).toBe('NOSFERATU')
    expect(character.data.creationFlawDots).toBe(2)
    expect(character.gameState!.creationEffects).toHaveLength(3)
    expect(character.gameState).not.toHaveProperty('privateNarratorNotes')
    expect(character.campaignId).toBeNull()
    await selectCharacterClan(character.id, 'player', { code: 'BRUJAH', disciplineDots: { Rapidez: 2, Potência: 1 } }, 0, 'new-copy')
    expect(character.data.disciplinas).toHaveLength(2)
  })

  it('rejeita especialidade sem habilidade e Feitiçaria de Sangue fora de Tremere', async () => {
    const definition = PREDATOR_TYPE_BY_CODE.get('BAGGER')!
    stored().data.cla = 'Toreador'
    stored().data['habilidade-ladroagem'] = 1
    const applied = applyPredatorTypeSelection(stored().data, definition, { code: 'BAGGER', specialty: 'Ladroagem (Arrombamento)', discipline: 'Feitiçaria de Sangue', optionCodes: [] })
    await expect(persistPredatorTypeData(id, applied.data, 'player', { expectedRevision: 0, eventType: 'PREDATOR_TYPE_APPLIED', payload: {} })).rejects.toMatchObject({ status: 422 })
    expect(stored().revision).toBe(0)
    delete stored().data['habilidade-ladroagem']
    applied.data.predatorTypeSelection = { ...applied.data.predatorTypeSelection, discipline: 'Ofuscação' }
    await expect(persistPredatorTypeData(id, applied.data, 'player', { expectedRevision: 0, eventType: 'PREDATOR_TYPE_APPLIED', payload: {} })).rejects.toMatchObject({ status: 422 })
  })
})
