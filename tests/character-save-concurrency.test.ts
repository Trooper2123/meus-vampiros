import { beforeEach, expect, it, vi } from 'vitest'
import type { ReactElement, ReactNode } from 'react'
const mocks = vi.hoisted(() => ({ character: undefined as undefined | { id: string; revision: number; data: object; characterType: string; status: string }, setters: [] as unknown[], fetch: vi.fn() }))
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams('entryMode=ASSISTED'), useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock('react', async original => ({ ...await original<typeof import('react')>(),
  useState: (initial: unknown) => [initial === 'UNDECIDED' ? null : typeof initial === 'function' ? initial() : initial, (value: unknown) => mocks.setters.push(value)],
  useRef: (initial: unknown) => ({ current: initial }), useEffect: vi.fn(),
}))
vi.mock('swr', () => ({ default: (url: string) => ({ data: url?.startsWith('/api/characters?') ? { character: mocks.character } : undefined, mutate: vi.fn() }), useSWRConfig: () => ({ mutate: vi.fn() }) }))
import CharacterFormClient from '@/app/characters/character-form-client'
function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) return node.flatMap(elements)
  if (!node || typeof node !== 'object' || !('props' in node)) return []
  const e = node as ReactElement<Record<string, unknown>>
  return [e, ...elements(e.props.children as ReactNode)]
}
function submit() {
  const tree = CharacterFormClient({ initialCharacterId: '11111111-1111-4111-8111-111111111111' })
  const form = elements(tree).find(e => e.type === 'form')!
  return () => (form.props.onSubmit as (e: { preventDefault: () => void }) => void)({ preventDefault() {} })
}
beforeEach(() => { mocks.setters = []; mocks.character = undefined; mocks.fetch.mockReset(); vi.stubGlobal('fetch', mocks.fetch) })
it('retomada aguarda revisão carregada em vez de enviar revisão zero', () => {
  submit()()
  expect(mocks.fetch).not.toHaveBeenCalled()
  expect(mocks.setters).toContain('Aguarde o carregamento da ficha antes de salvar.')
})
it('dois eventos antes do render enviam uma única edição e preservam conflito real', async () => {
  mocks.character = { id: '11111111-1111-4111-8111-111111111111', revision: 7, data: {}, characterType: 'PLAYER_VAMPIRE', status: 'DRAFT' }
  mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ error: 'A ficha foi alterada. Recarregue antes de tentar novamente.' }), { status: 409 }))
  const send = submit()
  send(); send()
  await vi.waitFor(() => expect(mocks.setters).toContain('A ficha foi alterada. Recarregue antes de tentar novamente.'))
  expect(mocks.fetch).toHaveBeenCalledTimes(1)
  expect(JSON.parse(mocks.fetch.mock.calls[0][1].body).expectedRevision).toBe(7)
})
it('falha de rede é informada e libera nova tentativa', async () => {
  mocks.character = { id: '11111111-1111-4111-8111-111111111111', revision: 7, data: {}, characterType: 'PLAYER_VAMPIRE', status: 'DRAFT' }
  mocks.fetch.mockRejectedValue(new Error('offline'))
  const send = submit()
  send()
  await vi.waitFor(() => expect(mocks.setters).toContain('Não foi possível confirmar o salvamento. Seus dados foram mantidos; tente novamente.'))
  send()
  expect(mocks.fetch).toHaveBeenCalledTimes(2)
})
