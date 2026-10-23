import { beforeEach, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'

const session = vi.hoisted(() => {
  vi.stubEnv('NODE_ENV', 'test')
  return vi.fn()
})
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: session }))

import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { POST, readCampaignPolicy } from '@/app/api/campaigns/route'
import { PREDATOR_TYPE_CODES } from '@/lib/vtm-v5/predator-types'
import { getPredatorTypeSettings } from '@/lib/predator-types'
import { preparePostgresTest } from './postgres-test-helpers'

const request = (body: unknown) => new Request('http://localhost/api/campaigns', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
const campaignName = () => `Mesa de teste ${randomUUID()}`
beforeEach(async () => {
  await preparePostgresTest()
  session.mockResolvedValue({ user: { sub: 'narrator', 'https://meus-vampiros.app/roles': ['mestre'] } })
})

it('usa o catálogo completo como padrão quando a lista de predações não é enviada', () => {
  expect(readCampaignPolicy({}).enabledPredatorCodes).toEqual(PREDATOR_TYPE_CODES)
})

it('bloqueia criação sem autenticação ou papel de Narrador', async () => {
  session.mockResolvedValue(null)
  expect((await POST(request({ name: campaignName() }))).status).toBe(401)
  session.mockResolvedValue({ user: { sub: `outsider-${randomUUID()}` } })
  expect((await POST(request({ name: campaignName() }))).status).toBe(403)
})

it.each([{ enabledClanCodes: ['INVALID'] }, { enabledPredatorCodes: ['INVALID'] }, { enabledClanCodes: ['BRUJAH', 'BRUJAH'] }])('recusa configuração inválida sem criar campanha: %j', async config => {
  const name = campaignName()
  expect((await POST(request({ name, ...config }))).status).toBe(400)
  const result = await db.execute(sql`SELECT id FROM campaigns WHERE master_user_id = 'narrator' AND name = ${name}`)
  expect(result.rows).toHaveLength(0)
})

it('persiste a configuração inicial e não retorna token de convite', async () => {
  const name = campaignName()
  const response = await POST(request({ name, enabledClanCodes: ['BRUJAH'], enabledPredatorCodes: ['SIREN'], enableSchedulingCalendar: false }))
  expect(response.status).toBe(201)
  const body = await response.json()
  expect(body).not.toHaveProperty('inviteToken')
  expect(body.campaign).not.toHaveProperty('creationPolicy')
  const stored = await db.execute<{ id: string; enabled_clan_codes: string[]; creation_policy: { exceptionCodes: string[] } }>(sql`SELECT id, enabled_clan_codes, creation_policy FROM campaigns WHERE master_user_id = 'narrator' AND name = ${name}`)
  expect(stored.rows[0]).toMatchObject({ enabled_clan_codes: ['BRUJAH'], creation_policy: { exceptionCodes: [] } })
  expect((await getPredatorTypeSettings(stored.rows[0].id)).enabledCodes).toEqual(['SIREN'])
})

it('cria exceções predefinidas e recusa regra arbitrária', async () => {
  expect((await POST(request({ name: campaignName(), exceptionCodes: ['PREDATOR_TYPE_DISABLED_FOR_CAMPAIGN'] }))).status).toBe(400)
  const name = campaignName()
  const response = await POST(request({ name, exceptionCodes: ['PREDATOR_BAGGER_VENTRUE'] }))
  expect(response.status).toBe(201)
  const stored = await db.execute<{ creation_policy: { exceptionCodes: string[] } }>(sql`SELECT creation_policy FROM campaigns WHERE master_user_id = 'narrator' AND name = ${name}`)
  expect(stored.rows[0].creation_policy.exceptionCodes).toEqual(['PREDATOR_BAGGER_VENTRUE'])
})
