import { beforeEach, describe, expect, it, vi } from 'vitest'

const session = vi.hoisted(() => { vi.stubEnv('DATABASE_URL', undefined); vi.stubEnv('NODE_ENV', 'test'); return vi.fn() })
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: session }))
import { PATCH } from '@/app/api/characters/[id]/status/route'

const id = '11111111-1111-4111-8111-111111111111'
const campaignId = '22222222-2222-4222-8222-222222222222'
const context = { params: Promise.resolve({ id }) }

function validData() {
  return { creationType: 'FLEDGLING', cla: 'Toreador', geracao: 13, humanidade: 7, 'potencia-de-sangue': 1,
    forca: 4, destreza: 3, vigor: 3, carisma: 3, manipulacao: 2, compostura: 2, inteligencia: 2, raciocinio: 2, determinacao: 1,
    'convicoes-crenca-1': 'Proteger os inocentes', 'convicoes-pilar-1': 'Helena', predador: 'Siren',
    disciplinas: [{ name: 'Presença', level: 2, powers: ['Fascínio', 'Assombro'] }, { name: 'Rapidez', level: 1, powers: ['Reflexos rápidos'] }],
    advantages: ['Recursos', 'Aliados'], flaws: ['Inimigo', 'Segredo sombrio'],
    vantagens: [{ name: 'Recursos', level: 3 }, { name: 'Aliados', level: 4 }], defeitos: [{ name: 'Inimigo', level: 1 }, { name: 'Segredo sombrio', level: 1 }] }
}
function request(status: string, expectedRevision = 0) {
  return new Request('http://localhost', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status, expectedRevision }) })
}

describe('PATCH status com transação real em memória', () => {
  beforeEach(() => {
    const now = new Date()
    global.__devDb = { characters: [{ id, userId: 'owner', createdByUserId: 'owner', name: 'Helena', concept: null, clan: 'Toreador', generation: '13', status: 'DRAFT', characterType: 'PLAYER_VAMPIRE', campaignId, data: validData(), totalXp: 0, spentXp: 0, revision: 0, gameState: {}, createdAt: now, updatedAt: now }], campaigns: [{ id: campaignId, masterUserId: 'narrator', name: 'Mesa', theme: null, principios: null, averageXp: null, status: 'Ativa', lastSessionAt: null, createdAt: now, updatedAt: now }], possessions: [], characterLedgerEvents: [] }
    session.mockReset()
    session.mockResolvedValue({ user: { sub: 'owner' } })
  })
  it('conclui ficha independente sem Narrador após validação', async () => {
    global.__devDb!.characters[0].campaignId = null
    expect((await PATCH(request('APPROVED'), context)).status).toBe(200)
    expect(global.__devDb!.characters[0]).toMatchObject({ status: 'APPROVED', revision: 1, validationReport: { valid: true } })
  })
  it('conclui independente com distribuição livre e escolhas fora do clã, sem requisitos de criação', async () => {
    const character = global.__devDb!.characters[0]
    character.campaignId = null
    character.data = { creationType: 'FLEDGLING', cla: 'Toreador', humanidade: 7,
      forca: 5, destreza: 5, vigor: 5, carisma: 5, manipulacao: 5, compostura: 5, inteligencia: 5, raciocinio: 5, determinacao: 5,
      'habilidade-briga': 5, skillMode: 'BALANCED', disciplinas: [{ name: 'Animalismo', level: 5, powers: [] }] }
    const response = await PATCH(request('APPROVED'), context)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ status: 'APPROVED', report: { valid: true, errors: [], warnings: expect.arrayContaining([expect.objectContaining({ code: 'ATTRIBUTES_INVALID_DISTRIBUTION' })]) } })
  })
  it.each([6, -1, 1.5, 'inválido'])('independente mantém limites de atributos: %s', async value => {
    const character = global.__devDb!.characters[0]
    character.campaignId = null
    character.data.forca = value
    expect((await PATCH(request('APPROVED'), context)).status).toBe(422)
    expect(character.status).toBe('DRAFT')
  })
  it('não confia em flags do cliente para dispensar regras de ficha vinculada', async () => {
    global.__devDb!.characters[0].data = { ...validData(), independent: true, campaignId: null, forca: 5 }
    expect((await PATCH(request('PENDING_REVIEW'), context)).status).toBe(422)
  })
  it('não envia ficha independente a Narrador inexistente', async () => {
    global.__devDb!.characters[0].campaignId = null
    expect((await PATCH(request('PENDING_REVIEW'), context)).status).toBe(409)
    expect(global.__devDb!.characters[0].status).toBe('DRAFT')
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
  })
  it('dono envia ficha válida para revisão, com relatório e evento atômicos', async () => {
    const response = await PATCH(request('PENDING_REVIEW'), context)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ status: 'PENDING_REVIEW', revision: 1, report: { valid: true } })
    expect(global.__devDb!.characters[0]).toMatchObject({ status: 'PENDING_REVIEW', revision: 1, validationReport: { valid: true } })
    expect(global.__devDb!.characterLedgerEvents[0]).toMatchObject({ eventType: 'STATUS_CHANGE', createdByUserId: 'owner', payload: { input: { status: 'PENDING_REVIEW' }, after: { status: 'PENDING_REVIEW' } } })
  })
  it('bloqueia envio inválido sem mudar status, revisão ou ledger', async () => {
    global.__devDb!.characters[0].data = {}
    expect((await PATCH(request('PENDING_REVIEW'), context)).status).toBe(422)
    expect(global.__devDb!.characters[0]).toMatchObject({ status: 'DRAFT', revision: 0 })
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
  })
  it('Narrador da campanha aprova ficha válida em revisão', async () => {
    session.mockResolvedValue({ user: { sub: 'narrator' } })
    global.__devDb!.characters[0].status = 'PENDING_REVIEW'
    expect((await PATCH(request('APPROVED'), context)).status).toBe(200)
    expect(global.__devDb!.characters[0]).toMatchObject({ status: 'APPROVED', revision: 1, validationReport: { valid: true } })
  })
  it('Narrador não aprova ficha inválida mesmo com relatório anterior válido', async () => {
    session.mockResolvedValue({ user: { sub: 'narrator' } })
    Object.assign(global.__devDb!.characters[0], { status: 'PENDING_REVIEW', data: {}, validationReport: { valid: true } })
    expect((await PATCH(request('APPROVED'), context)).status).toBe(422)
    expect(global.__devDb!.characters[0]).toMatchObject({ status: 'PENDING_REVIEW', revision: 0 })
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
  })
  it('dono não aprova ficha vinculada nem usa transição inexistente', async () => {
    expect((await PATCH(request('APPROVED'), context)).status).toBe(409)
    global.__devDb!.characters[0].status = 'PENDING_REVIEW'
    expect((await PATCH(request('APPROVED'), context)).status).toBe(409)
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
  })
  it('exige autenticação e recusa terceiros e Narrador de outra mesa', async () => {
    session.mockResolvedValue(null)
    expect((await PATCH(request('PENDING_REVIEW'), context)).status).toBe(401)
    for (const actor of ['other', 'other-narrator']) {
      session.mockResolvedValue({ user: { sub: actor } })
      expect((await PATCH(request('PENDING_REVIEW'), context)).status).toBe(403)
    }
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
  })
  it('revisão antiga recebe conflito antes de validar ou alterar status', async () => {
    expect((await PATCH(request('PENDING_REVIEW', 5), context)).status).toBe(409)
    expect(global.__devDb!.characters[0]).toMatchObject({ status: 'DRAFT', revision: 0 })
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
  })
})
