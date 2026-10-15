import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ReactElement, ReactNode } from 'react'

const harness = vi.hoisted(() => ({ states: [] as unknown[], index: 0, push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: harness.push }) }))
vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof import('react')>(),
  useState: (initial: unknown) => {
    const index = harness.index++
    if (!(index in harness.states)) harness.states[index] = initial
    return [harness.states[index], (value: unknown) => { harness.states[index] = value }]
  },
}))
import { CampaignNpcCreator } from '@/components/campaign-npc-creator'

type Element = ReactElement<Record<string, any>>
function elements(node: ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements)
  if (!node || typeof node !== 'object' || !('props' in node)) return []
  const element = node as Element
  return [element, ...elements(element.props.children)]
}
function render() { harness.index = 0; return elements(CampaignNpcCreator({ campaignId: 'current-table' })) }
function form() { return render().find(element => element.type === 'form')! }
beforeEach(() => {
  harness.states = []
  harness.push.mockReset()
  vi.stubGlobal('fetch', vi.fn())
})
afterEach(() => vi.unstubAllGlobals())

it('oferece somente NPCs, usa a mesa atual e abre editor existente', async () => {
  expect(render().filter(element => element.type === 'option').map(element => element.props.value)).toEqual(['HUMAN_NPC', 'VAMPIRE_NPC'])
  render().find(element => element.type === 'input')!.props.onChange({ target: { value: 'NPC' } })
  render().find(element => element.type === 'select')!.props.onChange({ target: { value: 'VAMPIRE_NPC' } })
  const id = '00000000-0000-4000-8000-000000000001'
  vi.mocked(fetch).mockResolvedValueOnce(Response.json({ id }, { status: 201 }))
  await form().props.onSubmit({ preventDefault: vi.fn() })
  expect(fetch).toHaveBeenCalledWith('/api/campaigns/current-table/npcs', expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'NPC', characterType: 'VAMPIRE_NPC' }) }))
  expect(harness.push).toHaveBeenCalledWith(`/characters/${id}/edit`)
})

it.each(['network', '403', '500', 'json'])('falha %s preserva campos, libera envio e não navega', async failure => {
  render().find(element => element.type === 'input')!.props.onChange({ target: { value: 'NPC' } })
  if (failure === 'network') vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'))
  else vi.mocked(fetch).mockResolvedValueOnce(failure === 'json' ? new Response('invalid') : new Response('{}', { status: Number(failure) }))
  await form().props.onSubmit({ preventDefault: vi.fn() })
  expect(harness.push).not.toHaveBeenCalled()
  expect(render().find(element => element.type === 'input')!.props.value).toBe('NPC')
  expect(render().find(element => element.type === 'button')!.props.disabled).toBe(false)
  expect(render().some(element => element.props.role === 'alert')).toBe(true)
})
