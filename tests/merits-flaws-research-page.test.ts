import { beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ session: vi.fn(), access: vi.fn() }))
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: mocks.session }))
vi.mock('@/lib/campaigns', () => ({ hasMasterAccess: mocks.access }))
vi.mock('next/navigation', () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`) }, notFound: () => { throw new Error('not-found') } }))
import MeritsFlawsResearchPage from '@/app/master/vantagens-defeitos/page'

beforeEach(() => { vi.clearAllMocks(); mocks.session.mockResolvedValue({ user: { sub: 'narrator' } }); mocks.access.mockResolvedValue(true) })

it('exige autenticação antes de consultar permissões e retornar o catálogo', async () => {
  mocks.session.mockResolvedValue(null)
  await expect(MeritsFlawsResearchPage()).rejects.toThrow('redirect:/auth/login?returnTo=/master/vantagens-defeitos')
  expect(mocks.access).not.toHaveBeenCalled()
})
it('impede acesso de jogador, independentemente de conhecer a URL', async () => {
  mocks.session.mockResolvedValue({ user: { sub: 'player' } })
  mocks.access.mockResolvedValue(false)
  await expect(MeritsFlawsResearchPage()).rejects.toThrow('not-found')
  expect(mocks.access).toHaveBeenCalledWith({ sub: 'player' })
})
it('entrega a página ao Narrador autorizado', async () => {
  const page = await MeritsFlawsResearchPage()
  expect(page.type).toBe('main')
  expect(mocks.access).toHaveBeenCalledWith({ sub: 'narrator' })
})
