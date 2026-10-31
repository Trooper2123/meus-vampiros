import { beforeEach, expect, it, vi } from 'vitest'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { createTestCampaign, createTestCharacter, preparePostgresTest } from './postgres-test-helpers'

const session = vi.hoisted(() => {
  return vi.fn()
})
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: session }))
import { POST } from '@/app/api/campaigns/[id]/npcs/route'
import { PUT } from '@/app/api/characters/route'
import { POST as validateNpc } from '@/app/api/characters/[id]/validate/route'
import { createCharacter, getCharacterAccessRecord, getCharacterForViewer } from '@/lib/characters'
import { notesContext } from '@/lib/notes'

let campaignId: string
const request = (body: unknown, origin?: string) => new Request('http://localhost/api/campaigns/table/npcs', { method: 'POST', headers: { 'content-type': 'application/json', ...(origin ? { origin } : {}) }, body: JSON.stringify(body) })
const context = (id = campaignId) => ({ params: Promise.resolve({ id }) })
beforeEach(async () => {
  preparePostgresTest()
  campaignId = (await createTestCampaign('narrator', 'Mesa atual')).id
  await createTestCharacter('player', campaignId, 'Jogador')
  session.mockResolvedValue({ user: { sub: 'narrator' } })
})
const countCharacters = async () => Number((await db.execute(sql`SELECT count(*)::int AS count FROM characters WHERE campaign_id=${campaignId}::uuid`)).rows[0].count)

it.each(['HUMAN_NPC', 'VAMPIRE_NPC'])('cria %s do Narrador na mesa atual, editável e privado', async characterType => {
  const response = await POST(request({ name: '  NPC da mesa  ', characterType }), context())
  expect(response.status).toBe(201)
  expect(response.headers.get('cache-control')).toContain('no-store')
  const { id } = await response.json()
  const saved = (await db.execute(sql`SELECT name, user_id AS "userId", created_by_user_id AS "createdByUserId", campaign_id AS "campaignId", character_type AS "characterType", status, visibility FROM characters WHERE id=${id}::uuid`)).rows[0]
  expect(saved).toMatchObject({ name: 'NPC da mesa', userId: 'narrator', createdByUserId: 'narrator', campaignId, characterType, status: 'DRAFT', visibility: 'ST_ONLY' })
  expect(JSON.stringify(notesContext('player'))).not.toContain(id)
  expect(await getCharacterForViewer(id, 'player')).toBeNull()
  expect(await getCharacterForViewer(id, 'other-narrator')).toBeNull()
  const edit = await PUT(request({ id, name: 'Nome editado', data: { nome: 'Nome editado', characterType }, expectedRevision: 0 }))
  expect(edit.status).toBe(200)
  expect((await getCharacterForViewer(id, 'narrator'))?.name).toBe('Nome editado')
  expect((await PUT(request({ id, campaignId: null, expectedRevision: 1 }))).status).toBe(409)
  expect((await getCharacterAccessRecord(id))?.campaignId).toBe(campaignId)
})

it.each([null, 'player', 'outsider', 'other-narrator'])('nega criação não autorizada por %s', async actor => {
  if (actor === 'other-narrator') await createTestCampaign(actor, 'Outra')
  session.mockResolvedValue(actor ? { user: { sub: actor, 'https://meus-vampiros.app/roles': actor === 'other-narrator' ? ['mestre'] : [] } } : null)
  const before = await countCharacters()
  expect((await POST(request({ name: 'NPC', characterType: 'HUMAN_NPC' }), context())).status).toBe(actor ? 403 : 401)
  expect(await countCharacters()).toBe(before)
})

it.each([null, { name: '', characterType: 'HUMAN_NPC' }, { name: 'x'.repeat(121), characterType: 'HUMAN_NPC' }, { name: 'NPC', characterType: 'PLAYER_VAMPIRE' }, { name: 'NPC', characterType: 'RETAINER' }, { name: 'NPC', characterType: 'HUMAN_NPC', campaignId: null }])('recusa payload inválido %j sem criar', async body => {
  const before = await countCharacters()
  expect((await POST(request(body), context())).status).toBe(400)
  expect(await countCharacters()).toBe(before)
})

it('recusa ID manipulado, mesa inexistente e origem cruzada', async () => {
  const body = { name: 'NPC', characterType: 'HUMAN_NPC' }
  expect((await POST(request(body), context('invalid'))).status).toBe(400)
  expect((await POST(request(body), context('00000000-0000-4000-8000-000000000000'))).status).toBe(403)
  expect((await POST(request(body, 'https://evil.invalid'), context())).status).toBe(403)
})

it('não usa provider externo nem expõe falha interna', async () => {
  const execute = vi.spyOn(db, 'execute').mockRejectedValueOnce(new Error('segredo interno'))
  const response = await POST(request({ name: 'NPC', characterType: 'HUMAN_NPC' }), context())
  expect(response.status).toBe(500)
  expect(await response.text()).not.toContain('segredo interno')
  execute.mockRestore()
})

it.each(['HUMAN_NPC', 'VAMPIRE_NPC'])('valida %s somente para seu Narrador com dados persistidos', async characterType => {
  const created = await POST(request({ name: 'NPC válido', characterType }), context())
  const { id } = await created.json()
  await db.execute(sql`UPDATE characters SET data=${JSON.stringify({ characterType, cla: 'Brujah', npc: { mode: 'POOLS', physicalPool: 4, socialPool: 3, mentalPool: 2 } })}::jsonb WHERE id=${id}::uuid`)
  const ctx = { params: Promise.resolve({ id }) }
  const validated = await validateNpc(request({}), ctx)
  expect((await validated.json()).valid).toBe(true)
  expect((await db.execute(sql`SELECT validation_report FROM characters WHERE id=${id}::uuid`)).rows[0].validation_report).toMatchObject({ valid: true })
  for (const actor of ['player', 'outsider', 'other-narrator']) {
    session.mockResolvedValue({ user: { sub: actor } })
    expect((await validateNpc(request({}), ctx)).status).toBe(403)
  }
  session.mockResolvedValue(null)
  expect((await validateNpc(request({}), ctx)).status).toBe(401)
})

it.each(['HUMAN_NPC', 'VAMPIRE_NPC'])('impede converter jogador em %s pelo editor comum', async characterType => {
  const player = await createCharacter('narrator', { name: 'Jogável', campaignId, data: { characterType: 'PLAYER_VAMPIRE' } })
  const response = await PUT(request({ id: player.id, data: { characterType }, expectedRevision: 0 }))
  expect(response.status).toBe(422)
  expect((await getCharacterAccessRecord(player.id!))?.characterType).toBe('PLAYER_VAMPIRE')
})
