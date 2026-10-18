import { beforeEach, expect, it, vi } from 'vitest'
const session = vi.hoisted(() => { vi.stubEnv('NODE_ENV', 'test'); vi.stubEnv('DATABASE_URL', ''); return vi.fn() })
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: session }))
vi.mock('@/lib/db', () => ({ db: null }))
import { POST } from '@/app/api/characters/[id]/campaign/route'
import { devCreateCampaign, devCreateCharacter } from '@/lib/dev-db'
import { createCampaignInvitation } from '@/lib/campaign-invitations'
import { randomUUID } from 'node:crypto'

function fixture() {
  const campaign = devCreateCampaign('master', { name: 'Mesa', theme: null, principios: null, averageXp: 0, status: 'Ativa', lastSessionAt: null })
  const character = devCreateCharacter('player', { name: 'Ficha', data: { characterType: 'PLAYER_VAMPIRE' } })
  const token = createCampaignInvitation('master', campaign.id, [])
  const body = { invitation: { campaignId: campaign.id, token, accepted: true }, expectedRevision: 0, idempotencyKey: randomUUID() }
  const context = { params: Promise.resolve({ id: character.id }) }
  return { campaign, character, body, context }
}
const request = (body: unknown, origin = 'http://localhost') => new Request('http://localhost/api/characters/link', { method: 'POST', headers: { 'content-type': 'application/json', origin }, body: JSON.stringify(body) })
beforeEach(() => { global.__devDb = { characters: [], campaigns: [], possessions: [], characterLedgerEvents: [] }; session.mockResolvedValue({ user: { sub: 'player' } }) })
it('vincula somente com convite aceito e registra revisão/consentimento sem duplicar no replay', async () => {
  const { campaign, character, body, context } = fixture()
  const first = await POST(request(body), context)
  expect(first.status).toBe(200)
  expect(character).toMatchObject({ campaignId: campaign.id, status: 'DRAFT', revision: 1, gameState: { policyConsent: { acceptedBy: 'player', campaignId: campaign.id } } })
  expect(await (await POST(request(body), context)).json()).toEqual(await first.json())
  expect(global.__devDb!.characterLedgerEvents).toHaveLength(1)
  expect(JSON.stringify(global.__devDb!.characterLedgerEvents)).not.toContain(body.invitation.token)
})
it.each([null, 'outsider', 'master'])('impede vínculo por %s', async actor => {
  const { character, body, context } = fixture()
  session.mockResolvedValue(actor ? { user: { sub: actor } } : null)
  expect((await POST(request(body), context)).status).toBe(actor ? 403 : 401)
  expect(character.campaignId).toBeNull()
})
it('nega token adulterado, falta de aceite, origem cruzada e revisão obsoleta', async () => {
  const { character, body, context } = fixture()
  expect((await POST(request({ ...body, invitation: { ...body.invitation, token: 'a'.repeat(43) } }), context)).status).toBe(403)
  expect((await POST(request({ ...body, invitation: { ...body.invitation, accepted: false } }), context)).status).toBe(400)
  expect((await POST(request(body, 'https://evil.invalid'), context)).status).toBe(403)
  expect((await POST(request({ ...body, expectedRevision: 8 }), context)).status).toBe(409)
  expect(character.campaignId).toBeNull()
})
it('recusa NPC, troca de mesa e clã proibido sem modificar a ficha', async () => {
  const { campaign, character, body, context } = fixture()
  character.characterType = 'HUMAN_NPC'
  expect((await POST(request(body), context)).status).toBe(409)
  character.characterType = 'PLAYER_VAMPIRE'
  character.campaignId = campaign.id
  expect((await POST(request(body), context)).status).toBe(409)
  character.campaignId = null
  character.data.cla = 'Toreador'
  global.__devDb!.campaigns.find(entry => entry.id === campaign.id)!.enabledClanCodes = ['BRUJAH']
  expect((await POST(request(body), context)).status).toBe(422)
  expect(character.campaignId).toBeNull()
})
it('não usa banco externo', async () => {
  const { body, context } = fixture()
  vi.stubEnv('DATABASE_URL', 'postgresql://invalid/test')
  try { expect((await POST(request(body), context)).status).toBe(503) }
  finally { vi.stubEnv('DATABASE_URL', '') }
})

it.each(['GRAVEROBBER', 'HOSPITAL_HUNTER'])('recusa predação inválida/desabilitada na mesa: %s', async code => {
  const { character, body, context } = fixture()
  character.data.predatorTypeCode = code
  expect((await POST(request(body), context)).status).toBe(422)
  expect(character.campaignId).toBeNull()
})
