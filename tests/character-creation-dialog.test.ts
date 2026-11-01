import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ReactElement, ReactNode } from 'react'

const harness = vi.hoisted(() => ({ states: [] as unknown[], index: 0, effects: [] as (() => void)[], push: vi.fn(), show: vi.fn(), close: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: harness.push }) }))
vi.mock('react', async original => ({
  ...await original<typeof import('react')>(),
  useId: () => 'creation-mode',
  useRef: () => ({ current: { showModal: harness.show, close: harness.close } }),
  useEffect: (effect: () => void) => { harness.effects.push(effect) },
  useState: (initial: unknown) => {
    const index = harness.index++
    if (!(index in harness.states)) harness.states[index] = initial
    return [harness.states[index], (value: unknown) => { harness.states[index] = value }]
  },
}))
import { CharacterEntryModeDialog, CreateCharacterButton } from '@/components/character-creation-dialog'

type Element = ReactElement<Record<string, unknown>>
function elements(node: ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements)
  if (!node || typeof node !== 'object' || !('props' in node)) return []
  const element = node as Element
  return [element, ...elements(element.props.children as ReactNode)]
}
const choose = vi.fn(), cancel = vi.fn()
function dialog() { harness.index = 0; return elements(CharacterEntryModeDialog({ onChoose: choose, onCancel: cancel })) }
beforeEach(() => { harness.states = []; harness.effects = []; vi.clearAllMocks(); vi.stubGlobal('fetch', vi.fn()) })
afterEach(() => vi.unstubAllGlobals())

it('botão abre modal e navega somente após confirmar a escolha', () => {
  harness.index = 0
  let tree = elements(CreateCharacterButton({ children: 'Criar personagem' }))
  const trigger = tree.find(element => element.type === 'button')!
  expect(trigger.props['aria-haspopup']).toBe('dialog')
  expect(tree.some(element => element.type === CharacterEntryModeDialog)).toBe(false)
  ;(trigger.props.onClick as () => void)()
  expect(harness.push).not.toHaveBeenCalled()
  harness.index = 0
  tree = elements(CreateCharacterButton({ children: 'Criar personagem' }))
  const modal = tree.find(element => element.type === CharacterEntryModeDialog)!
  ;(modal.props.onChoose as (mode: string) => void)('EXISTING')
  expect(harness.push).toHaveBeenCalledWith('/create-characters?entryMode=EXISTING')
  expect(fetch).not.toHaveBeenCalled()
})

it.each(['ASSISTED', 'EXISTING'])('confirma modo %s pelo formulário acessível do modal', mode => {
  let tree = dialog()
  harness.effects[0]()
  expect(harness.show).toHaveBeenCalledOnce()
  expect(tree[0].props['aria-labelledby']).toBe('creation-mode-title')
  ;(tree.find(element => element.type === 'select')!.props.onChange as (event: unknown) => void)({ target: { value: mode } })
  tree = dialog()
  ;(tree.find(element => element.type === 'form')!.props.onSubmit as (event: unknown) => void)({ preventDefault: vi.fn() })
  expect(choose).toHaveBeenCalledWith(mode)
  expect(harness.close).toHaveBeenCalledOnce()
  expect(fetch).not.toHaveBeenCalled()
})

it.each(['Cancelar', 'Escape'])('%s fecha sem escolher ou criar ficha', action => {
  const tree = dialog()
  if (action === 'Escape') (tree[0].props.onCancel as (event: unknown) => void)({ preventDefault: vi.fn() })
  else (tree.find(element => element.props.children === 'Cancelar')!.props.onClick as () => void)()
  expect(cancel).toHaveBeenCalledOnce()
  expect(choose).not.toHaveBeenCalled()
  expect(harness.close).toHaveBeenCalledOnce()
  expect(fetch).not.toHaveBeenCalled()
})
