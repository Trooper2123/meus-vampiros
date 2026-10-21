import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ session: vi.fn(), execute: vi.fn() }))
vi.mock('@auth0/nextjs-auth0/server', () => ({ Auth0Client: class { getSession = mocks.session } }))
vi.mock('@/lib/db', () => ({ db: { execute: mocks.execute } }))
import { getSessionOrDev } from '@/lib/auth0'
import { hasMasterAccess, isMaster } from '@/lib/campaigns'

beforeEach(() => { vi.clearAllMocks(); mocks.execute.mockResolvedValue({ rows: [] }) })
afterEach(() => vi.unstubAllEnvs())

it('sessão dev é mestre mesmo sem mesas, sem consultar ou modificar o banco', async () => {
  vi.stubEnv('NODE_ENV', 'development')
  const session = await getSessionOrDev()
  expect(session?.user.sub).toBe('dev|local')
  expect(isMaster(session!.user)).toBe(true)
  expect(await hasMasterAccess(session!.user)).toBe(true)
  expect(mocks.execute).not.toHaveBeenCalled()
  expect(mocks.session).not.toHaveBeenCalled()
})

it('produção mantém a sessão Auth0 e não injeta perfil mestre nem identidade dev', async () => {
  vi.stubEnv('NODE_ENV', 'production')
  const realSession = { user: { sub: 'auth0|player' } }
  mocks.session.mockResolvedValue(realSession)
  expect(await getSessionOrDev()).toBe(realSession)
  expect(isMaster(realSession.user)).toBe(false)
  expect(await hasMasterAccess(realSession.user)).toBe(false)
  expect(mocks.execute).toHaveBeenCalledOnce()
})

it('produção sem sessão continua não autenticada', async () => {
  vi.stubEnv('NODE_ENV', 'production'); mocks.session.mockResolvedValue(null)
  expect(await getSessionOrDev()).toBeNull()
  expect(mocks.execute).not.toHaveBeenCalled()
})

it('preserva a claim de mestre recebida da sessão real', async () => {
  vi.stubEnv('NODE_ENV', 'production')
  const realSession = { user: { sub: 'auth0|narrator', 'https://meus-vampiros.app/roles': ['mestre'] } }
  mocks.session.mockResolvedValue(realSession)
  expect(isMaster((await getSessionOrDev())!.user)).toBe(true)
  expect(mocks.execute).not.toHaveBeenCalled()
})
