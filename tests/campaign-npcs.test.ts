import { beforeEach, expect, it, vi } from 'vitest'

const session = vi.hoisted(() => {
  vi.stubEnv('NODE_ENV', 'test')
  vi.stubEnv('DATABASE_URL', '')
  return vi.fn()
})
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: session }))
vi.mock('@/lib/db', () => ({ ensureAllTables: vi.fn(), db: null }))
import { POST } from '@/app/api/campaigns/[id]/npcs/route'
import { PUT } from '@/app/api/characters/route'
import { POST as validateNpc } from '@/app/api/characters/[id]/validate/route'
import { devCreateCampaign, devCreateCharacter } from '@/lib/dev-db'
import { getCharacterForViewer } from '@/lib/characters'
import { notesContext } from '@/lib/notes'

let campaignId: string
const request = (body: unknown, origin?: string) => new Request('http://localhost/api/campaigns/table/npcs', { method: 'POST', headers: { 'content-type': 'application/json', ...(origin ? { origin } : {}) }, body: JSON.stringify(body) })
const context = (id = campaignId) => ({ params: Promise.resolve({ id }) })
beforeEach(() => {
  global.__devDb = { characters: [], campaigns: [], possessions: [], characterLedgerEvents: [] }
  campaignId = devCreateCampaign('narrator', { name: 'Mesa atual', theme: null, principios: null, averageXp: 0, status: 'Ativa', lastSessionAt: null }).id
  devCreateCharacter('player', { name: 'Jogador', campaignId })
  session.mockResolvedValue({ user: { sub: 'narrator' } })
})

it.each(['HUMAN_NPC', 'VAMPIRE_NPC'])('cria %s do Narrador na mesa atual, editável e privado', async characterType => {
  const response = await POST(request({ name: '  NPC da mesa  ', characterType }), context())
  expect(response.status).toBe(201)
  expect(response.headers.get('cache-control')).toContain('no-store')
  const { id } = await response.json()
  expect(global.__devDb!.characters.find(character => character.id === id)).toMatchObject({ name: 'NPC da mesa', userId: 'narrator', createdByUserId: 'narrator', campaignId, characterType, status: 'DRAFT', visibility: 'ST_ONLY' })
  expect(JSON.stringify(notesContext('player'))).not.toContain(id)
  expect(await getCharacterForViewer(id, 'player')).toBeNull()
  expect(await getCharacterForViewer(id, 'other-narrator')).toBeNull()
  const edit = await PUT(request({ id, name: 'Nome editado', data: { nome: 'Nome editado', characterType }, expectedRevision: 0 }))
  expect(edit.status).toBe(200)
  expect((await getCharacterForViewer(id, 'narrator'))?.name).toBe('Nome editado')
  expect((await PUT(request({ id, campaignId: null, expectedRevision: 1 }))).status).toBe(409)
  expect(global.__devDb!.characters.find(character => character.id === id)?.campaignId).toBe(campaignId)
})

it.each([null, 'player', 'outsider', 'other-narrator'])('nega criação não autorizada por %s', async actor => {
  if (actor === 'other-narrator') devCreateCampaign(actor, { name: 'Outra', theme: null, principios: null, averageXp: 0, status: 'Ativa', lastSessionAt: null })
  session.mockResolvedValue(actor ? { user: { sub: actor, 'https://meus-vampiros.app/roles': actor === 'other-narrator' ? ['mestre'] : [] } } : null)
  const before = global.__devDb!.characters.length
  expect((await POST(request({ name: 'NPC', characterType: 'HUMAN_NPC' }), context())).status).toBe(actor ? 403 : 401)
  expect(global.__devDb!.characters).toHaveLength(before)
})

it.each([null, { name: '', characterType: 'HUMAN_NPC' }, { name: 'x'.repeat(121), characterType: 'HUMAN_NPC' }, { name: 'NPC', characterType: 'PLAYER_VAMPIRE' }, { name: 'NPC', characterType: 'RETAINER' }, { name: 'NPC', characterType: 'HUMAN_NPC', campaignId: null }])('recusa payload inválido %j sem criar', async body => {
  const before = global.__devDb!.characters.length
  expect((await POST(request(body), context())).status).toBe(400)
  expect(global.__devDb!.characters).toHaveLength(before)
})

it('recusa ID manipulado, mesa inexistente e origem cruzada', async () => {
  const body = { name: 'NPC', characterType: 'HUMAN_NPC' }
  expect((await POST(request(body), context('invalid'))).status).toBe(400)
  expect((await POST(request(body), context('00000000-0000-4000-8000-000000000000'))).status).toBe(403)
  expect((await POST(request(body, 'https://evil.invalid'), context())).status).toBe(403)
})

it('não usa provider externo nem expõe falha interna', async () => {
  vi.stubEnv('DATABASE_URL', 'postgresql://invalid/test')
  try { expect((await POST(request({ name: 'NPC', characterType: 'HUMAN_NPC' }), context())).status).toBe(503) }
  finally { vi.stubEnv('DATABASE_URL', '') }
  session.mockRejectedValueOnce(new Error('segredo interno'))
  const response = await POST(request({ name: 'NPC', characterType: 'HUMAN_NPC' }), context())
  expect(response.status).toBe(500)
  expect(await response.text()).not.toContain('segredo interno')
})

it.each(['HUMAN_NPC', 'VAMPIRE_NPC'])('valida %s somente para seu Narrador com dados persistidos', async characterType => {
  const created = await POST(request({ name: 'NPC válido', characterType }), context())
  const { id } = await created.json()
  const npc = global.__devDb!.characters.find(entry => entry.id === id)!
  npc.data = { characterType, cla: 'Brujah', npc: { mode: 'POOLS', physicalPool: 4, socialPool: 3, mentalPool: 2 } }
  const ctx = { params: Promise.resolve({ id }) }
  const validated = await validateNpc(request({}), ctx)
  expect((await validated.json()).valid).toBe(true)
  expect(npc.validationReport).toMatchObject({ valid: true })
  for (const actor of ['player', 'outsider', 'other-narrator']) {
    session.mockResolvedValue({ user: { sub: actor } })
    expect((await validateNpc(request({}), ctx)).status).toBe(403)
  }
  session.mockResolvedValue(null)
  expect((await validateNpc(request({}), ctx)).status).toBe(401)
})

it.each(['HUMAN_NPC', 'VAMPIRE_NPC'])('impede converter jogador em %s pelo editor comum', async characterType => {
  const player = devCreateCharacter('narrator', { name: 'Jogável', campaignId, data: { characterType: 'PLAYER_VAMPIRE' } })
  const response = await PUT(request({ id: player.id, data: { characterType }, expectedRevision: 0 }))
  expect(response.status).toBe(422)
  expect(player.characterType).toBe('PLAYER_VAMPIRE')
})
