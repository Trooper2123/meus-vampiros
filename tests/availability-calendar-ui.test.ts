import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ReactElement, ReactNode } from 'react'

const harness = vi.hoisted(() => ({ states: [] as unknown[], index: 0, data: { currentUserId: 'player', entries: [] as unknown[], schedule: { startTime: '19:30', endTime: '22:15' } }, mutate: vi.fn() }))
vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof import('react')>(),
  useMemo: (compute: () => unknown) => compute(),
  useState: (initial: unknown) => {
    const index = harness.index++
    if (!(index in harness.states)) harness.states[index] = typeof initial === 'function' ? initial() : initial
    return [harness.states[index], (value: unknown) => { harness.states[index] = value }]
  },
}))
vi.mock('swr', () => ({ default: () => ({ data: harness.data, mutate: harness.mutate }) }))
import { DateAvailabilityCalendar } from '@/components/date-availability-calendar'

type Element = ReactElement<Record<string, any>>
function elements(node: ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements)
  if (!node || typeof node !== 'object' || !('props' in node)) return []
  const element = node as Element
  return [element, ...elements(element.props.children)]
}
function render() {
  harness.index = 0
  return elements(DateAvailabilityCalendar({ campaignId: 'table', master: true }))
}
function input(label: string) { return render().find(element => element.props['aria-label'] === label)! }
function saveButton() { return render().find(element => element.type === 'button' && element.props.children === 'Salvar horário')! }

beforeEach(() => {
  harness.states = []
  harness.data.entries = []
  harness.data.schedule = { startTime: '19:30', endTime: '22:15' }
  harness.mutate.mockReset().mockResolvedValue(undefined)
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ schedule: { startTime: '20:00', endTime: '22:15' } })))
})
afterEach(() => vi.unstubAllGlobals())

it('envia horários exibidos, preserva o outro campo e rascunho durante revalidação', async () => {
  await saveButton().props.onClick()
  expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)).toMatchObject({ startTime: '19:30', endTime: '22:15' })
  input('Horário de início').props.onChange({ target: { value: '20:00' } })
  harness.data.schedule = { startTime: '18:00', endTime: '23:00' }
  expect(input('Horário de início').props.value).toBe('20:00')
  expect(input('Horário de fim').props.value).toBe('22:15')
  await saveButton().props.onClick()
  expect(JSON.parse(vi.mocked(fetch).mock.calls[1][1]!.body as string)).toMatchObject({ startTime: '20:00', endTime: '22:15' })
})

it.each(['network', '400', '403', '500', 'json'])('falha %s libera controles e mantém edição para nova tentativa', async failure => {
  input('Horário de início').props.onChange({ target: { value: '20:00' } })
  if (failure === 'network') vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'))
  else vi.mocked(fetch).mockResolvedValueOnce(failure === 'json' ? new Response('not-json') : new Response('{}', { status: Number(failure) }))
  await saveButton().props.onClick()
  expect(saveButton().props.disabled).toBe(false)
  expect(input('Horário de início').props.value).toBe('20:00')
  expect(render().some(element => element.props.role === 'alert')).toBe(true)
  expect(harness.mutate).not.toHaveBeenCalled()
  await saveButton().props.onClick()
  expect(harness.mutate).toHaveBeenCalledOnce()
})

it('destaca apenas resposta do usuário, mesmo com nomes iguais', () => {
  render()
  const date = '2026-10-15'
  harness.states[4] = date
  harness.data.entries = [
    { userId: 'other', name: 'Mesmo nome', date, status: 'disponível' },
    { userId: 'player', name: 'Mesmo nome', date, status: 'talvez' },
  ]
  const buttons = render().filter(element => element.type === 'button' && element.props.className?.includes('border-primary text-primary'))
  expect(buttons).toHaveLength(1)
  expect(buttons[0].props.children).toContain('Talvez')
})
