import { beforeEach, describe, expect, it, vi } from 'vitest'
import { devCreateCampaign, devCreateCharacter } from '@/lib/dev-db'
import { getCampaignCall, setCampaignCall } from '@/lib/campaign-calls'

const mocks = vi.hoisted(() => ({ actor: 'narrator', token: vi.fn() }))
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: () => mocks.actor ? { user: { sub: mocks.actor } } : null }))
vi.mock('@/lib/livekit', () => ({ getLiveKitUrl: () => 'wss://test.example', generateLiveKitToken: mocks.token }))

import { GET as status, PUT } from '@/app/api/campaigns/[id]/call/route'
import { GET as join, POST as host } from '@/app/api/livekit/room/route'

const request = (body: unknown, origin = 'http://localhost') => new Request('http://localhost/api/call', { method: 'PUT', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body) })
function setup() {
  const campaign = devCreateCampaign('narrator', { name: 'Mesa', theme: null, principios: null, averageXp: 0, status: 'Ativa', lastSessionAt: null })
  const character = devCreateCharacter('player', { campaignId: campaign.id })
  return { campaign, character, context: { params: Promise.resolve({ id: campaign.id }) }, joinRequest: new Request(`http://localhost/api/livekit/room?campaignId=${campaign.id}`) }
}

describe('convocação e ingresso autorizados', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test'); vi.stubEnv('DATABASE_URL', '')
    global.__devDb = undefined; global.__devDbCampaignCalendar = undefined
    mocks.actor = 'narrator'; mocks.token.mockReset(); mocks.token.mockResolvedValue('test-token')
  })
  it('convoca e encerra idempotentemente sem retornar token no status', async () => {
    const { campaign, context } = setup()
    expect(getCampaignCall('player', campaign.id).active).toBe(false)
    expect((await PUT(request({ active: true }), context)).status).toBe(200)
    expect(setCampaignCall('narrator', campaign.id, { active: true }).active).toBe(true)
    mocks.actor = 'player'
    const response = await status(new Request('http://localhost'), context)
    expect(await response.json()).toEqual({ active: true, canSummon: false })
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(mocks.token).not.toHaveBeenCalled()
    expect(setCampaignCall('narrator', campaign.id, { active: false }).active).toBe(false)
  })
  it('só emite token ao jogador convocado e participante atual', async () => {
    const { campaign, character, joinRequest } = setup()
    mocks.actor = 'player'
    expect((await join(joinRequest)).status).toBe(403)
    expect(mocks.token).not.toHaveBeenCalled()
    setCampaignCall('narrator', campaign.id, { active: true })
    mocks.actor = 'narrator'
    expect((await host(request({ campaignId: campaign.id }))).status).toBe(200)
    mocks.actor = 'player'
    expect((await join(joinRequest)).status).toBe(200)
    expect(mocks.token).toHaveBeenLastCalledWith(expect.objectContaining({ identity: 'player', isHost: false }))
    setCampaignCall('narrator', campaign.id, { active: false })
    expect((await join(joinRequest)).status).toBe(403)
    setCampaignCall('narrator', campaign.id, { active: true })
    character.campaignId = null
    expect((await join(joinRequest)).status).toBe(403)
  })
  it('exige sessão, mesa válida, Narrador atual e origem segura', async () => {
    const { context, joinRequest } = setup()
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
  it('troca de Narrador invalida convocação e não conserva host antigo', async () => {
    const { campaign, joinRequest } = setup()
    setCampaignCall('narrator', campaign.id, { active: true })
    await host(request({ campaignId: campaign.id }))
    global.__devDb!.campaigns.find(entry => entry.id === campaign.id)!.masterUserId = 'new-narrator'
    expect(getCampaignCall('player', campaign.id).active).toBe(false)
    expect(() => setCampaignCall('narrator', campaign.id, { active: true })).toThrow()
    mocks.actor = 'new-narrator'
    expect((await join(joinRequest)).status).toBe(200)
    expect(mocks.token).toHaveBeenLastCalledWith(expect.objectContaining({ isHost: true }))
  })
  it('revalida participação após geração assíncrona e não expõe erros internos', async () => {
    const { campaign, character, joinRequest } = setup()
    await host(request({ campaignId: campaign.id }))
    setCampaignCall('narrator', campaign.id, { active: true })
    mocks.actor = 'player'
    mocks.token.mockImplementation(async () => { character.campaignId = null; return 'must-not-leak' })
    const denied = await join(joinRequest)
    expect(denied.status).toBe(403)
    expect(JSON.stringify(await denied.json())).not.toContain('must-not-leak')
    mocks.actor = 'narrator'; mocks.token.mockRejectedValue(new Error('secret-internal-details'))
    expect(JSON.stringify(await (await join(joinRequest)).json())).not.toContain('secret-internal-details')
  })
  it('não reutiliza convocação após reset nem usa memória em produção', () => {
    const { campaign } = setup()
    setCampaignCall('narrator', campaign.id, { active: true })
    global.__devDb = undefined
    expect(() => getCampaignCall('narrator', campaign.id)).toThrow()
    vi.stubEnv('NODE_ENV', 'production')
    expect(() => getCampaignCall('narrator', campaign.id)).toThrow('banco externo')
  })
})
