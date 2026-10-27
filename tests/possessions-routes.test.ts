import { beforeEach, expect, it, vi } from 'vitest'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { createCampaignPolicy } from '@/lib/campaign-invitations'
import { createTestCampaign, createTestCharacter, preparePostgresTest } from './postgres-test-helpers'
const mocks = vi.hoisted(() => ({ actor: 'item-player' }))
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: () => mocks.actor ? { user: { sub: mocks.actor } } : null }))
import { GET, POST, PUT } from '@/app/api/possessions/route'
import { POST as linkCampaign } from '@/app/api/characters/[id]/campaign/route'

let campaignId: string, characterId: string
const request = (body: unknown, method = 'POST', origin = 'http://localhost') => new Request('http://localhost/api/possessions', { method, headers: { 'content-type': 'application/json', origin }, body: JSON.stringify(body) })
const payload = (extra: Record<string, unknown> = {}) => ({ characterId, label: 'Pertence', idempotencyKey: crypto.randomUUID(), ...extra })
async function items() { return (await db.execute(sql`SELECT * FROM character_possessions WHERE character_id = ${characterId}::uuid`)).rows }
async function revision() { return Number((await db.execute(sql`SELECT revision FROM characters WHERE id = ${characterId}::uuid`)).rows[0].revision) }
async function join(key = crypto.randomUUID(), expectedRevision = 0) { return linkCampaign(request({ invitation: { campaignId }, expectedRevision, idempotencyKey: key }), { params: Promise.resolve({ id: characterId }) }) }

beforeEach(async () => {
  preparePostgresTest()
  mocks.actor = 'item-player'
  campaignId = (await createTestCampaign('item-master')).id
  await createCampaignPolicy('item-master', campaignId, [])
  characterId = (await createTestCharacter('item-player', null, 'Ficha de itens')).id
})

