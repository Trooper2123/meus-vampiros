import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ urls: [] as string[], campaignId: 'mesa-1' }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/components/sheet-media-panel', () => ({ SheetMediaPanel: () => null }))
vi.mock('swr', () => ({ default: (url: string | null) => {
  if (url) mocks.urls.push(url)
  const data = url?.startsWith('/api/npcs') ? {
    npcs: [{ id: 'npc-1', name: 'Detetive', sheetType: 'SIMPLE', creatureType: 'MORTAL', role: 'NEUTRAL', status: 'ACTIVE', revision: 0, inSession: true }],
    total: 1, campaigns: [{ id: mocks.campaignId, name: 'Mesa de teste' }], domitors: [],
  } : url?.includes('/sheets?') ? {
    label: 'Perfil', records: [
      { id: 'old', section: 'GENERAL', title: 'Registro antigo', body: '', fields: {}, visibility: 'OWNER_ONLY', updatedAt: '2026-01-01', canEdit: false },
      { id: 'new', section: 'GENERAL', title: 'Registro recente', body: '', fields: {}, visibility: 'OWNER_ONLY', updatedAt: '2026-10-01', canEdit: false },
      { id: 'archived', section: 'GENERAL', title: 'Registro arquivado', body: '', fields: {}, archived: true, visibility: 'OWNER_ONLY', updatedAt: '2026-10-02', canEdit: false },
    ], relations: [], targets: [], responsibles: [], canEdit: false, isNarrator: false,
  } : undefined
  return { data, error: null, mutate: vi.fn() }
} }))
import { NpcCatalogue } from '@/components/npcs/npc-catalogue'
import { SheetNarrativeTabs } from '@/components/sheet-narrative-tabs'

beforeEach(() => { mocks.urls = [] })
it('catálogo oferece filtros e ordenação sem enviar UUID de campanha vazio', () => {
  const html = renderToStaticMarkup(createElement(NpcCatalogue))
  expect(html).toContain('Ordenar NPCs')
  expect(html).toContain('Mesa de teste')
  expect(html).toContain('Em sessão ativa')
  const url = mocks.urls.find(url => url.includes('sort='))!
  expect(new URL(url, 'http://localhost').searchParams.has('campaignId')).toBe(false)
})
it('catálogo contextual fixa a campanha fornecida', () => {
  const html = renderToStaticMarkup(createElement(NpcCatalogue, { campaignId: mocks.campaignId }))
  expect(html).not.toContain('Todas as minhas mesas')
  const url = mocks.urls.find(url => url.includes('sort='))!
  expect(new URL(url, 'http://localhost').searchParams.get('campaignId')).toBe(mocks.campaignId)
})
it('notas começam pelas atualizações recentes e preservam o filtro de arquivados', () => {
  const html = renderToStaticMarkup(createElement(SheetNarrativeTabs, { campaignId: mocks.campaignId, subjectType: 'NPC', subjectId: 'npc-1' }))
  expect(html).toContain('Mais antigos primeiro')
  expect(html.indexOf('Registro recente')).toBeLessThan(html.indexOf('Registro antigo'))
  expect(html).not.toContain('Registro arquivado')
})
