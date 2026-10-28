import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const harness = vi.hoisted(() => ({ states: [] as unknown[], index: 0, effect: undefined as (() => void) | undefined }))
vi.mock('react', async original => ({
  ...await original<typeof import('react')>(),
  useState: (initial: unknown) => {
    const index = harness.index++
    if (!(index in harness.states)) harness.states[index] = initial
    return [harness.states[index], (value: unknown) => { harness.states[index] = value }]
  },
  useEffect: (effect: () => void) => { harness.effect = effect },
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/components/archive-header', () => ({ ArchiveHeader: () => null }))
vi.mock('@/components/campaign-calendar/scheduling-calendar-intro-modal', () => ({ SchedulingCalendarIntroModal: () => null }))
import NewCampaignPage from '@/app/campaigns/new/page'

function render() {
  harness.index = 0
  return renderToStaticMarkup(createElement(NewCampaignPage))
}
beforeEach(() => { harness.states = []; harness.effect = undefined })
afterEach(() => vi.unstubAllGlobals())

it('carregamento não apresenta seletores vazios ou permite envio', () => {
  const html = render()
  expect(html).toContain('Carregando permissões e regras da mesa...')
  expect(html).not.toContain('<form')
})

it('renderiza opções e acentos após autorização do servidor', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ canCreate: true, campaigns: [], clans: [{ code: 'BRUJAH', name: 'Brujah' }], predatorTypes: [{ code: 'SIREN', name: 'Sereia', source: 'COREBOOK' }] })))
  render(); harness.effect!()
  await vi.waitFor(() => expect(render()).toContain('Brujah'))
  const html = render()
  expect(html).toContain('Sereia')
  expect(html).toContain('Quais predações serão permitidas?')
  expect(html).toContain('Princípios da crônica')
  expect(html).toContain('Último encontro')
  expect(html).not.toMatch(/Ã.|Â.|\uFFFD/)
  expect(fetch).toHaveBeenCalledWith('/api/campaigns', { cache: 'no-store' })
})

it.each([
  { body: { canCreate: false, campaigns: [] }, message: 'Não foi possível validar sua sessão' },
  { body: { canCreate: true, campaigns: [] }, message: 'Não foi possível carregar os clãs' },
])('informa acesso negado ou catálogos ausentes: $message', async ({ body, message }) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(body)))
  render(); harness.effect!()
  await vi.waitFor(() => expect(render()).toContain(message))
  expect(render()).not.toContain('<form')
  expect(render()).toContain('role="alert"')
})

it('informa falha de rede sem liberar o formulário', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Falha de conexão')))
  render(); harness.effect!()
  await vi.waitFor(() => expect(render()).toContain('Falha de conexão'))
  expect(render()).not.toContain('<form')
})
