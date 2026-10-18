import { beforeEach, expect, it, vi } from 'vitest'
import type { ReactElement, ReactNode } from 'react'
const session = vi.hoisted(() => { vi.stubEnv('NODE_ENV', 'test'); vi.stubEnv('DATABASE_URL', undefined); return vi.fn() })
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: session }))
vi.mock('next/navigation', () => ({
  redirect: (path: string) => { throw new Error('redirect:' + path) },
  notFound: () => { throw new Error('not-found') },
}))
import Page from '@/app/characters/[id]/evolution/page'
import { CharacterDisciplineProgression } from '@/components/character-summary/character-discipline-progression'
import { CharacterSpecialties } from '@/components/character-summary/character-specialties'

const id = '11111111-1111-4111-8111-111111111111'
const campaignId = '22222222-2222-4222-8222-222222222222'
const params = Promise.resolve({ id })
function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) return node.flatMap(elements)
  if (!node || typeof node !== 'object' || !('props' in node)) return []
  const element = node as ReactElement<Record<string, unknown>>
  return [element, ...elements(element.props.children as ReactNode)]
}
beforeEach(() => {
  const now = new Date()
  session.mockResolvedValue({ user: { sub: 'player' } })
  global.__devDb = {
    characters: [{ id, userId: 'player', createdByUserId: 'player', characterType: 'PLAYER_VAMPIRE', name: 'Helena', concept: null, clan: null, generation: null, campaignId, status: 'APPROVED', data: {}, gameState: {}, totalXp: 30, spentXp: 0, revision: 0, createdAt: now, updatedAt: now }],
    campaigns: [{ id: campaignId, masterUserId: 'narrator', name: 'Mesa', theme: null, principios: null, averageXp: null, status: 'Ativa', lastSessionAt: null, createdAt: now, updatedAt: now }],
    possessions: [], characterLedgerEvents: [],
  }
})
it.each(['player', 'narrator'])('página própria contém as opções de evolução para %s', async actor => {
  session.mockResolvedValue({ user: { sub: actor } })
  const nodes = elements(await Page({ params }))
  expect(nodes.filter(node => node.type === CharacterDisciplineProgression || node.type === CharacterSpecialties)).toHaveLength(2)
  expect(nodes.find(node => node.type === CharacterSpecialties)?.props.characterId).toBe(id)
  expect(nodes.some(node => node.props.href === `/characters/${id}/summary`)).toBe(true)
})
it('pede login antes de carregar a ficha', async () => {
  session.mockResolvedValue(null)
  await expect(Page({ params })).rejects.toThrow('redirect:/auth/login')
})
it.each(['other-player', 'other-narrator'])('impede acesso de %s à evolução alheia', async actor => {
  session.mockResolvedValue({ user: { sub: actor } })
  await expect(Page({ params })).rejects.toThrow('not-found')
})
it('recusa IDs manipulados, ficha inexistente e tipo sem evolução implementada', async () => {
  await expect(Page({ params: Promise.resolve({ id: '../../other' }) })).rejects.toThrow('not-found')
  await expect(Page({ params: Promise.resolve({ id: '33333333-3333-4333-8333-333333333333' }) })).rejects.toThrow('not-found')
  global.__devDb!.characters[0].characterType = 'HUMAN_NPC'
  await expect(Page({ params })).rejects.toThrow('not-found')
})

