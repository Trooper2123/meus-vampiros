import { beforeEach, expect, it, vi } from 'vitest'

const session = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: session }))
import { createTestCampaign, createTestCharacter, preparePostgresTest } from './postgres-test-helpers'
import { GET, POST, PATCH } from '@/app/api/campaign-availability/route'
import { getAvailability, getCampaignSchedule } from '@/lib/availability'

let campaignId: string
const request = (body: unknown, method = 'PATCH') => new Request('http://localhost/api/campaign-availability', { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
beforeEach(async () => {
  preparePostgresTest()
  campaignId = (await createTestCampaign('narrator', 'Mesa')).id
  await createTestCharacter('player', campaignId, 'Jogador')
  session.mockResolvedValue({ user: { sub: 'narrator' } })
})

it('persiste horários na própria mesa e não mistura campanhas', async () => {
  expect((await PATCH(request({ campaignId, action: 'schedule', startTime: '19:30', endTime: '22:15' }))).status).toBe(200)
  expect(await getCampaignSchedule(campaignId)).toEqual({ startTime: '19:30', endTime: '22:15' })
  const other = await createTestCampaign('narrator', 'Outra')
  expect(await getCampaignSchedule(other.id)).toEqual({ startTime: null, endTime: null })
  const response = await GET(new Request(`http://localhost/api/campaign-availability?campaignId=${campaignId}`))
  expect(await response.json()).toMatchObject({ currentUserId: 'narrator', schedule: { startTime: '19:30', endTime: '22:15' } })
})

it.each(['player', 'foreign-narrator'])('recusa alteração por %s', async user => {
  session.mockResolvedValue({ user: { sub: user } })
  expect((await PATCH(request({ campaignId, action: 'schedule', startTime: '19:00', endTime: '22:00' }))).status).toBe(403)
})

it('recusa sem sessão, JSON nulo e intervalos inválidos', async () => {
  expect((await PATCH(request(null))).status).toBe(400)
  for (const startTime of ['25:00', '23:00', '']) expect((await PATCH(request({ campaignId, action: 'schedule', startTime, endTime: '22:00' }))).status).toBe(400)
  session.mockResolvedValue(null)
  expect((await PATCH(request({ campaignId }))).status).toBe(401)
})

it('POST é idempotente para sugestão e PATCH alterna inclusive data nova', async () => {
  const body = { campaignId, date: '2026-10-15', status: 'disponível', suggested: true }
  await POST(request(body, 'POST'))
  await POST(request(body, 'POST'))
  expect((await getAvailability(campaignId)).find(entry => entry.date === body.date)?.suggested).toBe(true)
  await PATCH(request({ campaignId, date: body.date }))
  expect((await getAvailability(campaignId)).find(entry => entry.date === body.date)?.suggested).toBe(false)
  await PATCH(request({ campaignId, date: '2026-10-16' }))
  expect((await getAvailability(campaignId)).find(entry => entry.date === '2026-10-16')?.suggested).toBe(true)
})

it('bloqueia origem cruzada, identificadores e datas forjados sem mutação', async () => {
  const crossSite = new Request('http://localhost/api/campaign-availability', { method: 'PATCH', headers: { 'content-type': 'application/json', origin: 'https://evil.invalid' }, body: JSON.stringify({ campaignId, date: '2026-10-15' }) })
  expect((await PATCH(crossSite)).status).toBe(403)
  expect((await PATCH(request({ campaignId: 'invalid', date: '2026-10-15' }))).status).toBe(400)
  expect((await POST(request({ campaignId, date: '2026-02-30', status: 'disponível' }, 'POST'))).status).toBe(400)
  expect(await getAvailability(campaignId)).toEqual([])
  session.mockResolvedValue({ user: { sub: 'outsider' } })
  expect((await GET(new Request(`http://localhost/api/campaign-availability?campaignId=${campaignId}`))).status).toBe(403)
})
