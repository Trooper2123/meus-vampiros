import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { SWRConfig } from 'swr'
import { expect, it } from 'vitest'
import { CLANS, publicClan, characterClan } from '@/lib/vtm-v5/clans'
import { CLAN_RULES } from '@/lib/vtm-v5/clan-rules'
import { RULE_SOURCES, publicRuleSource } from '@/lib/vtm-v5/rule-profile'
import { CharacterClan, CharacterClanSummary } from '@/components/character-summary/character-clan'
import { CampaignClans } from '@/components/character-summary/campaign-clans'

const references = [
  ['BANU_HAQIM', 'Judgment', 3, 'CLAN-BANU-HAQIM', '167–168', 168],
  ['HECATA', 'Morbidity', 3, 'CLAN-HECATA', '202–203', 203],
  ['LASOMBRA', 'Ruthlessness', 2, 'CLAN-LASOMBRA', '292', 293],
  ['MINISTRY', 'Transgression', 2, 'CLAN-MINISTRY', '184–185', 185],
  ['RAVNOS', 'Tempting Fate', 2, 'CLAN-RAVNOS', '9', 9],
  ['SALUBRI', 'Affective Empathy', 2, 'CLAN-SALUBRI', '15', 15],
  ['TZIMISCE', 'Covetousness', 2, 'CLAN-TZIMISCE', '18–19', 18],
] as const

it.each(references)('completa %s com mecânicas e edição/páginas verificadas localmente', (code, originalName, dicePenalty, sourceId, printed, pdf) => {
  const clan = CLANS.find(entry => entry.code === code)!
  expect(clan.originalName?.length).toBeGreaterThan(3)
  expect(clan.description?.length).toBeGreaterThan(60)
  expect(clan.disciplineIds).toHaveLength(3)
  expect(clan.compulsionRule).toMatchObject({ originalName, sourceId, mechanics: { dicePenalty } })
  for (const rule of [clan.baneRule!, clan.compulsionRule!]) {
    expect(rule.name.trim().length).toBeGreaterThan(3)
    expect(rule.originalName.trim().length).toBeGreaterThan(3)
    expect(rule.description.length).toBeGreaterThan(60)
    expect(rule.mechanics.rules.length).toBeGreaterThan(0)
    expect(rule.section.length).toBeGreaterThan(3)
    expect(JSON.stringify(rule)).not.toMatch(/consultar a referência|placeholder/iu)
  }
  expect(clan.bane).toBe(clan.baneRule!.description)
  expect(clan.compulsion).toBe(clan.compulsionRule!.description)
  expect(publicRuleSource(sourceId)).toMatchObject({ printed, pdf, available: false })
  expect(publicRuleSource(sourceId)).not.toHaveProperty('file')
  expect(existsSync(join(process.cwd(), 'docs/books', RULE_SOURCES[sourceId].file))).toBe(true)
  expect(publicClan(clan)).not.toHaveProperty('guidance')
})

it('preserva as fórmulas específicas de alimentação, sol e repouso sem confundir dano e sucesso', () => {
  expect(CLAN_RULES.BANU_HAQIM!.baneRule.mechanics.difficultyBase).toBe(2)
  expect(CLAN_RULES.HECATA!.baneRule.mechanics.rules.join(' ')).toContain('frenesi de terror, dificuldade 3')
  expect(CLAN_RULES.SALUBRI!.baneRule.mechanics.rules.join(' ')).toContain('para Banu Haqim, 3 +')
  expect(CLAN_RULES.SALUBRI!.baneRule.mechanics.rules.join(' ')).toContain('Fome 4 ou mais')
  expect(CLAN_RULES.MINISTRY!.baneRule.mechanics.aggravatedDamage).toEqual({ track: 'HEALTH', amount: 'SUNLIGHT_PLUS_BANE_SEVERITY' })
  expect(CLAN_RULES.RAVNOS!.baneRule.mechanics.aggravatedDamage).toEqual({ track: 'HEALTH', amount: 'TENS_ON_BANE_DICE' })
  expect(CLAN_RULES.RAVNOS!.baneRule.mechanics.rules.join(' ')).toContain('últimas 7 noites')
  expect(CLAN_RULES.TZIMISCE!.baneRule.mechanics.aggravatedDamage).toEqual({ track: 'WILLPOWER', amount: 'BANE_SEVERITY' })
  expect(CLAN_RULES.LASOMBRA!.compulsionRule.mechanics.rules.join(' ')).toContain('Não acumular')
})

it('mantém clãs anteriores, aliases legados e versão do catálogo sem placeholders', () => {
  expect(CLANS).toHaveLength(16)
  expect(new Set(CLANS.map(clan => clan.code)).size).toBe(CLANS.length)
  expect(characterClan({ cla: ' Ministério ' })?.code).toBe('MINISTRY')
  expect(characterClan({ clanCode: 'LASOMBRA', cla: 'Brujah' })?.code).toBe('LASOMBRA')
  expect(CLANS.find(clan => clan.code === 'BRUJAH')).toMatchObject({ version: 1 })
  expect(JSON.stringify(CLANS)).not.toContain('Consultar a referência de regras da crônica')
})

const wrap = (fallback: Record<string, unknown>, child: ReturnType<typeof createElement>) => renderToStaticMarkup(createElement(SWRConfig, { value: { provider: () => new Map(), revalidateOnMount: false, fallback } }, child))

it('usa o mesmo catálogo na criação e apresenta todos os sete clãs ao jogador', () => {
  const html = renderToStaticMarkup(createElement(CharacterClan, { characterId: null, onBeforeSubmit: async () => null, onChange: () => {} }))
  for (const [code] of references) expect(html).toContain(CLANS.find(clan => clan.code === code)!.bane)
  expect(html).not.toContain('Consultar a referência')
  expect(html).not.toContain('Revise os gatilhos')
})

it.each(references)('mostra regras e referências autenticadas de %s na ficha e na campanha', (code, _name, _penalty, sourceId) => {
  const clan = publicClan(CLANS.find(entry => entry.code === code)!)
  const summary = wrap({ '/api/characters/fixture/clan': { revision: 0, selection: { code }, clans: [clan], conditionOptions: ['COMPULSION_PENALTY'], conditions: [], canManageConditions: false } }, createElement(CharacterClanSummary, { characterId: 'fixture' }))
  const campaign = wrap({ '/api/campaigns/fixture/clans': { clans: [clan] } }, createElement(CampaignClans, { campaignId: 'fixture' }))
  for (const html of [summary, campaign]) {
    expect(html).toContain('arquivo não disponível nesta etapa')
    expect(html).not.toContain('/api/rule-sources/')
    expect(html).toContain(clan.compulsionRule!.originalName)
    expect(html).not.toContain('Revise os gatilhos')
    expect(html).not.toContain('Consultar a referência')
  }
  expect(summary).not.toContain('type="checkbox"')
})
