import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sql } from 'drizzle-orm'
import { db, ensureGameSessionsTables } from '@/lib/db'
import { assertGameSessionCharacter } from '@/lib/game-sessions'
import { createTestCampaign, createTestCharacter, preparePostgresTest } from './postgres-test-helpers'

const mocks = vi.hoisted(() => ({ actor: 'session-master' }))
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: () => mocks.actor ? { user: { sub: mocks.actor } } : null }))

import { GET as getCampaignSession, POST as startCampaignSession } from '@/app/api/campaigns/[id]/sessions/route'
import { GET as getSession, PATCH as closeSession } from '@/app/api/sessions/[id]/route'
import { POST as postRoll } from '@/app/api/characters/[id]/rolls/route'
import { PATCH as patchResources } from '@/app/api/characters/[id]/resources/route'

const context = (id: string) => ({ params: Promise.resolve({ id }) })
const testDatabaseUrl = process.env.DATABASE_URL
const request = (method: string, body?: unknown) => new Request('http://localhost/api/sessions', {
  method,
  headers: body === undefined ? undefined : { 'Content-Type': 'application/json', Origin: 'http://localhost' },
  body: body === undefined ? undefined : JSON.stringify(body),
})

async function setup() {
  preparePostgresTest()
  const campaign = await createTestCampaign('session-master', 'Crônica A')
  const playerCharacter = await createTestCharacter('session-player', campaign.id, 'Ficha da jogadora', { privateNote: 'não projetar' })
  const otherCharacter = await createTestCharacter('other-player', campaign.id, 'Ficha de terceiro')
  await db.execute(sql`UPDATE characters SET status = 'APPROVED', character_type = 'PLAYER_VAMPIRE' WHERE id IN (${playerCharacter.id}::uuid, ${otherCharacter.id}::uuid)`)
  return { campaign, playerCharacter, otherCharacter }
}

