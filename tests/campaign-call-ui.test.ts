import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { SWRConfig } from 'swr'
import { expect, it, vi } from 'vitest'
import { LiveKitRoomLink } from '@/components/livekit/livekit-room-link'

vi.mock('@/components/livekit/livekit-room', () => ({ LiveKitRoom: () => null }))
vi.mock('@/components/livekit/call-rolls', () => ({ CallRolls: () => createElement('div', null, 'Painel de rolagens') }))
const campaignId = '11111111-1111-4111-8111-111111111111'
function render(active: boolean | undefined, canSummon = false, master = false, error?: Error) {
  const endpoint = `/api/campaigns/${campaignId}/call`
  const data = active === undefined ? undefined : { active, canSummon }
  return renderToStaticMarkup(createElement(SWRConfig, { value: { provider: () => new Map([[endpoint, { data, error }]]), revalidateOnMount: false } }, createElement(LiveKitRoomLink, { campaignId, master })))
}
it('oculta todo o card do jogador sem convocação', () => {
  expect(render(false)).toBe('')
})
it('habilita entrada após convocação', () => {
  const html = render(true)
  expect(html).toContain('Entrar na sessão da mesa')
  expect(html).toContain('Painel de rolagens')
  expect(html).not.toContain('disabled=""')
})
it('apresenta rolagens mesmo antes da conexão de vídeo', () => {
  const html = render(true)
  expect(html).toContain('Painel de rolagens')
})
it('Narrador recebe controles pela capacidade do servidor', () => {
  expect(render(false, true)).toContain('Convocar jogadores')
  expect(render(true, true)).toContain('Encerrar convocação')
})
it('oculta card durante carregamento e erro, mesmo com convocação em cache', () => {
  expect(render(undefined)).toBe('')
  expect(render(false, false, false, new Error('Convocação com banco externo ainda não disponível.'))).toBe('')
  expect(render(true, false, false, new Error('Falha de autorização.'))).toBe('')
})
it('mantém diagnóstico para o Narrador sem liberar a entrada em erro', () => {
  const html = render(undefined, false, true, new Error('Convocação indisponível.'))
  expect(html).toContain('Mesa virtual')
  expect(html).toContain('Convocação indisponível.')
  expect(html).toContain('disabled=""')
})
