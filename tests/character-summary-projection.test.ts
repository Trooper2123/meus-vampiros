import { beforeEach, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
const get = vi.hoisted(() => vi.fn())
vi.mock('@/lib/characters', () => ({ getCharacterForViewer: get }))
vi.mock('@/lib/campaigns', () => ({ getCampaignById: vi.fn() }))
import { getCharacterSummaryData } from '@/lib/character-summary'
import { CharacterSummary } from '@/components/character-summary/character-summary'
beforeEach(() => get.mockResolvedValue({ id: 'id', characterType: 'PLAYER_VAMPIRE', name: 'Helena', campaignId: null, data: { forca: 3, 'habilidade-armas-brancas': 3, 'habilidade-academicos': 2, 'convicoes-pilar-1': 'Ana', 'convicoes-crenca-1': 'Proteger os mortais', vantagens: [{ name: 'Aliados', level: 2 }], defeitos: [{ name: 'Inimigo', level: 1 }], masterNotes: 'Segredo' } }))
it('projeta habilidades canônicas e convicções, com pontos e vantagens/defeitos no resumo', async () => {
  const data = (await getCharacterSummaryData('id', 'master'))!
  expect(data.skills).toMatchObject({ 'Armas brancas': 3, 'Erudição': 2 })
  const html = renderToStaticMarkup(createElement(CharacterSummary, { data }))
  expect(html.indexOf('Pilares e convicções')).toBeLessThan(html.indexOf('Atributos'))
  for (const text of ['Ana', 'Proteger os mortais', 'Armas brancas', '3 de 5', 'Aliados', 'Inimigo']) expect(html).toContain(text)
  expect(html).not.toContain('Segredo')
  expect(html).not.toContain('Evolução')
})
it('não retorna projeção sem acesso', async () => {
  get.mockResolvedValue(null)
  expect(await getCharacterSummaryData('id', 'outsider')).toBeNull()
})
