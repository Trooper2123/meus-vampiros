import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { createElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { CharacterDisciplineProgression } from '@/components/character-summary/character-discipline-progression'
import { DisciplinesStep } from '@/components/character-form/disciplines-step'

const harness = vi.hoisted(() => ({ data: {} as Record<string, unknown>, states: [] as unknown[], refs: [] as { current: unknown }[], stateIndex: 0, refIndex: 0, mutate: vi.fn() }))
vi.mock('swr', () => ({ default: () => ({ data: harness.data, mutate: harness.mutate }) }))
vi.mock('react', async original => ({ ...await original<typeof import('react')>(),
  useState: (value: unknown) => { const index = harness.stateIndex++; if (!(index in harness.states)) harness.states[index] = value; return [harness.states[index], (next: unknown) => { harness.states[index] = next }] },
  useRef: (value: unknown) => harness.refs[harness.refIndex++] ??= { current: value },
}))
function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) return node.flatMap(elements)
  if (!node || typeof node !== 'object' || !('props' in node)) return []
  const element = node as ReactElement<Record<string, unknown>>
  return [element, ...elements(element.props.children as ReactNode)]
}
function render() { harness.stateIndex = 0; harness.refIndex = 0; return CharacterDisciplineProgression({ characterId: 'character' }) }
function button(label: string) { return elements(render()).find(node => node.type === 'button' && node.props.children === label)! }
beforeEach(() => {
  harness.states = []; harness.refs = []; harness.stateIndex = 0; harness.refIndex = 0
  harness.data = { revision: 4, availableXp: 20, canAuthorize: false, disciplines: [{ id: 'DOMINATE', name: 'Dominação', level: 1, inClan: false, xpCost: 14, eligible: true, blockers: [] }], acquisitions: [], grants: [], contents: [] }
  harness.mutate.mockReset()
  harness.mutate.mockImplementation(async updated => { if (updated) harness.data = updated })
})
afterEach(() => vi.unstubAllGlobals())
it('jogador vê custo e classificação, sem controles exclusivos do Narrador', () => {
  const html = renderToStaticMarkup(render())
  expect(html).toContain('Disciplina fora do clã')
  expect(html).toContain('14 XP')
  expect(html).not.toContain('Autorizar requisito')
  expect(html).not.toContain('Revogar autorização')
  harness.data.canAuthorize = true
  expect(renderToStaticMarkup(render())).toContain('Autorização específica do Narrador')
})
it('compra usa revisão/nível do servidor e retry preserva o comando sem enviar saldo ou autoridade', async () => {
  harness.states = ['', 'Aprendizado revisado', 'LEARNING_APPROVAL', 1, false, '', null]
  const fetchMock = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(Response.json({ ...harness.data, ok: true, revision: 5 }))
  vi.stubGlobal('fetch', fetchMock)
  ;(button('Comprar próximo nível').props.onClick as () => void)()
  await vi.waitFor(() => expect(button('Reenviar mesma operação')).toBeDefined())
  const original = fetchMock.mock.calls[0][1].body
  expect(JSON.parse(original)).toMatchObject({ kind: 'PURCHASE', disciplineId: 'DOMINATE', targetLevel: 2, expectedRevision: 4 })
  expect(JSON.parse(original)).not.toHaveProperty('xpCost')
  expect(JSON.parse(original)).not.toHaveProperty('canAuthorize')
  ;(button('Reenviar mesma operação').props.onClick as () => void)()
  await vi.waitFor(() => expect(harness.mutate).toHaveBeenCalledTimes(1))
  expect(fetchMock.mock.calls[1][1].body).toBe(original)
})
it('editor só oferece opções recebidas do clã e permite corrigir escolha manual', () => {
  const html = renderToStaticMarkup(createElement(DisciplinesStep, { disciplines: [{ id: 'manual', name: 'Dominação', level: 1, powers: [] }, { id: 'blank', name: '', level: 0, powers: [] }], setDisciplines: vi.fn(), confirmingDiscipline: null, setConfirmingDiscipline: vi.fn(), availableDisciplines: ['Auspícios', 'Rapidez', 'Presença'], handleDisciplineLevelChange: vi.fn(), addDiscipline: vi.fn(), creationGrants: [] }))
  expect(html).toContain('Corrigir escolha de Dominação')
  expect(html).toContain('value="Auspícios"')
  expect(html).not.toContain('<option value="Dominação"')
})

