import { expect, it, vi } from 'vitest'
import type { ReactElement, ReactNode } from 'react'
const mocks = vi.hoisted(() => ({ states: ['BRUJAH', 'Rapidez', 'Potência', '', '', 'MENTAL', false, ''] as unknown[], mutate: vi.fn() }))
vi.mock('react', async original => ({ ...await original<typeof import('react')>(), useState: () => [mocks.states.shift(), vi.fn()] }))
vi.mock('swr', () => ({ default: () => ({ mutate: mocks.mutate }) }))
import { CharacterClan } from '@/components/character-summary/character-clan'
function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) return node.flatMap(elements)
  if (!node || typeof node !== 'object' || !('props' in node)) return []
  const element = node as ReactElement<Record<string, unknown>>
  return [element, ...elements(element.props.children as ReactNode)]
}
it('confirmar clã salva antes de aplicar e aguarda atualização dos dados dependentes', async () => {
  const save = vi.fn().mockResolvedValue('id')
  const change = vi.fn()
  const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ revision: 4 }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
  vi.stubGlobal('fetch', fetchMock)
  try {
    const tree = CharacterClan({ characterId: null, onBeforeSubmit: save, onChange: change })
    const button = elements(tree).find(node => node.type === 'button' && node.props.children === 'Confirmar clã')!
    await (button.props.onClick as () => Promise<void>)()
    expect(save).toHaveBeenCalledOnce()
    await vi.waitFor(() => expect(change).toHaveBeenCalledWith('id'))
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({ expectedRevision: 4, selection: { code: 'BRUJAH', disciplineDots: { Rapidez: 2, Potência: 1 } } })
    expect(mocks.mutate).toHaveBeenCalledOnce()
    expect(change).toHaveBeenCalledWith('id')
    expect(save.mock.invocationCallOrder[0]).toBeLessThan(fetchMock.mock.invocationCallOrder[0])
    expect(mocks.mutate.mock.invocationCallOrder[0]).toBeLessThan(change.mock.invocationCallOrder[0])
  } finally { vi.unstubAllGlobals() }
})
