import { afterEach, expect, it, vi } from 'vitest'

const session = vi.hoisted(() => vi.fn())
vi.mock('@auth0/nextjs-auth0/server', () => ({ Auth0Client: class { getSession = session } }))
import { getSessionOrDev, getUserOrDev } from '@/lib/auth0'

afterEach(() => { vi.unstubAllEnvs(); session.mockReset() })

it.each(['1', '0', undefined])('produção nunca aceita bypass com flag %s', async flag => {
  vi.stubEnv('NODE_ENV', 'production')
  vi.stubEnv('DEV_AUTH_BYPASS', flag)
  session.mockResolvedValue(null)
  expect(await getSessionOrDev()).toBeNull()
  expect(await getUserOrDev()).toBeNull()
  session.mockResolvedValue({ user: { sub: 'real-user' } })
  expect(await getUserOrDev()).toEqual({ sub: 'real-user' })
})

it('mantém identidade local exclusivamente fora de produção', async () => {
  vi.stubEnv('NODE_ENV', 'development')
  expect(await getUserOrDev()).toMatchObject({ sub: 'dev|local' })
  expect(session).not.toHaveBeenCalled()
})
