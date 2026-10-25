import { beforeEach, expect, it, vi } from 'vitest'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { getCommandCharacter } from '@/lib/character-commands'
import { createTestCampaign, createTestCharacter, preparePostgresTest } from './postgres-test-helpers'

const mocks = vi.hoisted(() => ({ actor: 'conditions-master' }))
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: () => mocks.actor ? { user: { sub: mocks.actor } } : null }))
import { PATCH } from '@/app/api/characters/[id]/condition/route'
import { PATCH as status } from '@/app/api/characters/[id]/status/route'
import { GET as resources } from '@/app/api/characters/[id]/resources/route'

const context = (id: string) => ({ params: Promise.resolve({ id }) })
const request = (body: unknown, origin = 'http://localhost') => new Request('http://localhost/api/characters', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body) })
const operation = (condition = 'STAKED') => ({ condition, reason: 'Decisão narrativa de teste', expectedRevision: 0, idempotencyKey: crypto.randomUUID() })
async function setup() {
  preparePostgresTest()
  const campaign = await createTestCampaign('conditions-master')
  const character = await createTestCharacter('conditions-player', campaign.id, 'Ficha de condições', { vigor: 2, humanidade: 7, fome: 3 })
  await db.execute(sql`UPDATE characters SET status = 'APPROVED', character_type = 'PLAYER_VAMPIRE', game_state = ${JSON.stringify({ condition: 'ACTIVE', hunger: 3, privateNarrator: 'segredo', healthDamage: { superficial: 1, aggravated: 0 } })}::jsonb WHERE id = ${character.id}::uuid`)
  return { campaign, character }
}
beforeEach(() => { mocks.actor = 'conditions-master' })

it('exige autenticação, Narrador atual, vínculo e origem válida', async () => {
  const { campaign, character } = await setup()
  mocks.actor = ''
  expect((await PATCH(request(operation()), context(character.id))).status).toBe(401)
  for (const actor of ['conditions-player', 'intruso', 'outro-narrador']) {
    mocks.actor = actor
    expect((await PATCH(request(operation()), context(character.id))).status).toBe(403)
  }
  mocks.actor = 'conditions-master'
  expect((await PATCH(request(operation(), 'https://hostil.example'), context(character.id))).status).toBe(403)
  await db.execute(sql`UPDATE campaigns SET master_user_id = 'novo-narrador' WHERE id = ${campaign.id}::uuid`)
  expect((await PATCH(request(operation()), context(character.id))).status).toBe(403)
  expect((await getCommandCharacter(character.id))?.revision).toBe(0)
})

it('registra condição, autoria e motivo uma vez e conserva recursos e estado privado', async () => {
  const { character } = await setup()
  const body = operation()
  const first = await PATCH(request(body), context(character.id))
  expect(first.status).toBe(200)
  const result = await first.json()
  expect(result).toMatchObject({ revision: 1, state: { condition: 'STAKED', hunger: 3, healthDamage: { superficial: 1, aggravated: 0 } } })
  expect(result.state).not.toHaveProperty('privateNarrator')
  expect(await (await PATCH(request(body), context(character.id))).json()).toEqual(result)
  const saved = await getCommandCharacter(character.id)
  expect(saved?.gameState.privateNarrator).toBe('segredo')
  const events = await db.execute<{ payload: Record<string, unknown>; created_by_user_id: string }>(sql`SELECT payload, created_by_user_id FROM character_ledger_events WHERE character_id = ${character.id}::uuid AND event_type = 'CONDITION_CHANGED'`)
  expect(events.rows).toHaveLength(1)
  expect(events.rows[0]).toMatchObject({ created_by_user_id: mocks.actor, payload: { input: { reason: body.reason, condition: 'STAKED' } } })
  expect((await PATCH(request({ ...body, condition: 'ACTIVE' }), context(character.id))).status).toBe(409)
  expect((await PATCH(request(operation('ACTIVE')), context(character.id))).status).toBe(409)
  expect((await PATCH(request({ ...operation('ACTIVE'), expectedRevision: 1 }), context(character.id))).status).toBe(200)
})

