import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import type { ReactElement, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { SessionResources } from '@/components/character-summary/session-resources'

const harness = vi.hoisted(() => ({
  states: [] as unknown[], refs: [] as { current: any }[], stateIndex: 0, refIndex: 0, data: {} as any,
  refresh: vi.fn(), notify: vi.fn(),
}))
vi.mock('swr', () => ({ default: () => ({ data: harness.data, mutate: harness.refresh }) }))
vi.mock('react', async original => ({
  ...await original<typeof import('react')>(),
  useState: (initial: unknown) => {
    const index = harness.stateIndex++
    if (!(index in harness.states)) harness.states[index] = initial
    return [harness.states[index], (next: any) => { harness.states[index] = typeof next === 'function' ? next(harness.states[index]) : next }]
  },
  useRef: (initial: unknown) => {
    const index = harness.refIndex++
    return harness.refs[index] ??= { current: initial }
  },
}))

type Element = ReactElement<Record<string, any>>
function elements(node: ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements)
  if (!node || typeof node !== 'object' || !('props' in node)) return []
  const element = node as Element
  return [element, ...elements(typeof element.type === 'function' && element.type.name === 'ResourceButtons' ? (element.type as (props: any) => ReactNode)(element.props) : element.props.children)]
}
function text(node: ReactNode): string {
  if (Array.isArray(node)) return node.map(text).join('')
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  return node && typeof node === 'object' && 'props' in node ? text((node as Element).props.children) : ''
}
let Form: (props: any) => ReactNode
let displayedRevision: number
function view() {
  if (displayedRevision !== harness.data.revision) { harness.states = []; harness.refs = []; displayedRevision = harness.data.revision }
  harness.stateIndex = 0; harness.refIndex = 0
  const node = Form({ data: harness.data, url: '/api/characters/authorized/resources', refresh: harness.refresh, notify: harness.notify })
  const dialog = elements(node).find(element => element.type === 'dialog')!
  dialog.props.ref.current ??= {
    open: false,
    showModal() { this.open = true },
    close() { this.open = false },
  }
  return node
}
function render() { return elements(view()) }
function button(label: string) { return render().find(element => element.type === 'button' && (element.props['aria-label'] === label || text(element.props.children) === label))! }
function html() { return renderToStaticMarkup(view()) }
function command(index = 0) { return JSON.parse(vi.mocked(fetch).mock.calls[index][1]!.body as string) }
function serverResponse(options: RequestInit) {
  const changes = JSON.parse(options.body as string).changes
  const state = { ...harness.data.state, ...changes }
  state.healthCurrent = 5 - state.healthDamage.superficial - state.healthDamage.aggravated
  state.willpowerCurrent = 5 - state.willpowerDamage.superficial - state.willpowerDamage.aggravated
  return Response.json({ ok: true, state, maxima: harness.data.maxima, revision: harness.data.revision + 1 })
}

beforeEach(() => {
  harness.data = {
    state: { humanity: 7, hunger: 1, stains: 0, healthDamage: { superficial: 2, aggravated: 1 }, willpowerDamage: { superficial: 1, aggravated: 0 }, healthCurrent: 2, willpowerCurrent: 4, condition: 'ACTIVE' },
    maxima: { healthMax: 5, willpowerMax: 5 }, revision: 1, canEditNarrative: false,
  }
  displayedRevision = harness.data.revision
  harness.states = []; harness.refs = []; harness.stateIndex = 0; harness.refIndex = 0
  Form = elements(SessionResources({ characterId: 'authorized' })).find(element => typeof element.type === 'function')!.type as typeof Form
  harness.states = []; harness.refs = []; harness.stateIndex = 0; harness.refIndex = 0
  harness.refresh.mockReset().mockImplementation(async updated => { harness.data = updated })
  harness.notify.mockReset()
  vi.stubGlobal('fetch', vi.fn(async (_url: string, options: RequestInit) => serverResponse(options)))
})
afterEach(() => vi.unstubAllGlobals())

it('botões mostram só símbolos, incluindo redutor de Humanidade', () => {
  expect(text(button('Reduzir Humanidade'))).toBe('−')
  expect(text(button('Aumentar Humanidade'))).toBe('+')
  expect(text(button('Reduzir Fome'))).toBe('−')
  expect(text(button('Aumentar Fome'))).toBe('+')
  expect(html()).not.toContain('Salvar recursos')
  expect(html()).not.toContain('<input')
})

