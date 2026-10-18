import { createElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { RollHistory } from '@/components/character-summary/roll-history'

const mocks = vi.hoisted(() => ({ mutate: vi.fn() }))
vi.mock('swr', () => ({ default: () => ({ data: { revision: 3, canAdjudicate: false, history: [{ id: 'roll', mode: 'TEST', reason: 'Teste', visibility: 'PUBLIC', hiddenDifficulty: false, canReroll: true, result: { normalDice: [10], hungerDice: [1], successes: 1, difficulty: 2, margin: -1, outcome: 'BESTIAL_FAILURE', totalFailure: false }, dice: [{ id: 'N:0', type: 'NORMAL', value: 10 }, { id: 'H:0', type: 'HUNGER', value: 1 }], revisions: [{ number: 0, result: { normalDice: [10], hungerDice: [1], successes: 1 } }], adjudications: [{ id: 'text', kind: 'COMPLICATION', note: '<script>unsafe()</script>' }], sources: [{ id: 'CORE-DICE', book: 'Vampire: The Masquerade', edition: '5ª edição', printed: '120–123', pdf: 122, href: '/api/rule-sources/CORE-DICE#page=122' }] }] }, mutate: mocks.mutate }) }))
vi.mock('react', async original => ({ ...await original<typeof import('react')>(), useState: (value: unknown) => [value && typeof value === 'object' && 'rollId' in value ? { rollId: 'roll', ids: ['N:0'] } : value, vi.fn()], useRef: (value: unknown) => ({ current: value }) }))

function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) return node.flatMap(elements)
  if (!node || typeof node !== 'object' || !('props' in node)) return []
  const element = node as ReactElement<Record<string, unknown>>
  return [element, ...elements(element.props.children as ReactNode)]
}

it('mostra IDs, originais, referências e notas escapadas; não oferece dados de Fome', () => {
  const html = renderToStaticMarkup(createElement(RollHistory, { characterId: 'character' }))
  expect(html).toContain('Dados originais e revisões')
  expect(html).toContain('PDF 122')
  expect(html).toContain('noopener noreferrer')
  expect(html).not.toContain('<script>')
  expect(html).toContain('&lt;script&gt;')
  expect(elements(RollHistory({ characterId: 'character' })).find(node => String(node.props['aria-label']).startsWith('Dado de Fome'))?.props.disabled).toBe(true)
})

it('envia seleção de dados, revisão e idempotência; bloqueia clique concorrente', async () => {
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true }))
  vi.stubGlobal('fetch', fetchMock)
  try {
    const button = elements(RollHistory({ characterId: 'character' })).find(node => node.type === 'button' && node.props.children === 'Gastar Vontade e rerrolar')!
    const click = button.props.onClick as () => void
    click(); click()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/characters/character/rolls/roll/reroll')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ dieIds: ['N:0'], expectedRevision: 3, idempotencyKey: expect.any(String) })
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
  } finally { vi.unstubAllGlobals() }
})
