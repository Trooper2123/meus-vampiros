import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const harness = vi.hoisted(() => ({ states: [] as any[], refs: [] as { current: any }[], state: 0, ref: 0, id: 'fixture', revision: 0, items: [] as any[] }))
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams('entryMode=ASSISTED'), useRouter: () => ({ push: vi.fn() }) }))
vi.mock('react', async original => ({
  ...await original<typeof import('react')>(), useEffect: () => undefined,
  useState: (initial: any) => {
    const index = harness.state++
    if (!(index in harness.states)) harness.states[index] = initial === 'UNDECIDED' ? null : initial === 'identidade' ? 'vantagens' : typeof initial === 'function' ? initial() : initial
    return [harness.states[index], (next: any) => { harness.states[index] = typeof next === 'function' ? next(harness.states[index]) : next }]
  },
  useRef: (initial: unknown) => harness.refs[harness.ref++] ??= { current: initial },
}))
function snapshot() { return { character: { id: harness.id, revision: harness.revision, name: 'Ficha', status: 'DRAFT', characterType: 'PLAYER_VAMPIRE', campaignId: null, data: {} } } }
vi.mock('swr', () => ({ default: (url: string) => ({ data: url?.includes('/api/characters?') ? snapshot() : { possessions: harness.items }, mutate: async () => snapshot() }), useSWRConfig: () => ({ mutate: async (_key: string, value?: unknown) => value ?? snapshot() }) }))
import CharacterFormClient from '@/app/characters/character-form-client'
type Element = ReactElement<Record<string, any>>
function elements(node: ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements)
  if (!node || typeof node !== 'object' || !('props' in node)) return []
  const element = node as Element
  return [element, ...elements(element.props.children)]
}
function view() {
  harness.state = 0; harness.ref = 0
  const tree = elements(CharacterFormClient({ initialCharacterId: harness.id || null, mode: harness.id ? 'edit' : 'create' }))
  tree.find(element => element.type === 'form')!.props.ref.current = {}
  return tree
}
function input(placeholder: string) { return view().find(element => element.type === 'input' && element.props.placeholder === placeholder)! }
function add() { return view().find(element => element.type === 'button' && element.props.onClick?.name === 'handleAddPossession')! }
function submit() { view().find(element => element.type === 'form')!.props.onSubmit({ preventDefault() {} }) }
function fill() { input('Ex.: Carro Sedan, Armamento, Celular Seguro').props.onChange({ target: { value: 'Caderno' } }) }
beforeEach(() => {
  harness.states = []; harness.refs = []; harness.id = 'fixture'; harness.revision = 0; harness.items = []
  vi.stubGlobal('window', { setTimeout: (callback: () => void) => { queueMicrotask(callback); return 1 } })
  vi.stubGlobal('FormData', class { entries() { return [] } })
})
afterEach(() => vi.unstubAllGlobals())

it('reenvio conserva chave e campos após perda de resposta, sem perder a revisão da ficha', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(Response.json({ possession: { id: 'item', status: 'aprovado' }, revision: 0 })))
  fill()
  await add().props.onClick()
  expect(input('Ex.: Carro Sedan, Armamento, Celular Seguro').props.value).toBe('Caderno')
  await add().props.onClick()
  const calls = vi.mocked(fetch).mock.calls
  expect(JSON.parse(calls[0][1]!.body as string)).toEqual(JSON.parse(calls[1][1]!.body as string))
  expect(JSON.parse(calls[1][1]!.body as string).idempotencyKey).toBeTruthy()
  expect(input('Ex.: Carro Sedan, Armamento, Celular Seguro').props.value).toBe('')
  vi.mocked(fetch).mockImplementation(async (_url, options) => {
    if (options?.method === 'PUT') { expect(JSON.parse(options.body as string).expectedRevision).toBe(0); harness.revision = 1; return Response.json({ ok: true }) }
    return Response.json(snapshot())
  })
  submit()
  await vi.waitFor(() => expect(harness.revision).toBe(1))
})

it('salvar novamente após resposta perdida confirma o mesmo rascunho sem duplicar', async () => {
  harness.id = ''
  const keys: string[] = []
  vi.stubGlobal('fetch', vi.fn(async (url: string, options?: RequestInit) => {
    if (url === '/api/characters') {
      if (options?.method === 'POST') { harness.id = 'saved'; return Response.json({ id: harness.id }) }
      expect(JSON.parse(options!.body as string).expectedRevision).toBe(0)
      harness.revision = 1
      return Response.json({ ok: true })
    }
    if (url === '/api/possessions') {
      keys.push(JSON.parse(options!.body as string).idempotencyKey)
      if (!harness.items.length) {
        harness.items.push({ id: 'item', label: 'Caderno', origin: 'player', status: 'aprovado' })
        throw new Error('offline')
      }
      return Response.json({ possession: harness.items[0], revision: 0 })
    }
    return Response.json(snapshot())
  }))
  fill(); await add().props.onClick(); submit()
  await vi.waitFor(() => expect(harness.states.some(value => typeof value === 'string' && value.includes('rascunhos foram preservados'))).toBe(true))
  submit()
  await vi.waitFor(() => expect(keys).toHaveLength(2))
  expect(keys[1]).toBe(keys[0])
  expect(harness.items).toHaveLength(1)
})

it('salvar ficha nova persiste seus rascunhos com clientKey estável', async () => {
  harness.id = ''
  vi.stubGlobal('fetch', vi.fn(async (url: string, options?: RequestInit) => {
    if (url === '/api/characters' && options?.method === 'POST') { harness.id = 'saved'; return Response.json({ id: harness.id }) }
    if (url === '/api/possessions') {
      const body = JSON.parse(options!.body as string)
      expect(body).toMatchObject({ characterId: 'saved', label: 'Caderno', origin: 'player' })
      expect(body.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/)
      harness.items.push({ id: 'item', label: body.label, origin: 'player', status: 'aprovado' }); harness.revision++
      return Response.json({ possession: harness.items[0], revision: harness.revision })
    }
    return Response.json(snapshot())
  }))
  fill()
  await add().props.onClick()
  expect(fetch).not.toHaveBeenCalled()
  submit()
  await vi.waitFor(() => expect(harness.items).toHaveLength(1))
})
