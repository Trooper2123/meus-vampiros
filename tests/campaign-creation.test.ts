import { beforeEach, expect, it, vi } from 'vitest'

const session = vi.hoisted(() => {
  vi.stubEnv('DATABASE_URL', undefined)
  vi.stubEnv('NODE_ENV', 'test')
  return vi.fn()
})
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: session }))
vi.mock('@/lib/db', () => ({ ensureAllTables: vi.fn(), db: null }))
import { POST } from '@/app/api/campaigns/route'

const request = (body: unknown) => new Request('http://localhost/api/campaigns', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
beforeEach(() => {
  global.__devDb = { characters: [], campaigns: [], possessions: [], characterLedgerEvents: [] }
  session.mockResolvedValue({ user: { sub: 'narrator', 'https://meus-vampiros.app/roles': ['mestre'] } })
})
it('bloqueia criação sem autenticação ou papel de Narrador', async () => {
  session.mockResolvedValue(null)
  expect((await POST(request({ name: 'Mesa' }))).status).toBe(401)
  session.mockResolvedValue({ user: { sub: 'player' } })
  expect((await POST(request({ name: 'Mesa' }))).status).toBe(403)
  expect(global.__devDb!.campaigns).toHaveLength(0)
})
it.each([{ enabledClanCodes: ['INVALID'] }, { enabledPredatorCodes: ['INVALID'] }, { enabledClanCodes: ['BRUJAH', 'BRUJAH'] }])('recusa configuração inválida sem criar campanha: %j', async config => {
  expect((await POST(request({ name: 'Mesa', ...config }))).status).toBe(400)
  expect(global.__devDb!.campaigns).toHaveLength(0)
})
it('persiste configuração inicial na mesa criada pelo Narrador', async () => {
  const response = await POST(request({ name: 'Mesa', enabledClanCodes: ['BRUJAH'], enabledPredatorCodes: ['SIREN'], enableSchedulingCalendar: false }))
  expect(response.status).toBe(201)
  expect(global.__devDb!.campaigns[0]).toMatchObject({ masterUserId: 'narrator', enabledClanCodes: ['BRUJAH'] })
  const body = await response.json()
  expect(body.inviteToken).toMatch(/^[A-Za-z0-9_-]{43}$/)
  expect(body.campaign).not.toHaveProperty('creationPolicy')
  expect(global.__devDb!.campaigns[0].creationPolicy?.exceptionCodes).toEqual([])
})
it('criação permite exceções predefinidas e recusa regra arbitrária', async () => {
  expect((await POST(request({ name: 'Mesa', exceptionCodes: ['PREDATOR_TYPE_DISABLED_FOR_CAMPAIGN'] }))).status).toBe(400)
  expect(global.__devDb!.campaigns).toHaveLength(0)
  const response = await POST(request({ name: 'Mesa', exceptionCodes: ['PREDATOR_BAGGER_VENTRUE'] }))
  expect(response.status).toBe(201)
  expect(global.__devDb!.campaigns[0].creationPolicy?.exceptionCodes).toEqual(['PREDATOR_BAGGER_VENTRUE'])
})