it('torpor registra causa e Humanidade do servidor, remoção preserva dano e Fome', async () => {
  const { character } = await setup()
  expect((await PATCH(request({ ...operation('TORPOR'), cause: 'DAMAGE' }), context(character.id))).status).toBe(200)
  expect((await getCommandCharacter(character.id))?.gameState).toMatchObject({ condition: 'TORPOR', torpor: { cause: 'DAMAGE', humanityAtEntry: 7 } })
  mocks.actor = 'conditions-player'
  const player = await (await resources(new Request('http://localhost'), context(character.id))).json()
  expect(player.state).not.toHaveProperty('torpor')
  mocks.actor = 'conditions-master'
  expect((await PATCH(request({ ...operation('ACTIVE'), expectedRevision: 1 }), context(character.id))).status).toBe(200)
  const saved = await getCommandCharacter(character.id)
  expect(saved?.gameState).not.toHaveProperty('torpor')
  expect(saved?.gameState).toMatchObject({ hunger: 3, healthDamage: { superficial: 1, aggravated: 0 } })
})

it.each([{ reason: '' }, { reason: 'x'.repeat(501) }, { condition: 'FINAL_DEATH' }, { condition: 'TORPOR' }, { expectedRevision: -1 }, { cause: 'HUNGER' }, { humanityAtEntry: 10 }, { idempotencyKey: 'invalido' }])('rejeita entrada inválida ou forjada: %j', async overrides => {
  const { character } = await setup()
  expect((await PATCH(request({ ...operation(), ...overrides }), context(character.id))).status).toBe(400)
  expect((await getCommandCharacter(character.id))?.revision).toBe(0)
})

it('concorrência aplica somente uma alteração na revisão esperada', async () => {
  const { character } = await setup()
  const results = await Promise.all([PATCH(request(operation()), context(character.id)), PATCH(request({ ...operation('TORPOR'), cause: 'VOLUNTARY' }), context(character.id))])
  expect(results.map(result => result.status).sort()).toEqual([200, 409])
  expect((await getCommandCharacter(character.id))?.revision).toBe(1)
})

it('revalida autoridade antes de devolver replay e rejeita identificadores manipulados', async () => {
  const { campaign, character } = await setup()
  const body = operation()
  expect((await PATCH(request(body), context(character.id))).status).toBe(200)
  await db.execute(sql`UPDATE campaigns SET master_user_id = 'novo-narrador' WHERE id = ${campaign.id}::uuid`)
  expect((await PATCH(request(body), context(character.id))).status).toBe(403)
  expect((await PATCH(request(operation()), context("' OR 1=1 --"))).status).toBe(400)
})

it('não altera NPC pelo comando de vampiro jogável', async () => {
  const { character } = await setup()
  await db.execute(sql`UPDATE characters SET character_type = 'VAMPIRE_NPC' WHERE id = ${character.id}::uuid`)
  expect((await PATCH(request(operation()), context(character.id))).status).toBe(422)
  expect((await getCommandCharacter(character.id))?.revision).toBe(0)
})

it('não remove morte definitiva nem altera ficha independente', async () => {
  const { character } = await setup()
  await db.execute(sql`UPDATE characters SET game_state = '{"condition":"FINAL_DEATH"}'::jsonb WHERE id = ${character.id}::uuid`)
  expect((await PATCH(request(operation('ACTIVE')), context(character.id))).status).toBe(409)
  await db.execute(sql`UPDATE characters SET campaign_id = NULL WHERE id = ${character.id}::uuid`)
  expect((await PATCH(request(operation()), context(character.id))).status).toBe(403)
})

it('aprovação rejeita jogador, Narrador de outra mesa, origem cruzada e ficha inválida', async () => {
  const { character } = await setup()
  await db.execute(sql`UPDATE characters SET status = 'PENDING_REVIEW' WHERE id = ${character.id}::uuid`)
  const body = { status: 'APPROVED', expectedRevision: 0, idempotencyKey: crypto.randomUUID() }
  mocks.actor = ''
  expect((await status(request(body), context(character.id))).status).toBe(401)
  mocks.actor = 'outro-narrador'
  expect((await status(request(body), context(character.id))).status).toBe(403)
  mocks.actor = 'conditions-player'
  expect((await status(request(body), context(character.id))).status).toBe(422)
  mocks.actor = 'conditions-master'
  expect((await status(request(body, 'https://hostil.example'), context(character.id))).status).toBe(403)
  expect((await status(request(body), context(character.id))).status).toBe(422)
  expect((await getCommandCharacter(character.id))?.status).toBe('PENDING_REVIEW')
})
