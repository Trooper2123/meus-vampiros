import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({ data: undefined as unknown, error: null as Error | null }))
vi.mock('swr', () => ({ default: () => ({ data: state.data, error: state.error, mutate: vi.fn() }) }))
import { CampaignXpHistory } from '@/components/campaign-xp-history'
const render = () => renderToStaticMarkup(createElement(CampaignXpHistory, { campaignId: 'mesa' }))

it('apresenta contador, filtros, saldo e compra sem inventar níveis de especialidade', () => {
  state.data = { page: 1, unread: 1, total: 1, characters: [{ id: 'ficha', name: 'Rai', totalXp: 20, spentXp: 3, availableXp: 17, recentPurchases: [{ traitName: 'Agarrar', xpAmount: 3 }] }], entries: [{ id: 'evento', characterId: 'ficha', characterName: 'Rai', player: 'Jogador de teste', type: 'XP_SPENT', category: 'SPECIALTY', traitName: 'Agarrar', previousValue: null, newValue: null, xpAmount: 3, createdAt: '2026-10-25T12:00:00Z', viewed: false, source: 'XP' }] }
  const html = render()
  for (const text of ['1 nova compra', 'Categoria', 'Visualização', 'Recebido: 20 XP', 'Gasto: 3 XP', 'Disponível: 17 XP', 'Agarrar', '3 XP', 'Jogador de teste', 'Consultar histórico completo', 'Marcar registros desta página']) expect(html).toContain(text)
  expect(html).not.toContain('→')
  expect(html).toContain('<time')
  expect(html).toContain('<summary')
})
it('não mantém dados privados visíveis ao falhar a revalidação', () => {
  state.error = new Error('Acesso negado')
  try {
    const html = render()
    expect(html).toContain('Não foi possível consultar o histórico')
    expect(html).not.toContain('Jogador de teste')
    expect(html).not.toContain('Agarrar')
  } finally { state.error = null; state.data = undefined }
})
it('informa carregamento e estado vazio', () => {
  expect(render()).toContain('Carregando evolução')
  state.data = { page: 1, unread: 0, total: 0, entries: [], characters: [] }
  expect(render()).toContain('Nenhuma evolução encontrada')
  state.data = undefined
})
