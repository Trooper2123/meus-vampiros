import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { preparePostgresTest, createTestCampaign, createTestCharacter } from './postgres-test-helpers'

const session = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: session }))
import { PATCH } from '@/app/api/characters/[id]/status/route'

let id: string
let campaignId: string
const context = () => ({ params: Promise.resolve({ id }) })
const current = async () => (await db.execute(sql`SELECT status, revision, validation_report AS "validationReport", data, campaign_id AS "campaignId" FROM characters WHERE id=${id}::uuid`)).rows[0] as Record<string, any>
const ledger = async () => (await db.execute(sql`SELECT event_type, payload, created_by_user_id FROM character_ledger_events WHERE character_id=${id}::uuid`)).rows as Array<Record<string, any>>
const setStatus = (status: string) => db.execute(sql`UPDATE characters SET status=${status} WHERE id=${id}::uuid`)
const setCampaign = (value: string | null) => db.execute(sql`UPDATE characters SET campaign_id=${value}::uuid WHERE id=${id}::uuid`)
const setData = (data: Record<string, unknown>) => db.execute(sql`UPDATE characters SET data=${JSON.stringify(data)}::jsonb WHERE id=${id}::uuid`)

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
  beforeEach(async () => {
    preparePostgresTest()
    campaignId = (await createTestCampaign('narrator', 'Mesa')).id
    id = (await createTestCharacter('owner', campaignId, 'Helena', validData())).id
    await db.execute(sql`UPDATE characters SET status='DRAFT', character_type='PLAYER_VAMPIRE', clan='Toreador', generation='13' WHERE id=${id}::uuid`)
    session.mockReset()
    session.mockResolvedValue({ user: { sub: 'owner' } })
  })
  it('conclui ficha independente sem Narrador após validação', async () => {
    await setCampaign(null)
    expect((await PATCH(request('APPROVED'), context())).status).toBe(200)
    expect(await current()).toMatchObject({ status: 'APPROVED', revision: 1, validationReport: { valid: true } })
  })
  it('conclui independente com distribuição livre e escolhas fora do clã, sem requisitos de criação', async () => {
    await setCampaign(null)
    await setData({ creationType: 'FLEDGLING', cla: 'Toreador', humanidade: 7,
      forca: 5, destreza: 5, vigor: 5, carisma: 5, manipulacao: 5, compostura: 5, inteligencia: 5, raciocinio: 5, determinacao: 5,
      'habilidade-briga': 5, skillMode: 'BALANCED', disciplinas: [{ name: 'Animalismo', level: 5, powers: [] }] })
    const response = await PATCH(request('APPROVED'), context())
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ status: 'APPROVED', report: { valid: true, errors: [], warnings: expect.arrayContaining([expect.objectContaining({ code: 'ATTRIBUTES_INVALID_DISTRIBUTION' })]) } })
  })
  it.each([6, -1, 1.5, 'inválido'])('independente mantém limites de atributos: %s', async value => {
    await setCampaign(null)
    await setData({ ...validData(), forca: value })
    expect((await PATCH(request('APPROVED'), context())).status).toBe(422)
    expect((await current()).status).toBe('DRAFT')
  })
  it('não confia em flags do cliente para dispensar regras de ficha vinculada', async () => {
    await setData({ ...validData(), independent: true, campaignId: null, forca: 5 })
    expect((await PATCH(request('PENDING_REVIEW'), context())).status).toBe(422)
  })
  it('não envia ficha independente a Narrador inexistente', async () => {
    await setCampaign(null)
    expect((await PATCH(request('PENDING_REVIEW'), context())).status).toBe(409)
    expect((await current()).status).toBe('DRAFT')
    expect(await ledger()).toHaveLength(0)
  })
  it('dono envia ficha válida para revisão, com relatório e evento atômicos', async () => {
    const response = await PATCH(request('PENDING_REVIEW'), context())
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ status: 'PENDING_REVIEW', revision: 1, report: { valid: true } })
    expect(await current()).toMatchObject({ status: 'PENDING_REVIEW', revision: 1, validationReport: { valid: true } })
    expect(await ledger()).toMatchObject([{ event_type: 'STATUS_CHANGE', created_by_user_id: 'owner', payload: { input: { status: 'PENDING_REVIEW' }, after: { status: 'PENDING_REVIEW' } } }])
  })
  it('bloqueia envio inválido sem mudar status, revisão ou ledger', async () => {
    await setData({})
    expect((await PATCH(request('PENDING_REVIEW'), context())).status).toBe(422)
    expect(await current()).toMatchObject({ status: 'DRAFT', revision: 0 })
    expect(await ledger()).toHaveLength(0)
  })
  it('Narrador da campanha aprova ficha válida em revisão', async () => {
    session.mockResolvedValue({ user: { sub: 'narrator' } })
    await setStatus('PENDING_REVIEW')
    expect((await PATCH(request('APPROVED'), context())).status).toBe(200)
    expect(await current()).toMatchObject({ status: 'APPROVED', revision: 1, validationReport: { valid: true } })
  })
  it('Narrador não aprova ficha inválida mesmo com relatório anterior válido', async () => {
    session.mockResolvedValue({ user: { sub: 'narrator' } })
    await setStatus('PENDING_REVIEW')
    await setData({})
    await db.execute(sql`UPDATE characters SET validation_report='{"valid":true}'::jsonb WHERE id=${id}::uuid`)
    expect((await PATCH(request('APPROVED'), context())).status).toBe(422)
    expect(await current()).toMatchObject({ status: 'PENDING_REVIEW', revision: 0 })
    expect(await ledger()).toHaveLength(0)
  })
  it('dono não aprova ficha vinculada nem usa transição inexistente', async () => {
    expect((await PATCH(request('APPROVED'), context())).status).toBe(409)
    await setStatus('PENDING_REVIEW')
    expect((await PATCH(request('APPROVED'), context())).status).toBe(409)
    expect(await ledger()).toHaveLength(0)
  })
  it('exige autenticação e recusa terceiros e Narrador de outra mesa', async () => {
    session.mockResolvedValue(null)
    expect((await PATCH(request('PENDING_REVIEW'), context())).status).toBe(401)
    for (const actor of ['other', 'other-narrator']) {
      session.mockResolvedValue({ user: { sub: actor } })
      expect((await PATCH(request('PENDING_REVIEW'), context())).status).toBe(403)
    }
    expect(await ledger()).toHaveLength(0)
  })
  it('revisão antiga recebe conflito antes de validar ou alterar status', async () => {
    expect((await PATCH(request('PENDING_REVIEW', 5), context())).status).toBe(409)
    expect(await current()).toMatchObject({ status: 'DRAFT', revision: 0 })
    expect(await ledger()).toHaveLength(0)
  })
})
