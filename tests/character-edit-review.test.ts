import { beforeEach, describe, expect, it, vi } from 'vitest'

const session = vi.hoisted(() => { vi.stubEnv('DATABASE_URL', undefined); vi.stubEnv('NODE_ENV', 'test'); return vi.fn() })
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: session }))

import { updateCharacter, getCharacterById } from '@/lib/characters'
import { executeCharacterRoll } from '@/lib/character-rolls'
import { PUT } from '@/app/api/characters/route'
import { PATCH as transition } from '@/app/api/characters/[id]/status/route'
import { validateCharacter } from '@/lib/vtm-v5/validation'
import { normalizeCharacterRulesInput } from '@/lib/vtm-v5/normalize'

const id = '11111111-1111-4111-8111-111111111111'
const campaignId = '22222222-2222-4222-8222-222222222222'
const context = { params: Promise.resolve({ id }) }
const provider = { rollD10: vi.fn<(count: number) => number[]>() }
const roll = { attribute: 'forca', skillId: 'briga', difficulty: 1, visibility: 'PUBLIC' as const, reason: 'Teste', expectedRevision: 0, idempotencyKey: 'roll' }

function data() {
  return { characterType: 'PLAYER_VAMPIRE', creationType: 'FLEDGLING', cla: 'Toreador', geracao: 13, humanidade: 7, 'potencia-de-sangue': 1,
    forca: 4, destreza: 3, vigor: 3, carisma: 3, manipulacao: 2, compostura: 2, inteligencia: 2, raciocinio: 2, determinacao: 1,
    'habilidade-briga': 2, 'convicoes-crenca-1': 'Proteger os inocentes', 'convicoes-pilar-1': 'Helena', predador: 'Siren',
    disciplinas: [{ name: 'Presença', level: 2, powers: ['Fascínio', 'Assombro'] }, { name: 'Rapidez', level: 1, powers: ['Reflexos rápidos'] }],
    vantagens: [{ name: 'Recursos', level: 3 }, { name: 'Aliados', level: 4 }], defeitos: [{ name: 'Inimigo', level: 1 }, { name: 'Segredo sombrio', level: 1 }], masterOverride: false }
}
function request(body: unknown, method = 'PUT') {
  return new Request('http://localhost/api/characters', { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
}

describe('edição da ficha e revisão obrigatória', () => {
  beforeEach(() => {
    const now = new Date()
    const initial = data()
    global.__devDb = { characters: [{ id, userId: 'owner', createdByUserId: 'owner', name: 'Helena', concept: null, clan: 'Toreador', generation: '13', status: 'APPROVED', characterType: 'PLAYER_VAMPIRE', campaignId, data: initial, totalXp: 10, spentXp: 3, revision: 0, gameState: { hunger: 2, healthDamage: { superficial: 1, aggravated: 0 }, willpowerDamage: { superficial: 0, aggravated: 0 }, condition: 'ACTIVE' }, validationReport: validateCharacter(normalizeCharacterRulesInput(initial)), createdAt: now, updatedAt: now }], campaigns: [{ id: campaignId, masterUserId: 'narrator', name: 'Mesa', theme: null, principios: null, averageXp: null, status: 'Ativa', lastSessionAt: null, createdAt: now, updatedAt: now }], possessions: [], characterLedgerEvents: [] }
    session.mockReset()
    session.mockResolvedValue({ user: { sub: 'owner' } })
    provider.rollD10.mockReset()
    provider.rollD10.mockImplementation(count => Array(count).fill(6))
  })

  it('mudar mecânica de ficha aprovada persiste rascunho e impede rolagem até nova revisão', async () => {
    const previous = await getCharacterById(id, 'owner')
    expect(previous).toMatchObject({ status: 'APPROVED', revision: 0 })
    await updateCharacter(id, 'owner', { data: { forca: 3, destreza: 4 }, expectedRevision: 0 })
    expect(global.__devDb!.characters[0]).toMatchObject({ status: 'DRAFT', revision: 1, data: { forca: 3, destreza: 4 } })
    await expect(executeCharacterRoll('owner', id, { ...roll, expectedRevision: 1 }, provider)).rejects.toMatchObject({ status: 422 })
    expect(provider.rollD10).not.toHaveBeenCalled()
    expect((await transition(request({ status: 'PENDING_REVIEW', expectedRevision: 1 }, 'PATCH'), context)).status).toBe(200)
    session.mockResolvedValue({ user: { sub: 'narrator' } })
    expect((await transition(request({ status: 'APPROVED', expectedRevision: 2 }, 'PATCH'), context)).status).toBe(200)
    expect(await executeCharacterRoll('owner', id, { ...roll, expectedRevision: 3 }, provider)).toMatchObject({ pool: 5 })
  })

  it('status APPROVED manual não permite rolar ficha com relatório inválido', async () => {
    global.__devDb!.characters[0].data.carisma = 0
    global.__devDb!.characters[0].validationReport = validateCharacter(normalizeCharacterRulesInput(global.__devDb!.characters[0].data))
    await expect(executeCharacterRoll('owner', id, roll, provider)).rejects.toMatchObject({ status: 422 })
    expect(provider.rollD10).not.toHaveBeenCalled()
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
  })

  it('API exige revisão e rejeita snapshot antigo sem desfazer edição concorrente', async () => {
    expect((await PUT(request({ id, name: 'Novo nome' }))).status).toBe(409)
    await updateCharacter(id, 'owner', { data: { forca: 3, destreza: 4 }, expectedRevision: 0 })
    expect((await PUT(request({ id, data: { forca: 4, destreza: 3 }, expectedRevision: 0 }))).status).toBe(409)
    session.mockResolvedValue({ user: { sub: 'narrator' } })
    expect((await transition(request({ status: 'APPROVED', expectedRevision: 0 }, 'PATCH'), context)).status).toBe(409)
    expect(global.__devDb!.characters[0]).toMatchObject({ status: 'DRAFT', revision: 1, data: { forca: 3, destreza: 4 } })
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(1)
  })

  it('edição geral não aceita XP, predador, overrides ou aprovação forjados', async () => {
    const result = await PUT(request({ id, expectedRevision: 0, status: 'APPROVED', totalXp: 999, spentXp: 0, data: { notas: 'Pessoais', 'experiencia-total': 999, 'experiencia-gasta': 0, totalXp: 999, spentXp: 0, masterOverride: true, predador: 'Blood Leech', predatorTypeCode: 'BLOOD_LEECH', predatorTypeOverrides: [{ ruleCode: 'IGNORE' }], predatorTypeSelection: { code: 'BLOOD_LEECH' } } }))
    expect(result.status).toBe(200)
    expect(global.__devDb!.characters[0]).toMatchObject({ totalXp: 10, spentXp: 3, status: 'APPROVED', data: { predador: 'Siren', masterOverride: false, notas: 'Pessoais' } })
    expect(global.__devDb!.characters[0].data).not.toHaveProperty('predatorTypeOverrides')
    expect(global.__devDb!.characters[0].data).not.toHaveProperty('totalXp')
    expect(global.__devDb!.characters[0].data).not.toHaveProperty('experiencia-total')
  })

  it.each(['ARCHIVED', 'DISABLED'])('ficha %s não é editada nem reativada pela edição', async status => {
    global.__devDb!.characters[0].status = status
    const before = structuredClone(global.__devDb!.characters[0])
    await expect(updateCharacter(id, 'owner', { data: { forca: 3 }, expectedRevision: 0 })).rejects.toMatchObject({ status: 409 })
    expect((await PUT(request({ id, name: 'Nome forjado', expectedRevision: 0 }))).status).toBe(409)
    expect(global.__devDb!.characters[0]).toEqual(before)
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
  })

  it('terceiro não edita ficha nem eleva personagem alterando status no JSON', async () => {
    session.mockResolvedValue({ user: { sub: 'other' } })
    expect((await PUT(request({ id, expectedRevision: 0, status: 'APPROVED', data: { forca: 5 } }))).status).toBe(403)
    expect(global.__devDb!.characters[0]).toMatchObject({ revision: 0, data: { forca: 4 } })
  })
})
