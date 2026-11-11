import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { SWRConfig } from 'swr'
import { describe, expect, it, vi } from 'vitest'
import { CampaignPossessionsManager } from '@/components/master-panel'
import { CampaignNotesDialog } from '@/components/notes/campaign-notes-dialog'

vi.mock('@auth0/nextjs-auth0/client', () => ({ useUser: () => ({ user: null, isLoading: false }) }))

const campaignId = '11111111-1111-4111-8111-111111111111'
const characterId = '22222222-2222-4222-8222-222222222222'
function render(statuses: string[], sessionId?: string, xpOnly = false) {
  return renderToStaticMarkup(createElement(SWRConfig, { value: { provider: () => new Map(), revalidateOnMount: false, fallback: {
    [`/api/characters?campaignId=${campaignId}`]: { characters: [{ id: characterId, name: 'Participante', totalXp: 3, spentXp: 0 }] },
    [`/api/possessions?campaignId=${campaignId}`]: { possessions: statuses.map((status, index) => ({ id: `item-${index}`, characterId, label: `Pertence ${index}`, status, origin: 'player' })) },
  } } }, createElement(CampaignPossessionsManager, { campaignId, xpOnly, ...(sessionId ? { sessionId } : {}) })))
}

describe('gestão contextual da mesa', () => {
  it.each([{ statuses: [] }, { statuses: ['aprovado'] }, { statuses: ['reprovado'] }, { statuses: ['aprovado', 'reprovado'] }])('oculta revisão sem pendências: %j', ({ statuses }) => {
    const html = render(statuses)
    expect(html).not.toContain('Painel de Revisão de Pertences')
    expect(html).toContain('Conceder Item')
    expect(html).toContain(`/characters/${characterId}/summary`)
  })
  it('reapresenta a fila somente com pendências', () => {
    const html = render(['aprovado', 'pendente', 'reprovado'])
    expect(html).toContain('Painel de Revisão de Pertences')
    expect(html).toContain('Pertence 1')
    expect(html).not.toContain('Pertence 0')
    expect(html).not.toContain('Pertence 2')
  })
  it.each([undefined, '33333333-3333-4333-8333-333333333333'])('oferece XP com ou sem sessão: %s', sessionId => {
    const html = render([], sessionId)
    expect(html).toContain('Atribuir XP aos personagens da mesa')
    expect(html).toContain('Motivo da concessão de XP')
    expect(html).toContain('Adicionar +1 XP a este personagem')
    expect(html).toContain('Quantidade de XP por personagem')
  })
  it('aba de XP reutiliza concessões sem exibir gestão de pertences', () => {
    const html = render(['pendente'], undefined, true)
    expect(html).toContain('Atribuir XP aos personagens da mesa')
    expect(html).not.toContain('Conceder Item')
    expect(html).not.toContain('Painel de Revisão de Pertences')
    expect(html).not.toContain('pertences totais')
  })
  it('destaca acesso modal e preservação de rascunho sem navegar', () => {
    const html = renderToStaticMarkup(createElement(CampaignNotesDialog, { campaignId, actorId: 'dev|local' }))
    expect(html).toContain('aria-haspopup="dialog"')
    expect(html).toContain('<dialog')
    expect(html).toContain('aria-labelledby="campaign-notes-dialog-title"')
    expect(html).toContain('Fechar preserva o rascunho')
    expect(html).toContain('<textarea')
  })
})
