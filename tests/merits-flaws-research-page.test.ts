import { beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ session: vi.fn() }))
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: mocks.session }))
vi.mock('next/navigation', () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`) }, notFound: () => { throw new Error('not-found') } }))
import MeritsFlawsResearchPage from '@/app/master/vantagens-defeitos/page'

beforeEach(() => { vi.clearAllMocks(); mocks.session.mockResolvedValue({ user: { sub: 'user' } }) })

it('exige autenticação antes de consultar permissões e retornar o catálogo', async () => {
  mocks.session.mockResolvedValue(null)
  await expect(MeritsFlawsResearchPage()).rejects.toThrow('redirect:/auth/login?returnTo=/master/vantagens-defeitos')
})
it('impede acesso com identidade inválida', async () => {
  mocks.session.mockResolvedValue({ user: { sub: '  ' } })
  await expect(MeritsFlawsResearchPage()).rejects.toThrow('not-found')
})
it('entrega a página ao usuário autenticado sem roles', async () => {
  const page = await MeritsFlawsResearchPage()
  expect(page.type).toBe('main')
})