describe('modo de sessão: autorização, projeção e idempotência', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('DATABASE_URL', testDatabaseUrl ?? '')
    mocks.actor = 'session-master'
  })

  it('exige autenticação e bloqueia atores sem participação na mesa', async () => {
    const { campaign } = await setup()
    mocks.actor = ''
    expect((await getCampaignSession(request('GET'), context(campaign.id))).status).toBe(401)
    mocks.actor = 'intruso'
    expect((await getCampaignSession(request('GET'), context(campaign.id))).status).toBe(403)
    expect((await startCampaignSession(request('POST', { idempotencyKey: crypto.randomUUID() }), context(campaign.id))).status).toBe(403)
  })

  it('cria uma sessão ativa idempotente e projeta ao jogador somente a ficha própria autorizada', async () => {
    const { campaign, playerCharacter } = await setup()
    const key = crypto.randomUUID()
    const started = await startCampaignSession(request('POST', { idempotencyKey: key }), context(campaign.id))
    expect(started.status).toBe(201)
    const payload = await started.json()
    expect(payload.session).toMatchObject({ campaignId: campaign.id, status: 'ACTIVE', revision: 1 })
    expect(payload.session).not.toHaveProperty('startedBy')
    expect(await (await startCampaignSession(request('POST', { idempotencyKey: key }), context(campaign.id))).json()).toEqual(payload)
    expect((await startCampaignSession(request('POST', { idempotencyKey: crypto.randomUUID() }), context(campaign.id))).status).toBe(409)

    mocks.actor = 'session-player'
    const snapshot = await getSession(request('GET'), context(payload.session.id))
    expect(snapshot.status).toBe(200)
    const playerView = await snapshot.json()
    expect(playerView.characters).toEqual([{ id: playerCharacter.id, name: 'Ficha da jogadora' }])
    expect(JSON.stringify(playerView)).not.toContain('não projetar')
    expect(JSON.stringify(playerView)).not.toContain('Ficha de terceiro')
  })

  it('preserva uma única sessão ativa em inícios concorrentes e não persiste entrada inválida', async () => {
    const { campaign } = await setup()
    const [first, second] = await Promise.all([
      startCampaignSession(request('POST', { idempotencyKey: crypto.randomUUID() }), context(campaign.id)),
      startCampaignSession(request('POST', { idempotencyKey: crypto.randomUUID() }), context(campaign.id)),
    ])
    expect([first.status, second.status].sort()).toEqual([201, 409])
    const otherCampaign = await createTestCampaign('another-master')
    expect((await startCampaignSession(request('POST', { idempotencyKey: crypto.randomUUID(), chronicleNightIds: [crypto.randomUUID()] }), context(otherCampaign.id))).status).toBe(403)
    expect((await startCampaignSession(request('POST', { idempotencyKey: crypto.randomUUID(), chronicleNightIds: ['invalid'] }), context(campaign.id))).status).toBe(400)
    expect((await getCampaignSession(request('GET'), context(campaign.id))).status).toBe(200)
    expect((await (await getCampaignSession(request('GET'), context(campaign.id))).json()).session.status).toBe('ACTIVE')
  })

  it('só o Narrador atual encerra, com revisão e reenvio idempotentes', async () => {
    const { campaign } = await setup()
    const started = await startCampaignSession(request('POST', { idempotencyKey: crypto.randomUUID() }), context(campaign.id))
    const { session } = await started.json()
    const key = crypto.randomUUID()
    mocks.actor = 'session-player'
    expect((await closeSession(request('PATCH', { idempotencyKey: key, expectedRevision: 1 }), context(session.id))).status).toBe(403)
    mocks.actor = 'session-master'
    expect((await closeSession(request('PATCH', { idempotencyKey: key, expectedRevision: 2 }), context(session.id))).status).toBe(409)
    const closed = await closeSession(request('PATCH', { idempotencyKey: key, expectedRevision: 1 }), context(session.id))
    expect(closed.status).toBe(200)
    expect((await closed.json()).session).toMatchObject({ status: 'CLOSED', revision: 2 })
    expect((await closeSession(request('PATCH', { idempotencyKey: key, expectedRevision: 1 }), context(session.id))).status).toBe(200)
  })

  it('rejeita uso contextual de ficha pertencente a outro participante', async () => {
    const { campaign, otherCharacter } = await setup()
    const started = await startCampaignSession(request('POST', { idempotencyKey: crypto.randomUUID() }), context(campaign.id))
    const { session } = await started.json()
    mocks.actor = 'session-player'
    await expect(assertGameSessionCharacter(mocks.actor, session.id, otherCharacter.id)).rejects.toMatchObject({ status: 403 })
  })

  it('recusa rolagem e recursos de ficha alheia no contexto da sessão', async () => {
    const { campaign, otherCharacter } = await setup()
    const started = await startCampaignSession(request('POST', { idempotencyKey: crypto.randomUUID() }), context(campaign.id))
    const { session } = await started.json()
    mocks.actor = 'session-player'
    const roll = { attribute: 'forca', skillId: 'atletismo', difficulty: 2, visibility: 'PUBLIC', reason: 'Teste', expectedRevision: 0, idempotencyKey: crypto.randomUUID(), sessionId: session.id }
    expect((await postRoll(request('POST', roll), context(otherCharacter.id))).status).toBe(403)
    const resource = { changes: { hunger: 2 }, reason: 'Teste', expectedRevision: 0, idempotencyKey: crypto.randomUUID(), sessionId: session.id }
    expect((await patchResources(request('PATCH', resource), context(otherCharacter.id))).status).toBe(403)
  })

  it('revalida participação em cada snapshot e bloqueia comandos após revogação', async () => {
    const { campaign, playerCharacter } = await setup()
    const { session } = await (await startCampaignSession(request('POST', { idempotencyKey: crypto.randomUUID() }), context(campaign.id))).json()
    mocks.actor = 'session-player'
    const snapshot = await getSession(request('GET'), context(session.id))
    expect(snapshot.status).toBe(200)
    expect(snapshot.headers.get('cache-control')).toBe('private, no-store')
    await db.execute(sql`UPDATE characters SET campaign_id = NULL WHERE id = ${playerCharacter.id}::uuid`)
    expect((await getCampaignSession(request('GET'), context(campaign.id))).status).toBe(403)
    expect((await getSession(request('GET'), context(session.id))).status).toBe(403)
    await expect(assertGameSessionCharacter(mocks.actor, session.id, playerCharacter.id)).rejects.toMatchObject({ status: 403 })
  })

  it('rejeita campos forjados, identificadores e origem cruzada sem criar sessão', async () => {
    const { campaign } = await setup()
    const valid = { idempotencyKey: crypto.randomUUID() }
    for (const body of [{ ...valid, status: 'ACTIVE' }, { ...valid, revision: 50 }, { ...valid, startedBy: 'session-master' }, { idempotencyKey: 'invalid' }, { ...valid, chronicleNightIds: ["'); DROP TABLE campaigns; --"] }]) {
      expect((await startCampaignSession(request('POST', body), context(campaign.id))).status).toBe(400)
    }
    const crossOrigin = new Request('http://localhost/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://other.example' }, body: JSON.stringify(valid) })
    expect((await startCampaignSession(crossOrigin, context(campaign.id))).status).toBe(403)
    expect((await (await getCampaignSession(request('GET'), context(campaign.id))).json()).session).toBeNull()
  })

  it('não revela sessões de outra mesa e exige PostgreSQL em qualquer ambiente', async () => {
    const { campaign } = await setup()
    const started = await startCampaignSession(request('POST', { idempotencyKey: crypto.randomUUID() }), context(campaign.id))
    const { session } = await started.json()
    mocks.actor = 'intruso'
    expect((await getSession(request('GET'), context(session.id))).status).toBe(403)
    mocks.actor = 'session-master'
    vi.stubEnv('DATABASE_URL', '')
    for (const environment of ['development', 'test', 'production']) {
      vi.stubEnv('NODE_ENV', environment)
      expect((await getCampaignSession(request('GET'), context(campaign.id))).status).toBe(503)
      expect((await startCampaignSession(request('POST', { idempotencyKey: crypto.randomUUID() }), context(campaign.id))).status).toBe(503)
      expect((await getSession(request('GET'), context(session.id))).status).toBe(503)
      expect((await closeSession(request('PATCH', { idempotencyKey: crypto.randomUUID(), expectedRevision: 1 }), context(session.id))).status).toBe(503)
    }
  })

  it('persiste sessões no PostgreSQL isolado com idempotência e revisão', async () => {
    if (!testDatabaseUrl) return
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('DATABASE_URL', testDatabaseUrl)
    preparePostgresTest()
    await ensureGameSessionsTables()
    const campaign = await createTestCampaign('session-db-master')
    const otherCampaign = await createTestCampaign('session-db-other-master')
    const character = await createTestCharacter('session-db-player', campaign.id, 'Ficha própria')
    await db.execute(sql`UPDATE characters SET status = 'APPROVED', character_type = 'PLAYER_VAMPIRE' WHERE id = ${character.id}::uuid`)
    const night = await db.execute<{ id: string }>(sql`INSERT INTO chronicle_nights (campaign_id, night_number, in_game_date, status, started_by_user_id, idempotency_key, request_hash, ruleset_version) VALUES (${campaign.id}::uuid, 1, '2026-10-21', 'ACTIVE', 'session-db-master', ${crypto.randomUUID()}, 'test-hash', 'V5-AWAKE-1') RETURNING id`)
    const foreignNight = await db.execute<{ id: string }>(sql`INSERT INTO chronicle_nights (campaign_id, night_number, in_game_date, status, started_by_user_id, idempotency_key, request_hash, ruleset_version) VALUES (${otherCampaign.id}::uuid, 1, '2026-10-21', 'ACTIVE', 'session-db-other-master', ${crypto.randomUUID()}, 'test-hash', 'V5-AWAKE-1') RETURNING id`)
    mocks.actor = 'session-db-master'
    const key = crypto.randomUUID()
    const body = { idempotencyKey: key, chronicleNightIds: [night.rows[0].id] }
    const started = await startCampaignSession(request('POST', body), context(campaign.id))
    const { session } = await started.json()
    expect(session.chronicleNightIds).toEqual([night.rows[0].id])
    expect((await startCampaignSession(request('POST', body), context(campaign.id))).status).toBe(201)
    expect((await startCampaignSession(request('POST', { idempotencyKey: crypto.randomUUID() }), context(campaign.id))).status).toBe(409)
    expect((await startCampaignSession(request('POST', { idempotencyKey: crypto.randomUUID(), chronicleNightIds: [foreignNight.rows[0].id] }), context(campaign.id))).status).toBe(403)
    mocks.actor = 'session-db-player'
    expect((await getSession(request('GET'), context(session.id))).status).toBe(200)
    expect((await (await getSession(request('GET'), context(session.id))).json()).characters).toEqual([{ id: character.id, name: 'Ficha própria' }])
    mocks.actor = 'session-db-other-master'
    expect((await getSession(request('GET'), context(session.id))).status).toBe(403)
    await db.execute(sql`UPDATE campaigns SET master_user_id = 'replacement-master' WHERE id = ${campaign.id}::uuid`)
    mocks.actor = 'session-db-master'
    const closeKey = crypto.randomUUID()
    expect((await closeSession(request('PATCH', { idempotencyKey: closeKey, expectedRevision: 1 }), context(session.id))).status).toBe(403)
    await db.execute(sql`UPDATE campaigns SET master_user_id = 'session-db-master' WHERE id = ${campaign.id}::uuid`)
    const closed = await closeSession(request('PATCH', { idempotencyKey: closeKey, expectedRevision: 1 }), context(session.id))
    expect((await closed.json()).session).toMatchObject({ status: 'CLOSED', revision: 2, chronicleNightIds: [night.rows[0].id] })
    expect((await closeSession(request('PATCH', { idempotencyKey: closeKey, expectedRevision: 1 }), context(session.id))).status).toBe(200)
    expect((await (await getCampaignSession(request('GET'), context(campaign.id))).json()).session).toBeNull()
  })
})
