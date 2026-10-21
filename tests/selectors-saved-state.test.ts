import type { ReactElement, ReactNode } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ data: undefined as unknown, cursor: 0, states: [] as unknown[], mutate: vi.fn() }))
vi.mock('swr', () => ({ default: () => ({ data: mocks.data, mutate: mocks.mutate, isLoading: !mocks.data }) }))
vi.mock('react', async original => ({ ...await original<typeof import('react')>(), useMemo: (factory: () => unknown) => factory(), useId: () => 'selector', useRef: (initial: unknown) => ({ current: initial }), useState: (initial: unknown) => {
  const index = mocks.cursor++
  if (!(index in mocks.states)) mocks.states[index] = initial
  return [mocks.states[index], (value: unknown) => { mocks.states[index] = typeof value === 'function' ? value(mocks.states[index]) : value }]
} }))
import { CharacterClan } from '@/components/character-summary/character-clan'
import { PlayerPredatorSelector } from '@/components/predator-types/player-predator-selector'
import { CLANS } from '@/lib/vtm-v5/clans'
import { PREDATOR_TYPES, toPlayerPredatorTypeDto } from '@/lib/vtm-v5/predator-types'

type Element = ReactElement<Record<string, unknown>>
function elements(node: ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements)
  if (!node || typeof node !== 'object' || !('props' in node)) return []
  const element = node as Element
  return [element, ...elements(element.props.children as ReactNode)]
}
const clanTree = () => { mocks.cursor = 0; return elements(CharacterClan({ characterId: 'fixture', onBeforeSubmit: async () => 'fixture', onChange: () => {} })) }
const predatorTree = () => { mocks.cursor = 0; return elements(PlayerPredatorSelector({ characterId: 'fixture' })) }
const click = (node: Element) => (node.props.onClick as () => void)()
const choose = (node: Element, value: string) => (node.props.onChange as (event: { target: { value: string } }) => void)({ target: { value } })
const entryButton = (nodes: Element[], name: string) => nodes.find(node => node.type === 'button' && elements(node.props.children as ReactNode).some(child => child.type === 'strong' && child.props.children === name))!
beforeEach(() => { vi.clearAllMocks(); mocks.cursor = 0; mocks.states = []; mocks.data = undefined })

it('carrega clã, pontos e preferência após a resposta assíncrona, sem depender de perfil mestre', () => {
  expect(clanTree().some(node => node.type === 'output')).toBe(true)
  mocks.data = { revision: 2, clans: CLANS, independent: false, selection: { code: 'VENTRUE', disciplineDots: { DOMINATE: 2, FORTITUDE: 1 }, feedingPreference: 'Adultos voluntários' } }
  const loaded = clanTree()
  expect(entryButton(loaded, 'Ventrue').props['aria-pressed']).toBe(true)
  expect(loaded.filter(node => node.type === 'select').map(node => node.props.value)).toEqual(['Dominação', 'Fortitude'])
  expect(loaded.some(node => node.type === 'input' && node.props.value === 'Adultos voluntários')).toBe(true)
  choose(loaded.find(node => node.type === 'input' && node.props.value === 'Adultos voluntários')!, 'Preferência em edição')
  expect(clanTree().some(node => node.type === 'input' && node.props.value === 'Preferência em edição')).toBe(true)
  click(entryButton(clanTree(), 'Hecata'))
  expect(entryButton(clanTree(), 'Hecata').props['aria-pressed']).toBe(true)
  expect(clanTree().filter(node => node.type === 'select').map(node => node.props.value)).toEqual(['', ''])
})

it('restaura categoria Malkavian e terceira disciplina Caitiff', () => {
  mocks.data = { revision: 0, clans: CLANS, selection: { code: 'MALKAVIAN', disciplineDots: { AUSPEX: 2, OBFUSCATE: 1 }, afflictionCategory: 'PHYSICAL' } }
  expect(clanTree().some(node => node.type === 'select' && node.props.value === 'PHYSICAL')).toBe(true)
  mocks.data = { revision: 0, clans: CLANS, selection: { code: 'CAITIFF', disciplineDots: { AUSPEX: 2, OBFUSCATE: 1 }, caitiffDisciplines: ['AUSPEX', 'OBFUSCATE', 'DOMINATE'] } }
  expect(clanTree().filter(node => node.type === 'select').map(node => node.props.value)).toEqual(['Auspícios', 'Ofuscação', 'Dominação'])
})

it('restaura predação, especialidade, disciplina e escolhas salvas após o carregamento', () => {
  predatorTree()
  const definition = PREDATOR_TYPES.find(entry => entry.code === 'OSIRIS')!
  mocks.data = { predatorTypes: PREDATOR_TYPES.map(entry => toPlayerPredatorTypeDto(entry)), selectedCode: 'OSIRIS', selection: { code: 'OSIRIS', specialty: definition.specialtyOptions[0], discipline: definition.disciplineOptions[0], optionCodes: ['FOLLOWERS:FAME:2', 'COSTS:ENEMIES:2', 'FORGED', 'BAD:OPTION:99'] } }
  const loaded = predatorTree()
  expect(entryButton(loaded, definition.name).props['aria-pressed']).toBe(true)
  expect(loaded.some(node => node.type === 'button' && node.props.children === 'Alterar escolha')).toBe(true)
  const values = loaded.filter(node => node.type === 'select').map(node => node.props.value)
  expect(values).toContain(definition.specialtyOptions[0])
  expect(values).toContain(definition.disciplineOptions[0])
  expect(values).toContain(2)
  expect(values.every(value => value !== 99 && !Number.isNaN(value))).toBe(true)
  const next = PREDATOR_TYPES.find(entry => entry.code === 'SIREN')!
  vi.stubGlobal('requestAnimationFrame', vi.fn())
  try {
    click(entryButton(loaded, next.name))
    expect(entryButton(predatorTree(), next.name).props['aria-pressed']).toBe(true)
    expect(predatorTree().filter(node => node.type === 'select').map(node => node.props.value)).toContain('')
  } finally { vi.unstubAllGlobals() }
})

it('remoção explícita não ressuscita seleção antiga durante revalidação', async () => {
  mocks.data = { predatorTypes: PREDATOR_TYPES.map(entry => toPlayerPredatorTypeDto(entry)), selectedCode: 'SIREN' }
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ ok: true })))
  try {
    click(predatorTree().find(node => node.type === 'button' && node.props.children === 'Remover tipo de predação')!)
    await vi.waitFor(() => expect(mocks.mutate).toHaveBeenCalledOnce())
    expect(predatorTree().some(node => node.type === 'button' && node.props['aria-pressed'] === true)).toBe(false)
  } finally { vi.unstubAllGlobals() }
})
