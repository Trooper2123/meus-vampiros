import { createElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[], effects: [] as (() => void)[], showModal: vi.fn(), close: vi.fn(), swr: vi.fn(), mutate: vi.fn() }))
vi.mock('react', async original => ({ ...await original<typeof import('react')>(), useEffect: (effect: () => void) => { mocks.effects.push(effect) }, useRef: () => ({ current: { showModal: mocks.showModal, close: mocks.close } }), useState: (initial: unknown) => {
  const index = mocks.cursor++
  if (!(index in mocks.values)) mocks.values[index] = initial
  return [mocks.values[index], (value: unknown) => { mocks.values[index] = typeof value === 'function' ? value(mocks.values[index]) : value }]
} }))
vi.mock('swr', () => ({ default: mocks.swr }))
import { TraitSelectorRow, type TraitItem } from '@/components/character-form/trait-selector-row'
import { TraitsEditor } from '@/components/character-form/traits-editor'
import { traitOptions } from '@/lib/vtm-v5/trait-options'
import type { CreationGrant } from '@/lib/vtm-v5/creation-grants'

type Element = ReactElement<Record<string, unknown>>
function elements(node: ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements)
  if (!node || typeof node !== 'object' || !('props' in node)) return []
  const element = node as Element
  return [element, ...elements(element.props.children as ReactNode)]
}
const value: TraitItem = { id: 'row-id', name: 'Registro atual', level: 2, description: 'Descrição atual' }
const props = () => ({ kind: 'MERIT' as const, index: 0, value, onChange: vi.fn(), grants: [] as CreationGrant[] })
const tree = (input: ReturnType<typeof props>) => { mocks.cursor = 0; return elements(TraitSelectorRow(input)) }
const click = (node: Element) => (node.props.onClick as () => void)()
const change = (node: Element, value: string) => (node.props.onChange as (event: { target: { value: string } }) => void)({ target: { value } })
const search = (input: ReturnType<typeof props>, query: string) => change(tree(input).find(node => node.type === 'input' && node.props.type === 'search')!, query)
const customButton = (input: ReturnType<typeof props>) => tree(input).find(node => node.type === 'button' && node.props.children === 'Usar registro personalizado')!

beforeEach(() => { vi.clearAllMocks(); mocks.cursor = 0; mocks.values = []; mocks.effects = []; mocks.swr.mockReturnValue({ data: { options: traitOptions('MERIT') }, mutate: mocks.mutate }) })

it('abre a modal e carrega o catálogo ao montar uma linha adicionada', () => {
  TraitSelectorRow({ ...props(), autoOpen: true })
  mocks.effects.forEach(effect => effect())
  expect(mocks.showModal).toHaveBeenCalledOnce()
  expect(mocks.swr.mock.calls.at(-1)![0]).toBe('/api/merits-flaws?kind=MERIT')
})

it('descarta pontuação inválida ao fechar para não bloquear o formulário da ficha', () => {
  const input = props()
  change(tree(input).find(node => node.type === 'input' && node.props.type === 'number')!, '6')
  ;(tree(input).find(node => node.type === 'dialog')!.props.onClose as () => void)()
  expect(tree(input).find(node => node.type === 'input' && node.props.type === 'number')!.props.value).toBe(value.level)
  expect(input.onChange).not.toHaveBeenCalled()
})

it('nome e descrição abrem a modal sob demanda e mantêm os campos do formulário', () => {
  const input = props()
  const nodes = tree(input)
  expect(mocks.swr.mock.calls[0][0]).toBeNull()
  const triggers = nodes.filter(node => node.props['aria-haspopup'] === 'dialog')
  expect(triggers).toHaveLength(2)
  click(triggers[0]); tree(input)
  expect(mocks.showModal).toHaveBeenCalledOnce()
  expect(mocks.swr.mock.calls.at(-1)![0]).toBe('/api/merits-flaws?kind=MERIT')
  expect(nodes.filter(node => node.type === 'input').map(node => node.props.name)).toContain('vantagem-0-nome')
  expect(nodes.filter(node => node.type === 'input').map(node => node.props.name)).toContain('vantagem-0-descricao')
  expect(input.onChange).not.toHaveBeenCalled()
})

it('pesquisa PT/EN e preenche os três campos sem substituir o ID da linha', () => {
  const input = props()
  search(input, 'LINGUISTICA')
  const cards = tree(input).filter(node => node.type === 'article')
  expect(cards.length).toBeGreaterThan(0)
  search(input, 'Linguistics')
  expect(tree(input).some(node => node.type === 'article')).toBe(true)
  const select = tree(input).find(node => node.type === 'button' && node.props.children instanceof Array && node.props.children[0] === 'Selecionar ')!
  click(select)
  expect(input.onChange).toHaveBeenCalledWith(expect.objectContaining({ id: 'row-id', name: 'Linguística', level: 1, description: expect.stringContaining('Corebook') }))
  expect(mocks.close).toHaveBeenCalledOnce()
})

