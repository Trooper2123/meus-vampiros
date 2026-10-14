import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { SWRConfig } from 'swr'
import { expect, it, vi } from 'vitest'
import { LiveKitRoomLink } from '@/components/livekit/livekit-room-link'

vi.mock('@/components/livekit/livekit-room', () => ({ LiveKitRoom: () => null }))
const campaignId = '11111111-1111-4111-8111-111111111111'
function render(active: boolean, canSummon = false) {
  return renderToStaticMarkup(createElement(SWRConfig, { value: { provider: () => new Map(), revalidateOnMount: false, fallback: { [`/api/campaigns/${campaignId}/call`]: { active, canSummon } } } }, createElement(LiveKitRoomLink, { campaignId, master: false })))
}
it('bloqueia entrada do jogador sem convocação', () => {
  expect(render(false)).toMatch(/disabled=""[^>]*>.*?Entrar na sessão da mesa/)
  expect(render(false)).not.toContain('Convocar jogadores')
})
it('habilita entrada após convocação', () => {
  const html = render(true)
  expect(html).toContain('Entrar na sessão da mesa')
  expect(html).not.toContain('disabled=""')
})
it('Narrador recebe controles pela capacidade do servidor', () => {
  expect(render(false, true)).toContain('Convocar jogadores')
  expect(render(true, true)).toContain('Encerrar convocação')
})
