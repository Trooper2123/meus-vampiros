import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { ArchiveHeader } from '@/components/archive-header'
import { CharacterSummary } from '@/components/character-summary/character-summary'
import { SessionResources } from '@/components/character-summary/session-resources'
import { SummaryHeader } from '@/components/character-summary/summary-header'
import { CampaignNotesDialog } from '@/components/notes/campaign-notes-dialog'

const state = vi.hoisted(() => ({ data: undefined as unknown }))
vi.mock('swr', () => ({ default: () => ({ data: state.data, mutate: vi.fn() }) }))

it('agrupa anotações com o nome e preserva a apresentação padrão do painel', () => {
  const props = { campaignId: 'authorized-campaign', actorId: 'player', player: true }
  const action = createElement(CampaignNotesDialog, { ...props, compact: true })
  const html = renderToStaticMarkup(createElement(SummaryHeader, { name: 'Helena', clan: null, predator: null, generation: null, campaignName: null, campaignTheme: null, actions: action }))
  expect(html).toContain('flex flex-wrap items-center justify-between gap-4')
  expect(html.indexOf('Helena')).toBeLessThan(html.indexOf('aria-haspopup="dialog"'))
  expect(html).toContain('class="sr-only"')
  expect(html).toContain('Minhas anotações da mesa')
  expect(renderToStaticMarkup(createElement(CampaignNotesDialog, props))).toContain('border border-border bg-card p-5')
})

it('mantém navegação por teclado e só oferece mesas quando existem mesas próprias', () => {
  state.data = { campaigns: [] }
  let html = renderToStaticMarkup(createElement(ArchiveHeader, { title: 'Personagens' }))
  expect(html).toContain('<details')
  expect(html).toContain('Menu</summary>')
  expect(html).toContain('href="/notes"')
  expect(html).not.toContain('href="/campaigns"')
  state.data = { campaigns: [{ id: 'authorized' }] }
  html = renderToStaticMarkup(createElement(ArchiveHeader, { title: 'Personagens' }))
  expect(html).toContain('href="/campaigns"')
  expect(renderToStaticMarkup(createElement(ArchiveHeader, { title: '<script>', showCampaigns: false }))).not.toContain('<script>')
})

it('apresenta os recursos autorizados, mantendo o editor recolhido e danos reais', () => {
  state.data = {
    state: { humanity: 7, hunger: 2, healthCurrent: 3, willpowerCurrent: 4, stains: 0, condition: 'ACTIVE', healthDamage: { superficial: 2, aggravated: 0 }, willpowerDamage: { superficial: 1, aggravated: 0 } },
    maxima: { healthMax: 5, willpowerMax: 5 }, revision: 1, canEditNarrative: false,
  }
  const html = renderToStaticMarkup(createElement(SessionResources, { characterId: 'authorized-character' }))
  expect(html).toContain('3 / 5')
  expect(html).toContain('4 / 5')
  expect(html).toContain('aria-label="2 de 5"')
  expect(html).toContain('Cada alteração é salva automaticamente')
  expect(html).not.toContain('<details open')
  expect(html).toContain('aria-label="Aumentar Humanidade" disabled=""')
})

it('mantém recursos antes dos atributos e preserva o conteúdo informado', () => {
  const html = renderToStaticMarkup(createElement(CharacterSummary, {
    data: { id: 'authorized', name: 'Helena', clan: 'Toreador', predator: null, generation: '12ª', campaignName: null, campaignTheme: null, attributes: { forca: 2 }, skills: {}, merits: [], flaws: [], disciplines: [], resources: { humanidade: 7, vontade: 5, vitalidade: 5, fome: 1 } },
    resources: createElement('p', {}, 'Recursos autorizados'),
  }))
  expect(html.indexOf('Helena')).toBeLessThan(html.indexOf('Recursos autorizados'))
  expect(html.indexOf('Recursos autorizados')).toBeLessThan(html.indexOf('Atributos'))
})