it('cria registro personalizado só ao confirmar', () => {
  const input = props()
  change(tree(input).find(node => node.type === 'input' && node.props.maxLength === 120)!, 'Vantagem própria')
  change(tree(input).find(node => node.type === 'input' && node.props.type === 'number')!, '4')
  change(tree(input).find(node => node.type === 'textarea')!, 'Efeito combinado com a mesa')
  expect(input.onChange).not.toHaveBeenCalled()
  click(customButton(input))
  expect(input.onChange).toHaveBeenCalledWith({ ...value, name: 'Vantagem própria', level: 4, description: 'Efeito combinado com a mesa' })
})

it('cancelar ou fechar por Escape não altera os valores e reabrir restaura o rascunho', () => {
  const input = props()
  change(tree(input).find(node => node.type === 'input' && node.props.maxLength === 120)!, 'Rascunho descartado')
  click(tree(input).find(node => node.type === 'button' && node.props.children === 'Cancelar')!)
  ;(tree(input).find(node => node.type === 'dialog')!.props.onClose as () => void)()
  expect(input.onChange).not.toHaveBeenCalled()
  click(tree(input).find(node => node.props['aria-haspopup'] === 'dialog')!)
  expect(tree(input).find(node => node.type === 'input' && node.props.maxLength === 120)!.props.value).toBe(value.name)
})

it.each(['-1', '6', '1.5', ''])('rejeita pontuação personalizada inválida: %s', level => {
  const input = props()
  change(tree(input).find(node => node.type === 'input' && node.props.type === 'number')!, level)
  click(customButton(input))
  expect(input.onChange).not.toHaveBeenCalled()
  expect(tree(input).some(node => node.props.role === 'alert')).toBe(true)
})

it('exige nome e escapa texto personalizado na linha', () => {
  const input = props()
  change(tree(input).find(node => node.type === 'input' && node.props.maxLength === 120)!, '   ')
  click(customButton(input))
  expect(input.onChange).not.toHaveBeenCalled()
  mocks.cursor = 0
  const html = renderToStaticMarkup(createElement(TraitSelectorRow, { ...input, value: { ...value, name: '<script>alert(1)</script>' } }))
  expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  expect(html).not.toContain('<script>')
})

it('preserva nomes/pontos concedidos e não confirma opções somente para referência', () => {
  const input = props()
  input.grants = [{ id: value.id!, kind: 'MERIT', origin: 'PREDATOR', name: value.name, dots: 2 }]
  expect(tree(input).find(node => node.type === 'input' && node.props.maxLength === 120)!.props.readOnly).toBe(true)
  change(tree(input).find(node => node.type === 'input' && node.props.type === 'number')!, '1')
  click(customButton(input))
  expect(input.onChange).not.toHaveBeenCalled()
  input.grants = []
  search(input, 'Loresheet')
  const select = tree(input).find(node => node.type === 'button' && node.props.children instanceof Array && node.props.children[0] === 'Selecionar ')!
  expect(select.props.disabled).toBe(true)
  click(select)
  expect(input.onChange).not.toHaveBeenCalled()
})

it('permite criação personalizada mesmo com erro ou resultado vazio do catálogo', () => {
  const input = props()
  mocks.swr.mockReturnValue({ error: new Error('offline'), mutate: mocks.mutate })
  click(customButton(input))
  expect(input.onChange).toHaveBeenCalledWith(value)
  mocks.swr.mockReturnValue({ data: { options: [] }, mutate: mocks.mutate })
  mocks.cursor = 0
  expect(renderToStaticMarkup(createElement(TraitSelectorRow, input))).toContain('Nenhuma opção encontrada')
})

it('adiciona linhas além das iniciais sem perder as existentes', () => {
  const setMerits = vi.fn(); const setFlaws = vi.fn()
  const nodes = elements(TraitsEditor({ merits: [value], flaws: [], setMerits, setFlaws }))
  const add = nodes.find(node => node.type === 'button' && node.props.children instanceof Array && node.props.children[1] === 'vantagem')!
  click(add)
  const updated = setMerits.mock.calls[0][0]([value])
  expect(updated[0]).toBe(value)
  expect(updated[1]).toMatchObject({ id: expect.any(String), name: '', level: 0, description: '' })
  mocks.cursor = 0
  const updatedNodes = elements(TraitsEditor({ merits: updated, flaws: [], setMerits, setFlaws }))
  expect(updatedNodes.filter(node => node.type === TraitSelectorRow).map(node => node.props.autoOpen)).toEqual([false, true])
})
