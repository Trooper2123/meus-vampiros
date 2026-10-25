import { type ReactElement, type ReactNode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const harness = vi.hoisted(() => ({ states: [] as unknown[], refs: [] as { current: unknown }[], state: 0, ref: 0, status: 'PENDING_REVIEW', condition: 'ACTIVE', revision: 0, error: null as Error | null }))
vi.mock('react', async original => ({
  ...await original<typeof import('react')>(),
  useState: (initial: unknown) => {
    const index = harness.state++
    if (!(index in harness.states)) harness.states[index] = initial
    return [harness.states[index], (next: unknown) => { harness.states[index] = next }]
  },
  useRef: (initial: unknown) => harness.refs[harness.ref++] ??= { current: initial },
}))
vi.mock('swr', () => ({ default: (url: string) => ({ data: url.includes('/resources') ? { state: { condition: harness.condition }, revision: harness.revision } : { character: { status: harness.status, revision: harness.revision } }, error: harness.error, mutate: async () => undefined }) }))
import { CampaignParticipantControls } from '@/components/campaign-participant-controls'

type Element = ReactElement<{ children?: ReactNode; onClick?: () => Promise<void>; onChange?: (event: { target: { value: string } }) => void; disabled?: boolean; value?: string }>
function elements(node: ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements)
  if (!node || typeof node !== 'object' || !('props' in node)) return []
  const element = node as Element
  return [element, ...elements(element.props.children)]
}
function view() { harness.state = 0; harness.ref = 0; return elements(CampaignParticipantControls({ characterId: 'ficha' })) }
function button(text: string) { return view().find(element => element.type === 'button' && element.props.children === text)! }
beforeEach(() => { harness.states = []; harness.refs = []; harness.status = 'PENDING_REVIEW'; harness.condition = 'ACTIVE'; harness.revision = 0; harness.error = null })
afterEach(() => vi.unstubAllGlobals())

it('aprova com revisão e chave, bloqueando cliques concorrentes', async () => {
  let finish!: (response: Response) => void
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => { finish = resolve })))
  const first = button('Aprovar ficha')
  const sending = first.props.onClick!()
  await first.props.onClick!()
  expect(fetch).toHaveBeenCalledTimes(1)
  const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)
  expect(body).toMatchObject({ status: 'APPROVED', expectedRevision: 0, idempotencyKey: expect.any(String) })
  finish(Response.json({ revision: 1 }))
  await sending
})

it('conserva o mesmo envio e motivo após resposta perdida', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(Response.json({ revision: 1 })))
  view().find(element => element.type === 'input')!.props.onChange!({ target: { value: 'Estaca removida da cena' } })
  await button('Marcar Empalado').props.onClick!()
  expect(button('Reenviar operação')).toBeTruthy()
  await button('Reenviar operação').props.onClick!()
  const calls = vi.mocked(fetch).mock.calls
  expect(calls[0][0]).toBe('/api/characters/ficha/condition')
  expect(calls[0][1]!.body).toEqual(calls[1][1]!.body)
  expect(JSON.parse(calls[1][1]!.body as string)).toMatchObject({ condition: 'STAKED', reason: 'Estaca removida da cena' })
})

it('rejeição por revisão permite novo envio após reconsulta', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ error: 'Revisão antiga' }, { status: 409 })).mockResolvedValueOnce(Response.json({ revision: 3 })))
  await button('Aprovar ficha').props.onClick!()
  harness.revision = 2
  await button('Aprovar ficha').props.onClick!()
  expect(JSON.parse(vi.mocked(fetch).mock.calls[1][1]!.body as string).expectedRevision).toBe(2)
})

it('oculta controles quando perde acesso e impede remoção de morte definitiva', () => {
  harness.error = new Error('Acesso negado')
  expect(view().some(element => element.type === 'button')).toBe(false)
  harness.error = null; harness.condition = 'FINAL_DEATH'; harness.status = 'APPROVED'
  expect(view().some(element => element.type === 'button')).toBe(false)
})