it('cancelar tem foco padrão e mantém Fome 1 sem envio', () => {
  button('Reduzir Fome').props.onClick()
  const dialog = render().find(element => element.type === 'dialog')!
  expect(dialog.props.ref.current.open).toBe(true)
  expect(button('Cancelar').props.autoFocus).toBe(true)
  expect(text(dialog)).toContain('Atenção: ação tabu')
  button('Cancelar').props.onClick()
  expect(dialog.props.ref.current.open).toBe(false)
  expect(html()).toContain('aria-label="1 de 5"')
  expect(fetch).not.toHaveBeenCalled()
})

it('confirmar zero salva automaticamente com motivo contextual, sem penalidades adicionais', async () => {
  button('Reduzir Fome').props.onClick()
  expect(fetch).not.toHaveBeenCalled()
  await button('Confirmar redução para 0').props.onClick()
  expect(command()).toMatchObject({ changes: { hunger: 0 }, reason: 'Ação tabu confirmada: Fome 1 → 0.', expectedRevision: 1 })
  expect(Object.keys(command().changes)).toEqual(['hunger'])
  expect(harness.data.state).toMatchObject({ hunger: 0, humanity: 7, stains: 0 })
  expect(html()).toContain('aria-label="0 de 5"')
  expect(harness.notify).toHaveBeenLastCalledWith('Alteração salva e registrada no histórico.')
})

it('cada clique de Fome salva, usa nova revisão e mantém cinco pontos nos limites 0–5', async () => {
  for (let index = 0; index < 4; index++) await button('Aumentar Fome').props.onClick()
  expect(fetch).toHaveBeenCalledTimes(4)
  expect(command(3).expectedRevision).toBe(4)
  expect(html()).toContain('aria-label="5 de 5"')
  expect(button('Aumentar Fome').props.disabled).toBe(true)
  await button('Aumentar Fome').props.onClick()
  expect(fetch).toHaveBeenCalledTimes(4)
  const strip = render().find(element => element.props.className === 'archive-hunger')!
  expect(elements(strip).filter(element => element.props['aria-hidden'] === 'true')).toHaveLength(5)
  harness.data.state.hunger = 0
  expect(button('Reduzir Fome').props.disabled).toBe(true)
  await button('Reduzir Fome').props.onClick()
  expect(fetch).toHaveBeenCalledTimes(4)
})

it('Humanidade/manchas sem permissão permanecem bloqueadas até no callback', async () => {
  expect(button('Reduzir Humanidade').props.disabled).toBe(true)
  await button('Reduzir Humanidade').props.onClick()
  expect(button('Aumentar Humanidade').props.disabled).toBe(true)
  expect(button('Aumentar Manchas').props.disabled).toBe(true)
  await button('Aumentar Humanidade').props.onClick()
  await button('Aumentar Manchas').props.onClick()
  expect(fetch).not.toHaveBeenCalled()
})

it('proprietário autorizado aumenta e reduz Humanidade entre 0 e 10', async () => {
  harness.data.canEditNarrative = true
  harness.data.state.humanity = 9
  await button('Aumentar Humanidade').props.onClick()
  expect(command()).toMatchObject({ changes: { humanity: 10 }, reason: 'Ajuste de Humanidade: 9 → 10.' })
  expect(button('Aumentar Humanidade').props.disabled).toBe(true)
  await button('Aumentar Humanidade').props.onClick()
  expect(fetch).toHaveBeenCalledTimes(1)
  await button('Reduzir Humanidade').props.onClick()
  expect(command(1)).toMatchObject({ changes: { humanity: 9 }, reason: 'Ajuste de Humanidade: 10 → 9.' })
  harness.data.state.humanity = 0
  expect(button('Reduzir Humanidade').props.disabled).toBe(true)
  await button('Reduzir Humanidade').props.onClick()
  expect(fetch).toHaveBeenCalledTimes(2)
})

it('proprietário autorizado aumenta e reduz Manchas com salvamento automático', async () => {
  harness.data.canEditNarrative = true
  await button('Aumentar Manchas').props.onClick()
  expect(command().changes).toEqual({ stains: 1 })
  await button('Reduzir Manchas').props.onClick()
  expect(command(1).changes).toEqual({ stains: 0 })
  expect(button('Reduzir Manchas').props.disabled).toBe(true)
  expect(html()).not.toContain('Somente o Narrador pode alterar.')
})

