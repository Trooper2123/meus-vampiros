import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({ data: undefined as unknown, error: undefined as unknown, fetcher: undefined as undefined | ((url: string) => Promise<unknown>) }))
vi.mock('swr', () => ({ default: (_url: string, fetcher: (url: string) => Promise<unknown>) => {
  state.fetcher = fetcher
  return { data: state.data, error: state.error, mutate: vi.fn() }
} }))
import { SessionVisualBoard } from '@/components/game-session/session-visual-board'
const render = () => renderToStaticMarkup(createElement(SessionVisualBoard, { campaignId: 'mesa' }))
beforeEach(() => { state.data = undefined; state.error = undefined; vi.unstubAllGlobals() })
it('distingue carregamento, vazio e falha; permite tentar novamente', () => {
  expect(render()).toContain('Carregando mesa visual...')
  state.error = new Error('Consulta indisponível')
  const html = render()
  expect(html).not.toContain('Carregando mesa visual...')
  expect(html).toContain('Não foi possível carregar a mesa visual.')
  expect(html).toContain('Tentar novamente')
  state.error = undefined
  state.data = { active: null, images: [], canManage: false, revision: 0 }
  expect(render()).toContain('Nenhuma imagem compartilhada.')
})
it('consulta possui prazo máximo e rejeita resposta sem autorização', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Acesso negado.' }), { status: 403 }))
  vi.stubGlobal('fetch', fetch)
  const timeout = vi.spyOn(AbortSignal, 'timeout')
  render()
  await expect(state.fetcher!('/api/campaigns/mesa/visual')).rejects.toThrow('Acesso negado.')
  expect(timeout).toHaveBeenCalledWith(15000)
  expect(fetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal)
  timeout.mockRestore()
})
