import { beforeEach, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
const auth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: auth }))
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { preparePostgresTest, createTestCampaign, createTestCharacter } from './postgres-test-helpers'
import { archiveCampaign } from '@/lib/campaign-archive'
import { startGameSession, getGameSession } from '@/lib/game-sessions'
import { createNpc, getNpc } from '@/lib/npc-store'
import { NPC_TEMPLATES } from '@/lib/npc-domain'
import { createNote, getNote } from '@/lib/notes'
import { PATCH } from '@/app/api/campaigns/[id]/archive/route'

let master: string, player: string, campaignId: string
beforeEach(async () => {
  preparePostgresTest(); master = `gm-${randomUUID()}`; player = `player-${randomUUID()}`
  campaignId = (await createTestCampaign(master, 'Mesa preservada')).id
  auth.mockResolvedValue({ user: { sub: master } })
})
const input = (archived = true) => ({ archived, confirmationName: 'Mesa preservada' })
it('arquiva e restaura sem excluir fichas, NPCs, notas, sessões ou vínculos', async () => {
  const character = await createTestCharacter(player, campaignId)
  const npc = await createNpc(master, { data: NPC_TEMPLATES[0].data, campaignId, idempotencyKey: randomUUID() })
  const note = await createNote(player, { title: 'Minha nota', body: 'Histórico privado', campaignId, idempotencyKey: randomUUID() })
  const session = await startGameSession(master, campaignId, { idempotencyKey: randomUUID() })
  await expect(archiveCampaign(master, campaignId, input())).rejects.toMatchObject({ status: 409 })
  await db.execute(sql`UPDATE game_sessions SET status='CLOSED',ended_at=now() WHERE id=${session.id}::uuid`)
  expect(await archiveCampaign(master, campaignId, input())).toMatchObject({ status: 'Arquivada' })
  expect((await getGameSession(player, session.id)).session.id).toBe(session.id)
  expect((await getNpc(master, String(npc.id))).campaigns.map(c => c.campaign_id)).toContain(campaignId)
  expect((await getNote(player, note.id)).body).toBe('Histórico privado')
  const rows = await db.execute(sql`SELECT campaign_id FROM characters WHERE id=${character.id}::uuid`)
  expect(rows.rows[0].campaign_id).toBe(campaignId)
  await expect(startGameSession(master, campaignId, { idempotencyKey: randomUUID() })).rejects.toMatchObject({ status: 409 })
  expect(await archiveCampaign(master, campaignId, input(false))).toMatchObject({ status: 'Ativa' })
  expect((await startGameSession(master, campaignId, { idempotencyKey: randomUUID() })).status).toBe('ACTIVE')
})
it('valida proprietário, nome, UUID, tipos e campos extras antes de alterar a mesa', async () => {
  await expect(archiveCampaign(player, campaignId, input())).rejects.toMatchObject({ status: 403 })
  await expect(archiveCampaign(master, campaignId, { ...input(), confirmationName: 'Outra' })).rejects.toMatchObject({ status: 422 })
  await expect(archiveCampaign(master, 'invalido', input())).rejects.toMatchObject({ status: 400 })
  await expect(archiveCampaign(master, campaignId, { ...input(), archived: 'true' })).rejects.toMatchObject({ status: 400 })
  await expect(archiveCampaign(master, campaignId, { ...input(), masterUserId: player })).rejects.toMatchObject({ status: 400 })
  expect((await db.execute(sql`SELECT status FROM campaigns WHERE id=${campaignId}::uuid`)).rows[0].status).toBe('Ativa')
})
it('API exige 401, 403 por ownership e proteção de origem', async () => {
  const context = { params: Promise.resolve({ id: campaignId }) }
  const request = (origin = 'http://localhost') => new Request('http://localhost/api/campaigns/x/archive', { method: 'PATCH', headers: { 'content-type': 'application/json', origin }, body: JSON.stringify(input()) })
  auth.mockResolvedValue(null)
  expect((await PATCH(request(), context)).status).toBe(401)
  auth.mockResolvedValue({ user: { sub: player } })
  expect((await PATCH(request(), context)).status).toBe(403)
  auth.mockResolvedValue({ user: { sub: master } })
  expect((await PATCH(request('https://evil.invalid'), context)).status).toBe(403)
  expect((await PATCH(request(), context)).status).toBe(200)
})
