import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ data: null as unknown, error: null as Error | null, refreshInterval: 0 }))
vi.mock('swr', () => ({ SWRConfig: ({ children }: { children: ReactNode }) => children, default: (_url: string, _read: unknown, options: { refreshInterval: number }) => { mocks.refreshInterval = options.refreshInterval; return { data: mocks.data, error: mocks.error, mutate: async () => mocks.data } }, useSWRConfig: () => ({ mutate: async () => undefined }) }))
vi.mock('@/components/livekit/livekit-room-link', () => ({ LiveKitRoomLink: () => createElement('div', null, 'Sala de vídeo') }))
vi.mock('@/components/character-summary/session-resources', () => ({ SessionResources: ({ characterId }: { characterId: string }) => createElement('div', null, `Recursos ${characterId}`) }))
vi.mock('@/components/character-summary/character-rolls', () => ({ CharacterRolls: ({ characterId }: { characterId: string }) => createElement('div', null, `Rolagens ${characterId}`) }))
vi.mock('@/components/awake-panel', () => ({ AwakePanel: () => createElement('div', null, 'Despertar') }))
vi.mock('@/components/master-panel', () => ({ CampaignPossessionsManager: () => createElement('div', null, 'XP e pertences') }))
vi.mock('@/components/notes/notes-panel', () => ({ NotesPanel: () => createElement('div', null, 'Anotações') }))
vi.mock('@/components/npcs/npc-session-panel', () => ({ NpcSessionPanel: () => createElement('div', null, 'NPCs autorizados'), SessionReveals: () => createElement('div', null, 'Revelações autorizadas') }))

import { CampaignSessionWorkspace } from '@/components/game-session/session-workspace'

const campaignId = '11111111-1111-4111-8111-111111111111'
const session = { id: '22222222-2222-4222-8222-222222222222', status: 'ACTIVE' as const, revision: 1, chronicleNightIds: [] }
function render(canManage: boolean, characters: Array<{ id: string; name: string }>, activeSession: typeof session | null = session) {
  mocks.data = { session: activeSession, canManage, characters }
  return renderToStaticMarkup(createElement(CampaignSessionWorkspace, { campaignId, actorId: 'actor' }))
}

it('player vê somente as fichas projetadas pelo servidor e usa recursos, rolagens, vídeo e P2', () => {
  const html = render(false, [{ id: 'own', name: 'Ficha autorizada' }])
  expect(html).toContain('Ficha autorizada')
  expect(html).toContain('/characters/own/summary')
  expect(html).toContain('Abrir resumo completo da ficha')
  expect(html).not.toContain('/master/catalogo')
  expect(html).not.toContain('/master/vantagens-defeitos')
  expect(html).toContain('Recursos own')
  expect(html).toContain('Rolagens own')
  expect(html).toContain('Sala de vídeo')
  expect(html).toContain('Anotações')
  expect(html).not.toContain('Despertar')
  expect(html).not.toContain('XP e pertences')
  expect(mocks.refreshInterval).toBe(5000)
})

it('Narrador recebe ferramentas contextuais com sessão ativa', () => {
  const html = render(true, [{ id: 'approved', name: 'Ficha aprovada' }])
  expect(html).toContain('Encerrar sessão')
  expect(html).toContain('Despertar')
  expect(html).toContain('XP e pertences')
  expect(html).toContain('/master/catalogo')
  expect(html).toContain('/master/vantagens-defeitos')
  expect(html).toContain('/characters/approved/summary')
})

it('mantém a chamada acessível mesmo antes do modo sessão ser iniciado', () => {
  const html = render(false, [], null)
  expect(html).toContain('Sala de vídeo')
  expect(html).toContain('Videochamada')
})

it('informa carregamento antes de receber o snapshot autorizado', () => {
  mocks.data = null
  const html = renderToStaticMarkup(createElement(CampaignSessionWorkspace, { campaignId, actorId: 'actor' }))
  expect(html).toContain('Carregando sessão...')
  expect(html).not.toContain('Aguardando o Narrador')
  expect(html).not.toContain('Sala de vídeo')
})

it('descarta a projeção anterior e desmonta sala e ferramentas quando a revalidação falha', () => {
  mocks.error = new Error('Acesso negado.')
  try {
    const html = render(true, [{ id: 'private', name: 'Ficha privada' }])
    expect(html).toContain('Acesso negado.')
    for (const content of ['Ficha privada', 'Recursos private', 'Rolagens private', 'Sala de vídeo', 'Despertar', 'XP e pertences', 'Anotações', 'Encerrar sessão']) {
      expect(html).not.toContain(content)
    }
  } finally {
    mocks.error = null
  }
})
