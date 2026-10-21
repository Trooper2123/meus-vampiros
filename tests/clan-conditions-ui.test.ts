import type { ReactElement, ReactNode } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ cursor: 0, refCursor: 0, states: [] as unknown[], refs: [] as { current: unknown }[], mutate: vi.fn() }))
vi.mock('swr', () => ({ useSWRConfig: () => ({ mutate: mocks.mutate }) }))
vi.mock('react', async original => ({ ...await original<typeof import('react')>(), useRef: (initial: unknown) => {
  const index = mocks.refCursor++
  mocks.refs[index] ??= { current: initial }
  return mocks.refs[index]
}, useState: (initial: unknown) => {
  const index = mocks.cursor++
  if (!(index in mocks.states)) mocks.states[index] = initial
  return [mocks.states[index], (value: unknown) => { mocks.states[index] = typeof value === 'function' ? value(mocks.states[index]) : value }]
} }))
import { ClanConditions } from '@/components/character-summary/clan-conditions'

type Element = ReactElement<Record<string, unknown>>
function elements(node: ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements)
  if (!node || typeof node !== 'object' || !('props' in node)) return []
  const element = node as Element
  return [element, ...elements(element.props.children as ReactNode)]
}
const tree = (canManage = true) => { mocks.cursor = 0; mocks.refCursor = 0; return elements(ClanConditions({ characterId: 'fixture', active: [], options: ['BRIGHT_LIGHT'], revision: 3, canManage })) }
const toggle = () => (tree().find(node => node.type === 'input')!.props.onChange as () => void)()
beforeEach(() => { vi.clearAllMocks(); mocks.cursor = 0; mocks.refCursor = 0; mocks.states = []; mocks.refs = [] })

it('jogador só consulta; Narrador envia intenção com revisão e idempotência, bloqueando cliques concorrentes', async () => {
  expect(tree(false).some(node => node.type === 'input')).toBe(false)
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true }))
  vi.stubGlobal('fetch', fetchMock)
  try {
    toggle(); toggle()
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0][1].method).toBe('PATCH')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ active: ['BRIGHT_LIGHT'], expectedRevision: 3, key: expect.any(String) })
    await vi.waitFor(() => expect(mocks.mutate).toHaveBeenCalledTimes(2))
    expect(mocks.mutate).toHaveBeenCalledWith('/api/characters/fixture/rolls')
  } finally { vi.unstubAllGlobals() }
})

it('reenvia o mesmo comando após falha de conexão', async () => {
  const fetchMock = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(Response.json({ ok: true }))
  vi.stubGlobal('fetch', fetchMock)
  try {
    toggle()
    await vi.waitFor(() => expect(tree().some(node => node.type === 'button')).toBe(true))
    ;(tree().find(node => node.type === 'button')!.props.onClick as () => void)()
    await vi.waitFor(() => expect(mocks.mutate).toHaveBeenCalledTimes(2))
    expect(fetchMock.mock.calls[0][1].body).toBe(fetchMock.mock.calls[1][1].body)
  } finally { vi.unstubAllGlobals() }
})

it('conflito de revisão recarrega a ficha e permite nova tentativa consciente', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: 'Revisão obsoleta.' }, { status: 409 })))
  try {
    toggle()
    await vi.waitFor(() => expect(mocks.mutate).toHaveBeenCalledWith('/api/characters/fixture/clan'))
    await vi.waitFor(() => expect(tree().some(node => node.type === 'button')).toBe(false))
    expect(tree().find(node => node.type === 'fieldset')!.props.disabled).toBe(false)
  } finally { vi.unstubAllGlobals() }
})
