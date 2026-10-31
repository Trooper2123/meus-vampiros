import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  snapshot: { session: null as null | { id: string; status: string; revision: number }, archived: false, sessions: [] as { id: string; status: string; startedAt: string }[], canManage: true, characters: [] },
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
function view() {
  const wrapper = CampaignSessionWorkspace({ campaignId: 'campaign', actorId: 'actor' })
  const child = wrapper.props.children as Element
  const view = (child.type as (props: object) => ReactNode)(child.props)
  return elements(view)
}
function command() { return view().find(element => element.type === 'button')!.props.onClick as () => void }
async function settled() { await vi.waitFor(() => expect(mocks.changed).toHaveBeenLastCalledWith(false)) }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.snapshot.session = null
  mocks.snapshot.canManage = true
  mocks.snapshot.archived = false
  mocks.snapshot.sessions = []
  vi.stubGlobal('window', { location: { href: 'http://localhost/campaigns/campaign/session' }, history: { state: null, replaceState: vi.fn() } })
})
afterEach(() => vi.unstubAllGlobals())

it('organiza as seções em dropdown com início de noite, notas e vídeo nessa ordem', () => {
  mocks.snapshot.session = { id: 'session', status: 'ACTIVE', revision: 1 }
  const summaries = view().filter(element => element.type === 'summary')
  expect(summaries.map(element => element.props.children)).toEqual(['Início da noite', 'Anotações da mesa', 'Videochamada', 'NPCs da sessão', 'Pesquisas da sessão', 'Ficha e rolagens', 'XP e pertences', 'Revelações da sessão'])
  expect(view().some(element => element.type === 'p' && element.props.children === 'Nenhuma ficha disponível nesta sessão.')).toBe(true)
})

it('não oferece início de noite, pesquisas ou gestão de XP ao jogador', () => {
  mocks.snapshot.session = { id: 'session', status: 'ACTIVE', revision: 1 }
  mocks.snapshot.canManage = false
  expect(view().filter(element => element.type === 'summary').map(element => element.props.children)).toEqual(['Anotações da mesa', 'Videochamada', 'NPCs da sessão', 'Ficha e rolagens', 'Revelações da sessão'])
})

it('mantém início de noite e notas indisponíveis antes de iniciar a sessão', () => {
  expect(view().filter(element => element.type === 'summary').map(element => element.props.children)).toEqual(['Videochamada'])
})

it('jogador consulta notas e revelações de sessão encerrada sem receber comandos ativos', () => {
  mocks.snapshot.canManage = false
  mocks.snapshot.sessions = [{ id: 'closed', status: 'CLOSED', startedAt: '2026-10-29T20:00:00Z' }]
  expect(view().filter(element => element.type === 'summary').map(element => element.props.children)).toEqual(['Anotações da mesa', 'Videochamada', 'NPCs da sessão', 'Revelações da sessão'])
  expect(view().some(element => element.type === 'select' && element.props.value === 'closed')).toBe(true)
})

it('não oferece início de sessão para mesa arquivada', () => {
  mocks.snapshot.archived = true
  expect(view().some(element => element.type === 'button' && element.props.children === 'Iniciar sessão')).toBe(false)
})

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
