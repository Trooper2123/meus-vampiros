import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  snapshot: { session: null as null | { id: string; status: string; revision: number }, canManage: true, characters: [] },
  changed: vi.fn(), mutate: vi.fn(),
}))
vi.mock('react', async original => ({
  ...await original<typeof import('react')>(),
  useEffect: () => undefined,
  useRef: (value: unknown) => ({ current: value }),
  useState: (value: unknown) => [value, mocks.changed],
}))
vi.mock('swr', () => ({
  SWRConfig: () => null,
  default: () => ({ data: mocks.snapshot, mutate: mocks.mutate }),
  useSWRConfig: () => ({ mutate: mocks.mutate }),
}))
import { CampaignSessionWorkspace } from '@/components/game-session/session-workspace'

type Element = ReactElement<Record<string, any>>
function elements(node: ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements)
  if (!node || typeof node !== 'object' || !('props' in node)) return []
  const element = node as Element
  return [element, ...elements(element.props.children)]
}
function command() {
  const wrapper = CampaignSessionWorkspace({ campaignId: 'campaign', actorId: 'actor' })
  const child = wrapper.props.children as Element
  const view = (child.type as (props: object) => ReactNode)(child.props)
  return elements(view).find(element => element.type === 'button')!.props.onClick as () => void
}
async function settled() { await vi.waitFor(() => expect(mocks.changed).toHaveBeenLastCalledWith(false)) }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.snapshot.session = null
  vi.stubGlobal('window', { location: { href: 'http://localhost/campaigns/campaign/session' }, history: { state: null, replaceState: vi.fn() } })
})
afterEach(() => vi.unstubAllGlobals())

it('bloqueia cliques concorrentes e conserva a chave após falha de rede', async () => {
  const fetcher = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(Response.json({ session: { id: 'session' } }))
  vi.stubGlobal('fetch', fetcher)
  const click = command()
  click()
  click()
  await settled()
  expect(fetcher).toHaveBeenCalledTimes(1)
  click()
  await vi.waitFor(() => expect(mocks.mutate).toHaveBeenCalled())
  const bodies = fetcher.mock.calls.map(call => JSON.parse(call[1].body))
  expect(bodies[0].idempotencyKey).toBeTruthy()
  expect(bodies[1]).toEqual(bodies[0])
})

it('preserva a sessão encerrada usando o envelope da API', async () => {
  mocks.snapshot.session = { id: 'closed-session', status: 'ACTIVE', revision: 4 }
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ session: { id: 'closed-session', status: 'CLOSED', revision: 5 } })))
  command()()
  await settled()
  expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)).toMatchObject({ expectedRevision: 4 })
  expect(window.history.replaceState).toHaveBeenCalledWith(null, '', 'http://localhost/campaigns/campaign/session?npcSessionId=closed-session')
})

it('relê o snapshot após conflito sem sobrescrever a revisão do servidor', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: 'A sessão mudou.' }, { status: 409 })))
  command()()
  await settled()
  expect(mocks.changed).toHaveBeenCalledWith('A sessão mudou.')
  expect(mocks.mutate).toHaveBeenCalledOnce()
  expect(window.history.replaceState).not.toHaveBeenCalled()
})
