import { beforeEach, expect, it, vi } from 'vitest'

const session = vi.hoisted(() => {
  vi.stubEnv('NODE_ENV', 'test')
  return vi.fn()
})
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: session }))

import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { POST } from '@/app/api/characters/[id]/campaign/route'
import { createTestCampaign, createTestCharacter, preparePostgresTest } from './postgres-test-helpers'
import { createCampaignPolicy } from '@/lib/campaign-invitations'
import { randomUUID } from 'node:crypto'

let campaignId: string
let characterId: string
let revision: number
function request(body: unknown, origin = 'http://localhost') {
  return new Request(`http://localhost/api/characters/${characterId}/campaign`, { method: 'POST', headers: { 'content-type': 'application/json', origin }, body: JSON.stringify(body) })
}
function payload(overrides: Record<string, unknown> = {}) {
  return { invitation: { campaignId }, expectedRevision: revision, idempotencyKey: randomUUID(), ...overrides }
}
async function storedCharacter() {
  const result = await db.execute<{ campaign_id: string | null; status: string; revision: number; game_state: Record<string, unknown> }>(sql`SELECT campaign_id, status, revision, game_state FROM characters WHERE id = ${characterId}::uuid`)
  return result.rows[0]
}

beforeEach(async () => {
  await preparePostgresTest()
  const campaign = await createTestCampaign('master', 'Mesa compartilhada')
  campaignId = campaign.id
  await createCampaignPolicy('master', campaignId, [])
  const character = await createTestCharacter('player', null, 'Ficha independente', { characterType: 'PLAYER_VAMPIRE' })
  characterId = character.id
  revision = 0
  session.mockResolvedValue({ user: { sub: 'player' } })
})

it('vincula a ficha pelo ID, registra o aceite e não duplica no replay', async () => {
  const body = payload()
  const first = await POST(request(body), { params: Promise.resolve({ id: characterId }) })
  expect(first.status).toBe(200)
  expect(await storedCharacter()).toMatchObject({ campaign_id: campaignId, status: 'DRAFT', revision: 1, game_state: { policyConsent: { acceptedBy: 'player', campaignId } } })
  expect(await (await POST(request(body), { params: Promise.resolve({ id: characterId }) })).json()).toEqual(await first.json())
  const events = await db.execute(sql`SELECT id FROM character_ledger_events WHERE character_id = ${characterId}::uuid`)
  expect(events.rows).toHaveLength(1)
})

it('permite que outro jogador vincule sua ficha independente usando o mesmo ID', async () => {
  const other = await createTestCharacter('player-two', null, 'Outra ficha', { characterType: 'PLAYER_VAMPIRE' })
  session.mockResolvedValue({ user: { sub: 'player-two' } })
  const response = await POST(request({ invitation: { campaignId }, expectedRevision: 0, idempotencyKey: randomUUID() }), { params: Promise.resolve({ id: other.id }) })
  expect(response.status).toBe(200)
  const linked = await db.execute<{ campaign_id: string | null; accepted_by: string }>(sql`SELECT campaign_id, game_state->'policyConsent'->>'acceptedBy' AS accepted_by FROM characters WHERE id = ${other.id}::uuid`)
  expect(linked.rows[0]).toEqual({ campaign_id: campaignId, accepted_by: 'player-two' })
})

it.each([null, 'outsider', 'master'])('impede vínculo por %s', async actor => {
  session.mockResolvedValue(actor ? { user: { sub: actor } } : null)
  const response = await POST(request(payload()), { params: Promise.resolve({ id: characterId }) })
  expect(response.status).toBe(actor ? 403 : 401)
  expect((await storedCharacter()).campaign_id).toBeNull()
})

it('nega ID inválido, origem cruzada e revisão obsoleta', async () => {
  const context = { params: Promise.resolve({ id: characterId }) }
  expect((await POST(request(payload({ invitation: { campaignId: 'invalid' } }), 'http://localhost'), context)).status).toBe(400)
  expect((await POST(request(payload(), 'https://evil.invalid'), context)).status).toBe(403)
  expect((await POST(request(payload({ expectedRevision: 8 })), context)).status).toBe(409)
  expect((await storedCharacter()).campaign_id).toBeNull()
})

it('recusa NPC, ficha já vinculada e clã proibido sem alterar o vínculo', async () => {
  const context = { params: Promise.resolve({ id: characterId }) }
  await db.execute(sql`UPDATE characters SET character_type = 'HUMAN_NPC' WHERE id = ${characterId}::uuid`)
  expect((await POST(request(payload()), context)).status).toBe(409)
  await db.execute(sql`UPDATE characters SET character_type = 'PLAYER_VAMPIRE', data = '{"characterType":"PLAYER_VAMPIRE","cla":"Toreador"}'::jsonb WHERE id = ${characterId}::uuid`)
  await db.execute(sql`UPDATE campaigns SET enabled_clan_codes = '["BRUJAH"]'::jsonb WHERE id = ${campaignId}::uuid`)
  expect((await POST(request(payload()), context)).status).toBe(422)
  expect((await storedCharacter()).campaign_id).toBeNull()
  await db.execute(sql`UPDATE campaigns SET enabled_clan_codes = NULL WHERE id = ${campaignId}::uuid`)
  expect((await POST(request(payload()), context)).status).toBe(200)
  expect((await POST(request(payload()), context)).status).toBe(409)
})