it.each([['Vitalidade', 'health'], ['Força de vontade', 'willpower']] as const)('cada tipo de dano de %s tem contador próprio e salva preservando o outro', async (label, track) => {
  const original = { ...harness.data.state[`${track}Damage`] }
  await button(`Aumentar dano superficial de ${label}`).props.onClick()
  expect(command().changes).toEqual({ [`${track}Damage`]: { ...original, superficial: original.superficial + 1 } })
  expect(text(render().find(element => element.props['aria-label'] === `${label} atual`)!)).toBe(`${5 - original.superficial - original.aggravated - 1} / 5`)
  await button(`Aumentar dano agravado de ${label}`).props.onClick()
  expect(command(1).changes).toEqual({ [`${track}Damage`]: { superficial: original.superficial + 1, aggravated: original.aggravated + 1 } })
  await button(`Reduzir dano agravado de ${label}`).props.onClick()
  expect(command(2).changes).toEqual({ [`${track}Damage`]: { superficial: original.superficial + 1, aggravated: original.aggravated } })
  expect(fetch).toHaveBeenCalledTimes(3)
})

it('dano nunca excede o máximo nem reduz outro tipo quando o escolhido é zero', async () => {
  harness.data.state.healthDamage = { superficial: 4, aggravated: 1 }
  expect(button('Aumentar dano superficial de Vitalidade').props.disabled).toBe(true)
  await button('Aumentar dano superficial de Vitalidade').props.onClick()
  harness.data.state.healthDamage = { superficial: 0, aggravated: 2 }
  expect(button('Reduzir dano superficial de Vitalidade').props.disabled).toBe(true)
  await button('Reduzir dano superficial de Vitalidade').props.onClick()
  expect(fetch).not.toHaveBeenCalled()
  expect(harness.data.state.healthDamage.aggravated).toBe(2)
})

it.each(['network', '500', 'invalid-json'])('falha %s mantém contador confirmado e retry envia o mesmo comando', async failure => {
  if (failure === 'network') vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'))
  else vi.mocked(fetch).mockResolvedValueOnce(failure === 'invalid-json' ? new Response('invalid') : Response.json({}, { status: 500 }))
  await button('Aumentar Fome').props.onClick()
  expect(harness.refresh).not.toHaveBeenCalled()
  expect(harness.notify).toHaveBeenLastCalledWith(expect.any(String), true)
  expect(html()).toContain('aria-label="1 de 5"')
  expect(html()).toContain('Salvamento não confirmado')
  expect(button('Aumentar Fome').props.disabled).toBe(true)
  await button('Reenviar alteração').props.onClick()
  expect(vi.mocked(fetch).mock.calls[1][1]!.body).toBe(vi.mocked(fetch).mock.calls[0][1]!.body)
  expect(harness.refresh).toHaveBeenCalledTimes(1)
  expect(html()).toContain('aria-label="2 de 5"')
})

it.each([403, 409])('erro %s não muda contador nem aparenta sucesso', async status => {
  vi.mocked(fetch).mockResolvedValueOnce(Response.json({ error: 'Acesso negado.' }, { status }))
  await button('Aumentar Fome').props.onClick()
  expect(harness.notify).toHaveBeenLastCalledWith(expect.any(String), true)
  expect(harness.refresh).not.toHaveBeenCalled()
  expect(html()).toContain('aria-label="1 de 5"')
})

it('cliques simultâneos salvam uma única alteração e mantêm valor confirmado durante envio', async () => {
  let resolve!: (response: Response) => void
  vi.mocked(fetch).mockReturnValueOnce(new Promise<Response>(done => { resolve = done }))
  const click = button('Aumentar Fome').props.onClick
  const first = click()
  await click()
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(html()).toContain('aria-label="1 de 5"')
  expect(html()).toContain('Salvando alteração')
  expect(button('Aumentar Fome').props.disabled).toBe(true)
  resolve(serverResponse(vi.mocked(fetch).mock.calls[0][1]!))
  await first
  expect(harness.refresh).toHaveBeenCalledTimes(1)
  expect(html()).toContain('aria-label="2 de 5"')
})
