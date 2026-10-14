import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { SummaryMerits } from '@/components/character-summary/summary-merits'
import { SummaryDisciplines } from '@/components/character-summary/summary-disciplines'
import { SummaryHeader } from '@/components/character-summary/summary-header'
import { hasSummaryName } from '@/lib/vtm-v5/summary'

it.each([undefined, null, '', '  ', 'Sem nome', ' SEM NOME ', 'Personagem sem nome', 123, false, {}])('não considera placeholder %j preenchido', name => {
  expect(hasSummaryName(name)).toBe(false)
})
it('oculta vantagens/defeitos vazios sem apagar dados e conserva nome/descrição', () => {
  const merits = [{ name: '', level: 3 }, { name: 'Sem nome', level: 2 }, { name: 'Recursos', level: 2 }, { name: 'Contato narrativo', description: 'Descrição preenchida' }]
  const previous = structuredClone(merits)
  const html = renderToStaticMarkup(createElement(SummaryMerits, { merits, flaws: [{ name: '  ' }] }))
  expect(html).toContain('Recursos'); expect(html).toContain('Descrição preenchida')
  expect(html).not.toContain('Sem nome'); expect(html).not.toContain('Nível 0')
  expect(html).not.toContain('>Defeitos<'); expect(merits).toEqual(previous)
  expect(renderToStaticMarkup(createElement(SummaryMerits, { merits: [{ name: '' }], flaws: [] }))).toBe('')
})
it('oculta disciplinas/poderes sem nome e textos de ausência, preservando disciplina preenchida', () => {
  const html = renderToStaticMarkup(createElement(SummaryDisciplines, { disciplines: [
    { id: 'blank', name: '', level: 2, powers: [] },
    { id: 'manual', name: 'Presença', level: 2, powers: [{ name: 'Sem nome' }, { name: 'Fascínio', effect: 'Efeito preenchido' }] },
    { id: 'unfinished', name: 'Rapidez', level: 1, powers: [] },
  ] }))
  expect(html).toContain('Presença'); expect(html).toContain('Fascínio'); expect(html).toContain('Rapidez')
  expect(html).not.toContain('Sem nome'); expect(html).not.toContain('Nenhum poder')
  expect(renderToStaticMarkup(createElement(SummaryDisciplines, { disciplines: [{ id: 'empty', name: ' ', level: 1, powers: [] }] }))).toBe('')
})
it('não exibe campos textuais vazios no cabeçalho', () => {
  const html = renderToStaticMarkup(createElement(SummaryHeader, { name: 'Personagem sem nome', clan: ' ', predator: null, generation: '', campaignName: null, campaignTheme: null }))
  expect(html).toContain('Resumo da ficha'); expect(html).not.toContain('Personagem sem nome')
  expect(html).not.toContain('>Clã<'); expect(html).not.toContain('>Geração<')
})
