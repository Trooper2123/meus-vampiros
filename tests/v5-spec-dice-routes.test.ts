import { beforeEach, expect, it, vi } from 'vitest'
const session = vi.hoisted(() => { vi.stubEnv('NODE_ENV', 'test'); vi.stubEnv('DATABASE_URL', undefined); return vi.fn() })
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: session }))
vi.mock('node:fs/promises', () => ({ stat: vi.fn().mockResolvedValue({ size: 3 }) }))
vi.mock('node:fs', async () => {
  const { Readable } = await import('node:stream')
  return { createReadStream: vi.fn(() => Readable.from([Buffer.from('PDF')])) }
})
import { POST as reroll } from '@/app/api/characters/[id]/rolls/[rollId]/reroll/route'
import { POST as adjudicate } from '@/app/api/characters/[id]/rolls/[rollId]/adjudications/route'
import { GET as source } from '@/app/api/rule-sources/[id]/route'
const id = '11111111-1111-4111-8111-111111111111'
const rollId = '22222222-2222-4222-8222-222222222222'
const idempotencyKey = '33333333-3333-4333-8333-333333333333'
const context = { params: Promise.resolve({ id, rollId }) }
const request = (body: unknown, headers: Record<string, string> = {}) => new Request('http://localhost/api/roll', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) })
beforeEach(() => { session.mockResolvedValue({ user: { sub: 'owner' } }); global.__devDb = undefined })

it.each([reroll, adjudicate])('exige autenticação e origem da aplicação', async handler => {
  session.mockResolvedValue(null)
  expect((await handler(request({}), context)).status).toBe(401)
  session.mockResolvedValue({ user: { sub: 'owner' } })
  expect((await handler(request({}, { origin: 'https://attacker.invalid' }), context)).status).toBe(403)
  expect((await handler(request({}, { 'sec-fetch-site': 'cross-site' }), context)).status).toBe(403)
})

it.each([
  { dieIds: ['H:0'], expectedRevision: 0, idempotencyKey },
  { dieIds: ['N:0'], expectedRevision: -1, idempotencyKey },
  { dieIds: ['N:0'], expectedRevision: 0, idempotencyKey, result: [10] },
  { dieIds: ['N:0'], expectedRevision: 0, idempotencyKey: '__proto__' },
])('rejeita dado de Fome, campos forjados, revisão e chave inválidos %j', async body => {
  expect((await reroll(request(body), context)).status).toBe(400)
})

it('recusa identificadores manipulados e decisões malformadas', async () => {
  expect((await adjudicate(request({ kind: 'COMPLICATION', note: 'Texto', idempotencyKey, expectedRevision: 0, successes: 999 }), context)).status).toBe(400)
  expect((await reroll(request({}), { params: Promise.resolve({ id: '../foreign', rollId }) })).status).toBe(400)
})

it('não serve PDFs enquanto não houver concessões explícitas e confirmação de direitos', async () => {
  session.mockResolvedValue(null)
  expect((await source(new Request('http://localhost'), { params: Promise.resolve({ id: 'CORE-DICE' }) })).status).toBe(401)
  session.mockResolvedValue({ user: { sub: 'owner' } })
  for (const id of ['__proto__', '../../.env']) expect((await source(new Request('http://localhost'), { params: Promise.resolve({ id }) })).status).toBe(404)
  const response = await source(new Request('http://localhost'), { params: Promise.resolve({ id: 'CORE-DICE' }) })
  expect(response.status).toBe(404)
  expect(await response.json()).toMatchObject({ error: 'O arquivo não está disponível nesta etapa.' })
})
