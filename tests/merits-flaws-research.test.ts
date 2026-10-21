import { createElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, expect, it, vi } from 'vitest'
import catalog from '@/lib/vtm-v5/merits-flaws-catalog.json'

const state = vi.hoisted(() => ({ filters: { query: '', type: '', group: '', dots: '', eligibility: '', book: '' }, page: 0 }))
vi.mock('react', async original => ({ ...await original<typeof import('react')>(), useMemo: (factory: () => unknown) => factory(), useState: (initial: unknown) => typeof initial === 'number'
  ? [state.page, (value: number) => { state.page = value }]
  : [state.filters, (value: typeof state.filters | ((current: typeof state.filters) => typeof state.filters)) => { state.filters = typeof value === 'function' ? value(state.filters) : value }] }))

import { MeritsFlawsResearch } from '@/components/merits-flaws-research'

const props = { entries: catalog.entries, rules: catalog.general_rules }
function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) return node.flatMap(elements)
  if (!node || typeof node !== 'object' || !('props' in node)) return []
  const element = node as ReactElement<Record<string, unknown>>
  return [element, ...elements(element.props.children as ReactNode)]
}
const tree = () => elements(MeritsFlawsResearch(props))
const html = () => renderToStaticMarkup(createElement(MeritsFlawsResearch, props))
const change = (element: ReactElement<Record<string, unknown>>, value: string) => (element.props.onChange as (event: { target: { value: string } }) => void)({ target: { value } })

beforeEach(() => { state.filters = { query: '', type: '', group: '', dots: '', eligibility: '', book: '' }; state.page = 0 })

it('preserva os 209 registros e distingue gradações e escolhas especiais', () => {
  expect(catalog.entries).toHaveLength(209)
  expect(new Set(catalog.entries.map(entry => entry.id)).size).toBe(209)
  expect(Object.fromEntries(['Qualidade', 'Defeito', 'Antecedente', 'Traço de Domínio'].map(type => [type, catalog.entries.filter(entry => entry.type.pt === type).length]))).toEqual({ Qualidade: 67, Defeito: 75, Antecedente: 52, 'Traço de Domínio': 15 })
  expect(catalog.entries.every(entry => entry.source.title && entry.source.printed_pages && entry.source.pdf_pages.length)).toBe(true)
  expect(catalog.entries.find(entry => entry.id === '20_linguistics_1')).toMatchObject({ dots: 1, xp_from_zero: 3, name: { en: 'Linguistics', pt: 'Linguística' } })
  expect(catalog.entries.some(entry => entry.dots === null)).toBe(true)
})

it('pagina sem perder filtros e volta à primeira página ao pesquisar', () => {
  expect(tree().filter(element => element.type === 'article')).toHaveLength(30)
  expect(html()).toContain('Página 1 de 7')
  const next = tree().find(element => element.type === 'button' && element.props.children === 'Próxima')!
  ;(next.props.onClick as () => void)()
  expect(html()).toContain('Página 2 de 7')
  change(tree().find(element => element.type === 'input')!, 'LINGUISTICA')
  expect(state.page).toBe(0)
  const portugueseMatches = tree().filter(element => element.type === 'article').map(element => element.key)
  expect(portugueseMatches).toContain('20_linguistics_1')
  change(tree().find(element => element.type === 'input')!, 'Linguística')
  expect(tree().filter(element => element.type === 'article').map(element => element.key)).toEqual(portugueseMatches)
  change(tree().find(element => element.type === 'input')!, 'Linguistics')
  expect(tree().filter(element => element.type === 'article').map(element => element.key)).toContain('20_linguistics_1')
})

it('combina todos os filtros e limpa resultados vazios', () => {
  for (const [index, value] of ['Qualidade', 'Linguística', '2', 'Geral', 'Vampire: The Masquerade — Corebook'].entries()) {
    change(tree().filter(element => element.type === 'select')[index], value)
  }
  expect(tree().filter(element => element.type === 'article')).toHaveLength(1)
  expect(html()).toContain('1 de 209 registros')
  change(tree().find(element => element.type === 'input')!, 'sem-correspondencia-xyz')
  expect(html()).toContain('Nenhum registro corresponde aos filtros.')
  const clear = tree().find(element => element.type === 'button' && element.props.children === 'Limpar filtros')!
  ;(clear.props.onClick as () => void)()
  expect(html()).toContain('209 de 209 registros')
})

it('indica referências não selecionáveis, XP a partir de zero e escapa conteúdo', () => {
  state.filters.query = 'Loresheet'
  expect(html()).toContain('Somente referência')
  expect(html()).toContain('XP da graduação a partir de zero')
  const entry = catalog.entries[0]
  state.filters.query = ''
  const escaped = renderToStaticMarkup(createElement(MeritsFlawsResearch, { ...props, entries: [{ ...entry, effect: { ...entry.effect, pt: '<script>alert(1)</script>' } }] }))
  expect(escaped).not.toContain('<script>')
  expect(escaped).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
})

it('pesquisa escolhas especiais sem inventar custo em pontos ou XP', () => {
  change(tree().filter(element => element.type === 'select')[2], 'null')
  expect(tree().filter(element => element.type === 'article')).toHaveLength(catalog.entries.filter(entry => entry.dots === null).length)
  expect(html()).toContain('Não se aplica')
})
