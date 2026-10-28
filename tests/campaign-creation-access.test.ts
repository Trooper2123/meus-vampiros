import { beforeEach, expect, it, vi } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'

const mocks = vi.hoisted(() => ({ session: vi.fn(), ensure: vi.fn(), execute: vi.fn(), saveSettings: vi.fn(), createPolicy: vi.fn() }))
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: mocks.session }))
vi.mock('@/lib/db', () => ({ db: { execute: mocks.execute }, ensureAllTables: mocks.ensure }))
vi.mock('@/lib/predator-types', async original => ({ ...await original<typeof import('@/lib/predator-types')>(), savePredatorTypeSettings: mocks.saveSettings }))
vi.mock('@/lib/campaign-invitations', async original => ({ ...await original<typeof import('@/lib/campaign-invitations')>(), createCampaignPolicy: mocks.createPolicy }))

import { GET, POST } from '@/app/api/campaigns/route'
import { CLANS } from '@/lib/vtm-v5/clans'
import { PREDATOR_TYPES } from '@/lib/vtm-v5/predator-types'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.session.mockResolvedValue({ user: { sub: 'narrator' } })
  mocks.execute.mockResolvedValue({ rows: [] })
  mocks.ensure.mockResolvedValue(undefined)
})

it('retorna todos os catálogos para usuário sem roles ou mesas e impede cache compartilhado', async () => {
  const response = await GET()
  expect(response.status).toBe(200)
  expect(response.headers.get('Cache-Control')).toBe('private, no-store')
  expect(response.headers.get('Vary')).toBe('Cookie')
  expect(await response.json()).toEqual({ campaigns: [], canCreate: true,
    clans: CLANS.map(({ code, name }) => ({ code, name })),
    predatorTypes: PREDATOR_TYPES.map(({ code, name, source }) => ({ code, name, source })),
  })
})

it('nega sessão ausente antes de acessar o banco', async () => {
  mocks.session.mockResolvedValue(null)
  expect((await GET()).status).toBe(401)
  expect(mocks.ensure).not.toHaveBeenCalled()
  expect(mocks.execute).not.toHaveBeenCalled()
})

it('usuário antes jogador também recebe as opções de criação de mesa', async () => {
  mocks.session.mockResolvedValue({ user: { sub: 'player' } })
  const response = await GET()
  const body = await response.json()
  expect(body.canCreate).toBe(true)
  expect(body.clans).toHaveLength(CLANS.length)
  expect(body.predatorTypes).toHaveLength(PREDATOR_TYPES.length)
  expect(response.headers.get('Cache-Control')).toBe('private, no-store')
})

it.each([null, { user: { sub: '' } }, { user: { sub: '  ' } }])('nega criação sem identidade válida mesmo com role forjado: %j', async session => {
  mocks.session.mockResolvedValue(session)
  const request = new Request('http://localhost/api/campaigns', { method: 'POST', body: JSON.stringify({ name: 'Mesa', role: 'mestre', canCreate: true }) })
  expect((await POST(request)).status).toBe(401)
  expect(mocks.execute).not.toHaveBeenCalled()
})

it('falha de banco retorna erro público sem detalhes internos', async () => {
  mocks.ensure.mockRejectedValue(new Error('internal database credentials'))
  const response = await GET()
  expect(response.status).toBe(500)
  expect(await response.json()).toEqual({ error: 'Não foi possível carregar as mesas.' })
})

it('cria mesa sem roles vinculada ao sub da sessão e ignora proprietário enviado no corpo', async () => {
  const id = '11111111-1111-4111-8111-111111111111'
  mocks.session.mockResolvedValue({ user: { sub: 'user' } })
  mocks.execute.mockResolvedValueOnce({ rows: [{ id, name: 'Mesa', last_session_at: null }] })
  const response = await POST(new Request('http://localhost/api/campaigns', { method: 'POST', body: JSON.stringify({ name: 'Mesa', masterUserId: 'other', userId: 'other', enabledClanCodes: ['BRUJAH'], enabledPredatorCodes: ['SIREN'] }) }))
  expect(response.status).toBe(201)
  const insert = new PgDialect().sqlToQuery(mocks.execute.mock.calls[0][0])
  expect(insert.sql).toContain('INSERT INTO campaigns (master_user_id')
  expect(insert.params[0]).toBe('user')
  expect(insert.params).not.toContain('other')
  expect(mocks.createPolicy).toHaveBeenCalledWith('user', id, [])
  expect(mocks.saveSettings.mock.calls[0][2]).toBe('user')
})
