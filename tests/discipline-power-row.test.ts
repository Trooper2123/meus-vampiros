import { beforeEach, expect, it, vi } from 'vitest'
import { createElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
const mocks = vi.hoisted(() => ({ open: false, level: '', showModal: vi.fn(), close: vi.fn(), swr: vi.fn(), mutate: vi.fn() }))
vi.mock('react', async original => ({ ...await original<typeof import('react')>(), useRef: () => ({ current: { showModal: mocks.showModal, close: mocks.close } }), useState: (initial: unknown) => initial === false ? [mocks.open, (value: boolean) => { mocks.open = value }] : [mocks.level, (value: string) => { mocks.level = value }] }))
vi.mock('swr', () => ({ default: mocks.swr }))
import { DisciplinePowerRow } from '@/components/character-form/discipline-power-row'
import { createEmptyPower } from '@/components/character-form/discipline-fields'
import { disciplinePowerOptions } from '@/lib/vtm-v5/discipline-powers'

function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) return node.flatMap(elements)
  if (!node || typeof node !== 'object' || !('props' in node)) return []
  const element = node as ReactElement<Record<string, unknown>>
  return [element, ...elements(element.props.children as ReactNode)]
}
const options = disciplinePowerOptions('CELERITY', 2)
const value = { ...createEmptyPower(), name: 'Poder atual' }
const props = () => ({ disciplineName: 'Rapidez', maxLevel: 2, disciplineIndex: 0, powerIndex: 1, value, onSelect: vi.fn() })
beforeEach(() => { vi.clearAllMocks(); mocks.open = false; mocks.level = ''; mocks.swr.mockReturnValue({ data: { powers: options }, mutate: mocks.mutate }) })

it('os dez campos abrem a mesma modal e preservam names e valores até selecionar', () => {
  const input = props()
  const nodes = elements(DisciplinePowerRow(input))
  const triggers = nodes.filter(node => node.props['aria-haspopup'] === 'dialog')
  expect(triggers).toHaveLength(10)
  expect(mocks.swr.mock.calls[0][0]).toBeNull()
  for (const button of triggers) {
    expect(button.props['aria-controls']).toBe('disciplina-0-poder-1-dialog')
    expect(button.props['aria-label']).toContain('Rapidez, até nível 2')
    ;(button.props.onClick as () => void)()
  }
  expect(mocks.showModal).toHaveBeenCalledTimes(10)
  expect(input.onSelect).not.toHaveBeenCalled()
  DisciplinePowerRow(input)
  expect(mocks.swr.mock.calls.at(-1)![0]).toBe('/api/discipline-powers?disciplineId=CELERITY&maxLevel=2')
  expect(nodes.filter(node => node.type === 'input' && node.props.type === 'hidden')).toHaveLength(10)
  expect(nodes.find(node => node.props.name === 'disciplina-0-poder-1-name')?.props.value).toBe('Poder atual')
})

it('filtra níveis inferiores e seleção preenche os dez campos sem alterar o objeto anterior', () => {
  const input = props()
  const nodes = elements(DisciplinePowerRow(input))
  const selector = nodes.find(node => node.type === 'select' && !node.props.disabled)!
  ;(selector.props.onChange as (event: { target: { value: string } }) => void)({ target: { value: '1' } })
  const filtered = elements(DisciplinePowerRow(input))
  const buttons = filtered.filter(node => node.type === 'button' && Array.isArray(node.props.children) && node.props.children[0] === 'Selecionar ')
  expect(buttons).toHaveLength(options.filter(entry => entry.level === 1).length)
  ;(buttons[0].props.onClick as () => void)()
  expect(input.onSelect).toHaveBeenCalledWith(options.find(entry => entry.level === 1)!.power)
  expect(Object.keys(input.onSelect.mock.calls[0][0])).toHaveLength(10)
  expect(mocks.close).toHaveBeenCalledOnce()
  expect(value.name).toBe('Poder atual')
})

it('cancelar e Escape preservam o poder e fecham a consulta', () => {
  const input = props()
  mocks.open = true
  const nodes = elements(DisciplinePowerRow(input))
  const cancel = nodes.find(node => node.type === 'button' && node.props.children === 'Cancelar')!
  ;(cancel.props.onClick as () => void)()
  ;(nodes.find(node => node.type === 'dialog')!.props.onClose as () => void)()
  expect(mocks.open).toBe(false)
  expect(input.onSelect).not.toHaveBeenCalled()
  expect(mocks.close).toHaveBeenCalledOnce()
})

it('mostra estados de carregamento, erro/reenvio e catálogo vazio', () => {
  mocks.swr.mockReturnValue({ isLoading: true })
  expect(renderToStaticMarkup(createElement(DisciplinePowerRow, props()))).toContain('Carregando poderes')
  mocks.swr.mockReturnValue({ error: new Error('falha'), mutate: mocks.mutate })
  const errorNodes = elements(DisciplinePowerRow(props()))
  ;(errorNodes.find(node => node.type === 'button' && node.props.children === 'Tentar novamente')!.props.onClick as () => void)()
  expect(mocks.mutate).toHaveBeenCalledOnce()
  mocks.swr.mockReturnValue({ data: { powers: [] } })
  expect(renderToStaticMarkup(createElement(DisciplinePowerRow, props()))).toContain('Nenhum poder publicado')
})

it('renderiza textos do catálogo como texto e não HTML executável', () => {
  mocks.swr.mockReturnValue({ data: { powers: [{ ...options[0], power: { ...options[0].power, effect: '<script>alert(1)</script>' } }] } })
  const html = renderToStaticMarkup(createElement(DisciplinePowerRow, props()))
  expect(html).toContain('&lt;script&gt;')
  expect(html).not.toContain('<script>')
})
