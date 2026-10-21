import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { createTestCampaign, createTestCharacter, preparePostgresTest } from './postgres-test-helpers'
import { getCampaignCall, setCampaignCall } from '@/lib/campaign-calls'

const mocks = vi.hoisted(() => ({ actor: 'narrator', token: vi.fn() }))
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: () => mocks.actor ? { user: { sub: mocks.actor } } : null }))
vi.mock('@/lib/livekit', () => ({ getLiveKitUrl: () => 'wss://test.example', generateLiveKitToken: mocks.token }))

import { GET as status, PUT } from '@/app/api/campaigns/[id]/call/route'
import { GET as join, POST as host } from '@/app/api/livekit/room/route'

const request = (body: unknown, origin = 'http://localhost') => new Request('http://localhost/api/call', { method: 'PUT', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body) })
async function setup() {
  const campaign = await createTestCampaign('narrator')
  const character = await createTestCharacter('player', campaign.id)
  return { campaign, character, context: { params: Promise.resolve({ id: campaign.id }) }, joinRequest: new Request(`http://localhost/api/livekit/room?campaignId=${campaign.id}`) }
}

describe('convocação e ingresso autorizados', () => {
  beforeEach(async () => {
    vi.stubEnv('NODE_ENV', 'test')
    await preparePostgresTest()
    mocks.actor = 'narrator'; mocks.token.mockReset(); mocks.token.mockResolvedValue('test-token')
  })
  it('convoca e encerra idempotentemente sem retornar token no status', async () => {
    const { campaign, context } = await setup()
    expect((await getCampaignCall('player', campaign.id)).active).toBe(false)
    expect((await PUT(request({ active: true }), context)).status).toBe(200)
    expect((await setCampaignCall('narrator', campaign.id, { active: true })).active).toBe(true)
    mocks.actor = 'player'
    const response = await status(new Request('http://localhost'), context)
    expect(await response.json()).toEqual({ active: true, canSummon: false })
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(mocks.token).not.toHaveBeenCalled()
    expect((await setCampaignCall('narrator', campaign.id, { active: false })).active).toBe(false)
  })
  it('só emite token ao jogador convocado e participante atual', async () => {
    const { campaign, character, joinRequest } = await setup()
    mocks.actor = 'player'
    expect((await join(joinRequest)).status).toBe(403)
    expect(mocks.token).not.toHaveBeenCalled()
    await setCampaignCall('narrator', campaign.id, { active: true })
    mocks.actor = 'narrator'
    expect((await host(request({ campaignId: campaign.id }))).status).toBe(200)
    mocks.actor = 'player'
    expect((await join(joinRequest)).status).toBe(200)
    expect(mocks.token).toHaveBeenLastCalledWith(expect.objectContaining({ identity: 'player', isHost: false }))
    await setCampaignCall('narrator', campaign.id, { active: false })
    expect((await join(joinRequest)).status).toBe(403)
    await setCampaignCall('narrator', campaign.id, { active: true })
    await db.execute(sql`UPDATE characters SET campaign_id = NULL WHERE id = ${character.id}::uuid`)
    expect((await join(joinRequest)).status).toBe(403)
  })
  it('exige sessão, mesa válida, Narrador atual e origem segura', async () => {
    const { context, joinRequest } = await setup()
    mocks.actor = ''
    expect((await status(new Request('http://localhost'), context)).status).toBe(401)
    expect((await join(joinRequest)).status).toBe(401)
    mocks.actor = 'player'
    expect((await PUT(request({ active: true }), context)).status).toBe(403)
    mocks.actor = 'third-party'
    expect((await status(new Request('http://localhost'), context)).status).toBe(403)
    mocks.actor = 'narrator'
    expect((await PUT(request({ active: true }, 'https://evil.example'), context)).status).toBe(403)
    expect((await status(new Request('http://localhost'), { params: Promise.resolve({ id: 'invalid' }) })).status).toBe(400)
    expect((await PUT(request({ active: true, canSummon: true }), context)).status).toBe(400)
  })
  it('novo narrador assume a sala sem alterar o estado da convocacao', async () => {
    const { campaign, joinRequest } = await setup()
    await setCampaignCall('narrator', campaign.id, { active: true })
    await host(request({ campaignId: campaign.id }))
    await db.execute(sql`UPDATE campaigns SET master_user_id = 'new-narrator' WHERE id = ${campaign.id}::uuid`)
    expect((await getCampaignCall('player', campaign.id)).active).toBe(true)
    await expect(setCampaignCall('narrator', campaign.id, { active: true })).rejects.toThrow()
    mocks.actor = 'new-narrator'
    expect((await join(joinRequest)).status).toBe(200)
    expect(mocks.token).toHaveBeenLastCalledWith(expect.objectContaining({ isHost: true }))
  })
  it('revalida participação após geração assíncrona e não expõe erros internos', async () => {
    const { campaign, character, joinRequest } = await setup()
    await host(request({ campaignId: campaign.id }))
    await setCampaignCall('narrator', campaign.id, { active: true })
    mocks.actor = 'player'
    mocks.token.mockImplementation(async () => { await db.execute(sql`UPDATE characters SET campaign_id = NULL WHERE id = ${character.id}::uuid`); return 'must-not-leak' })
    const denied = await join(joinRequest)
    expect(denied.status).toBe(403)
    expect(JSON.stringify(await denied.json())).not.toContain('must-not-leak')
    mocks.actor = 'narrator'; mocks.token.mockRejectedValue(new Error('secret-internal-details'))
    expect(JSON.stringify(await (await join(joinRequest)).json())).not.toContain('secret-internal-details')
  })
  it('não reutiliza convocação após reset nem usa memória em produção', async () => {
    const { campaign } = await setup()
    await setCampaignCall('narrator', campaign.id, { active: true })
    await expect(getCampaignCall('narrator', 'invalid')).rejects.toMatchObject({ status: 400 })
    vi.stubEnv('NODE_ENV', 'production')
    expect((await getCampaignCall('narrator', campaign.id)).active).toBe(true)
  })
})