it('exige autenticação em leitura/criação/revisão', async () => {
  mocks.actor = ''
  for (const handler of [GET, POST, PUT]) expect((await handler(request({}))).status).toBe(401)
  expect(await items()).toHaveLength(0)
})
it.each([null, [], { idempotencyKey: 'invalid' }, { characterId: 'invalid' }, { label: 'x'.repeat(201) }, { description: 'x'.repeat(2001) }, { status: 'aprovado' }, { origin: 'admin' }, { campaignId: 'invalid' }])('recusa parâmetros inválidos %j', async invalid => {
  expect((await POST(request(invalid && !Array.isArray(invalid) ? payload(invalid) : invalid))).status).toBe(400)
  expect(await items()).toHaveLength(0)
})
it('bloqueia origem cruzada e JSON malformado', async () => {
  for (const handler of [POST, PUT]) {
    expect((await handler(request(payload(), 'POST', 'https://other.invalid'))).status).toBe(403)
    expect((await handler(new Request('http://localhost/api/possessions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' }))).status).toBe(400)
  }
})
it('retry concorrente conserva item, revisão e autoria; parâmetros SQL permanecem dados', async () => {
  const body = payload({ label: "Caderno'); DROP TABLE campaigns; --" })
  const responses = await Promise.all([POST(request(body)), POST(request(body))])
  expect(responses.map(response => response.status)).toEqual([201, 201])
  const first = await responses[0].json()
  expect(await responses[1].json()).toEqual(first)
  expect(first.possession).toMatchObject({ campaignId: null, origin: 'player', status: 'aprovado', label: body.label })
  expect(await items()).toHaveLength(1)
  expect(await revision()).toBe(0)
  expect((await db.execute(sql`SELECT created_by_user_id FROM character_ledger_events WHERE character_id = ${characterId}::uuid AND event_type = 'POSSESSION_CREATED'`)).rows).toEqual([{ created_by_user_id: 'item-player' }])
  expect(responses[0].headers.get('cache-control')).toBe('private, no-store')
  expect((await POST(request({ ...body, label: 'Outro' }))).status).toBe(409)
})
it('criações distintas concorrentes preservam ambos os itens', async () => {
  await db.execute(sql`UPDATE characters SET status = 'APPROVED' WHERE id = ${characterId}::uuid`)
  expect((await Promise.all([POST(request(payload())), POST(request(payload({ label: 'Outro' })))])).map(response => response.status)).toEqual([201, 201])
  expect(await items()).toHaveLength(2)
  expect(await revision()).toBe(0)
  expect((await db.execute(sql`SELECT status, game_state FROM characters WHERE id = ${characterId}::uuid`)).rows[0]).toMatchObject({ status: 'APPROVED', game_state: {} })
})
it('bloqueia forja de Narrador/campanha e ficha de terceiros sem alterar recursos', async () => {
  expect((await POST(request(payload({ origin: 'master' })))).status).toBe(403)
  expect((await POST(request(payload({ campaignId })))).status).toBe(403)
  mocks.actor = 'intruder'
  expect((await POST(request(payload()))).status).toBe(403)
  expect((await GET(new Request(`http://localhost/api/possessions?characterId=${characterId}`))).status).toBe(403)
  expect(await items()).toHaveLength(0)
  expect(await revision()).toBe(0)
})
it('vínculo encaminha itens uma vez, limpa comentários privados e permite revisão/concessão pelo mestre', async () => {
  const { possession } = await (await POST(request(payload()))).json()
  await db.execute(sql`UPDATE character_possessions SET master_comment = 'privado anterior' WHERE id = ${possession.id}::uuid`)
  const key = crypto.randomUUID()
  expect((await join(key, 0)).status).toBe(200)
  expect((await join(key, 0)).status).toBe(200)
  expect(await items()).toMatchObject([{ id: possession.id, campaign_id: campaignId, origin: 'player', status: 'pendente', master_comment: null }])
  expect(await revision()).toBe(1)
  mocks.actor = 'item-master'
  expect((await (await GET(new Request(`http://localhost/api/possessions?campaignId=${campaignId}`))).json()).possessions).toHaveLength(1)
  expect((await PUT(request({ id: possession.id, status: 'aprovado' }, 'PUT'))).status).toBe(200)
  expect((await (await POST(request(payload({ origin: 'master', campaignId })))).json()).possession).toMatchObject({ origin: 'master', status: 'aprovado', campaignId })
})
it('vínculo recusado preserva itens e revisão', async () => {
  await POST(request(payload()))
  expect((await join(crypto.randomUUID(), 99)).status).toBe(409)
  expect(await items()).toMatchObject([{ campaign_id: null, status: 'aprovado' }])
  expect(await revision()).toBe(0)
})
it('falha antes do commit reverte item, comando e ledger e permite retry seguro', async () => {
  const transact = db.transaction.bind(db), body = payload()
  const intercepted = vi.spyOn(db, 'transaction').mockImplementationOnce(callback => transact(async transaction => {
    await callback(transaction)
    throw new Error('Falha simulada antes do commit')
  }))
  try {
    const response = await POST(request(body))
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Não foi possível criar o pertence.' })
  } finally { intercepted.mockRestore() }
  expect(await items()).toHaveLength(0)
  expect((await db.execute(sql`SELECT command_key FROM character_commands WHERE character_id = ${characterId}::uuid`)).rows).toHaveLength(0)
  expect((await db.execute(sql`SELECT id FROM character_ledger_events WHERE character_id = ${characterId}::uuid AND event_type = 'POSSESSION_CREATED'`)).rows).toHaveLength(0)
  expect((await POST(request(body))).status).toBe(201)
  expect(await items()).toHaveLength(1)
})
it('não transfere pertence antigo de outra mesa para a nova campanha', async () => {
  const foreign = (await createTestCampaign('other-master')).id
  await db.execute(sql`INSERT INTO character_possessions(character_id,campaign_id,label,origin,status,master_comment) VALUES(${characterId}::uuid,${foreign}::uuid,'Item antigo','master','aprovado','Segredo da outra mesa')`)
  await POST(request(payload()))
  expect((await join()).status).toBe(200)
  mocks.actor = 'item-master'
  const response = await GET(new Request(`http://localhost/api/possessions?campaignId=${campaignId}`))
  const body = await response.json()
  expect(body.possessions).toHaveLength(1)
  expect(JSON.stringify(body)).not.toContain('Segredo da outra mesa')
  expect(await items()).toHaveLength(2)
})
it('criação concorrente ao vínculo converge sem item fora da mesa', async () => {
  const body = payload(), key = crypto.randomUUID()
  const [created, linked] = await Promise.all([POST(request(body)), join(key)])
  if (linked.status === 409) expect((await join(key, await revision())).status).toBe(200)
  else expect(linked.status).toBe(200)
  if (created.status === 409) expect((await POST(request(body))).status).toBe(201)
  else expect(created.status).toBe(201)
  expect(await items()).toMatchObject([{ campaign_id: campaignId, status: 'pendente', origin: 'player' }])
  expect(await revision()).toBe(1)
})
it('revoga revisão/criação após troca de mestre ou remoção da ficha', async () => {
  expect((await join()).status).toBe(200)
  const { possession } = await (await POST(request(payload()))).json()
  expect((await PUT(request({ id: possession.id, status: 'aprovado' }, 'PUT'))).status).toBe(403)
  await db.execute(sql`UPDATE campaigns SET master_user_id = 'replacement-master' WHERE id = ${campaignId}::uuid`)
  mocks.actor = 'item-master'
  expect((await PUT(request({ id: possession.id, status: 'aprovado' }, 'PUT'))).status).toBe(403)
  expect((await POST(request(payload({ origin: 'master' })))).status).toBe(403)
  mocks.actor = 'replacement-master'
  expect((await PUT(request({ id: possession.id, status: 'aprovado' }, 'PUT'))).status).toBe(200)
  await db.execute(sql`UPDATE characters SET campaign_id = NULL WHERE id = ${characterId}::uuid`)
  expect((await PUT(request({ id: possession.id, status: 'aprovado' }, 'PUT'))).status).toBe(403)
  expect((await (await GET(new Request(`http://localhost/api/possessions?campaignId=${campaignId}`))).json()).possessions).toEqual([])
})
