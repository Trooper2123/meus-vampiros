import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { applyPredatorEffects } from '@/lib/predator-effects'
import type { CommandCharacter } from '@/lib/character-commands'
import { applyPredatorTypeSelection, normalizePredatorType, PREDATOR_TYPE_BY_CODE, PREDATOR_TYPES, removePredatorTypeSelection, toPlayerPredatorTypeDto, validatePredatorChoices, validatePredatorType } from '@/lib/vtm-v5/predator-types'
import { resolvePredatorChoices } from '@/lib/vtm-v5/predator-types/mechanics'
import { normalizeSpecialtySkillId } from '@/lib/vtm-v5/specialties'
import { SPECIALTY_SKILL_NAMES } from '@/lib/vtm-v5/skills'
import { normalizeCharacterRulesInput } from '@/lib/vtm-v5/normalize'
import { validateCharacter } from '@/lib/vtm-v5/validation'

const definition = (code: Parameters<typeof PREDATOR_TYPE_BY_CODE.get>[0]) => PREDATOR_TYPE_BY_CODE.get(code)!
const context = { clan: 'Toreador', bloodPotency: 1, isThinBlood: false, enabled: true }

describe('suplementos de predação do documento fornecido', () => {
  it('cadastra os 30 IDs da tabela e a variante, sem duplicar reimpressões', () => {
    const document = readFileSync('docs/regras/novos-tipos-predacao-vtm-v5.md', 'utf8')
    const ids = [...document.matchAll(/^\| `([^`]+)` — \*\*/gmu)].map(match => match[1].toUpperCase())
    expect(ids).toHaveLength(30)
    for (const id of ids) expect(PREDATOR_TYPES.find(entry => entry.code === id)).toMatchObject({ sourceReference: expect.any(String), rulesText: expect.any(String), enabledByDefault: false })
    expect(PREDATOR_TYPES.filter(entry => entry.code === 'ROADSIDE_KILLER')).toHaveLength(1)
    expect(definition('BAGGER_COTBG_OBLIVION').baseCode).toBe('BAGGER')
  })

  it.each(PREDATOR_TYPES)('reconhece nome original, código e habilidades de $code', entry => {
    if (entry.originalName) expect(normalizePredatorType(entry.originalName)).toBe(entry.code)
    for (const specialty of entry.specialtyOptions) expect(SPECIALTY_SKILL_NAMES).toHaveProperty(normalizeSpecialtySkillId(specialty.split('(')[0]))
  })

  it('não inventa pontos fixos e preserva bloqueios de regras incompletas mesmo com override forjado', () => {
    const roadside = definition('ROADSIDE_KILLER')
    expect(roadside.flawsOrCosts).toEqual([])
    expect(roadside.availabilityBlocker).toBeUndefined()
    expect(roadside.choiceGroups).toContainEqual(expect.objectContaining({ mode: 'PLAYER_DEFINED' }))
    for (const entry of PREDATOR_TYPES.filter(item => item.availabilityBlocker)) {
      expect(validatePredatorType(entry, { ...context, overrides: [{ ruleCode: 'PREDATOR_RULESET_UNSUPPORTED', justification: 'forjado', createdByUserId: 'owner', createdAt: '' }] }).issues).toContainEqual(expect.objectContaining({ code: 'PREDATOR_RULESET_UNSUPPORTED', blocking: true }))
    }
  })

  it('exige Ancilla para tributos e escolha exclusiva de Domínio ou Status', () => {
    const entry = definition('TITHE_COLLECTOR')
    expect(validatePredatorType(entry, context).valid).toBe(false)
    expect(validatePredatorType(entry, { ...context, creationType: 'ANCILLA' }).valid).toBe(true)
    expect(resolvePredatorChoices(entry.code, ['TRIBUTE:DOMAIN:3'])).toEqual([expect.objectContaining({ label: 'Domínio', dots: 3 })])
    expect(() => resolvePredatorChoices(entry.code, ['TRIBUTE:DOMAIN:1', 'TRIBUTE:STATUS:2'])).toThrow()
  })

  it.each([
    ['BAGGER_COTBG_OBLIVION', 'Ventrue', 'PREDATOR_BAGGER_VENTRUE'],
    ['TITHE_COLLECTOR', 'Toreador', 'PREDATOR_ANCILLA_REQUIRED'],
    ['SABBAT_RIPPER', 'Toreador', 'PREDATOR_RULESET_UNSUPPORTED'],
  ])('validação final também bloqueia %s para %s', (code, clan, issueCode) => {
    const rules = normalizeCharacterRulesInput({ characterType: 'PLAYER_VAMPIRE', creationType: 'NEONATE', predatorTypeCode: code, cla: clan })
    expect(validateCharacter(rules).errors.map(error => error.code)).toContain(issueCode)
  })

  it('exige distribuição completa dos três pontos de Extorsionista', () => {
    const entry = definition('EXTORTIONIST')
    expect(validatePredatorChoices(entry, entry.specialtyOptions[0], 'Dominação', ['PROTECTION:CONTACTS:1', 'PROTECTION:RESOURCES:2'])).toEqual([])
    expect(validatePredatorChoices(entry, entry.specialtyOptions[0], 'Dominação', ['PROTECTION:CONTACTS:1'])).not.toEqual([])
    expect(() => resolvePredatorChoices(entry.code, ['PROTECTION:CONTACTS:3', 'FORGED:XP:3'])).toThrow()
  })

  it('preserva separação dos modos de Ladrão de Túmulos e a parada atípica de Lobo', () => {
    expect(definition('GRAVEROBBER').predatorRoll).toContain('Determinação + Medicina (cadáveres); Manipulação + Sagacidade (mortais vivos)')
    expect(definition('GRAVEROBBER').flawsOrCosts[0].label).toContain('defeito de Rebanho')
    expect(definition('WOLF_IN_SHEEPS_CLOTHING').predatorRoll).toContain('Fortitude + Armas brancas')
  })

  it('classifica Remorso, Habitante do Memoriam e Subestimado como benefícios', () => {
    expect(definition('CONFIDANT').bonusOptions.map(option => option.label)).toEqual(['Presença de Apoio', 'Remorso', 'Habitante do Memoriam'])
    expect(definition('CONFIDANT').flawsOrCosts.map(option => option.label)).toEqual(['Lealdades Conflitantes'])
    expect(definition('WOLF_IN_SHEEPS_CLOTHING').bonusOptions).toContainEqual(expect.objectContaining({ label: 'Subestimado', dots: 1 }))
    for (const code of ['STREET_FEEDER', 'WATCHER_FROM_THE_WATER'] as const) expect(definition(code).flawsOrCosts.reduce((total, option) => total + (option.dots ?? 0), 0)).toBe(1)
  })

  it('variante de Bagger preserva restrições e troca o pacote sem duplicar concessões', () => {
    const base = definition('BAGGER')
    const variant = definition('BAGGER_COTBG_OBLIVION')
    expect(variant.disciplineOptions).toEqual(['Oblívio', 'Ofuscação'])
    expect(variant.bonusOptions).toEqual(base.bonusOptions)
    expect(variant.flawsOrCosts).toEqual(base.flawsOrCosts)
    expect(validatePredatorType(variant, { ...context, clan: 'Ventrue' }).valid).toBe(false)
    expect(validatePredatorType(variant, { ...context, clan: 'Toreador' }).valid).toBe(true)
    const character: CommandCharacter = { id: 'fixture', name: 'Vampiro', totalXp: 0, ownerId: 'owner', campaignId: null, masterId: null, status: 'DRAFT', characterType: 'PLAYER_VAMPIRE', revision: 0, spentXp: 0, data: { cla: 'Toreador', humanidade: 7, disciplinas: [], 'habilidade-manha': 1 }, gameState: {} }
    for (const entry of [base, variant, variant]) {
      const applied = applyPredatorTypeSelection(character.data, entry, { code: entry.code, specialty: 'Manha (Mercado negro)', discipline: entry.disciplineOptions[0], optionCodes: [] })
      // Bagger básico usa Ofuscação fora de Tremere; variante permite Oblívio sem exclusividade.
      if (entry.code === 'BAGGER') applied.data.predatorTypeSelection.discipline = 'Ofuscação'
      character.data = applied.data
      applyPredatorEffects(character)
      expect(character.data.disciplinas).toEqual([expect.objectContaining({ level: 1 })])
      expect(character.data.creationAdvantageDots).toBe(3)
      expect(character.data.creationFlawDots).toBe(2)
    }
    character.data = removePredatorTypeSelection(character.data)
    applyPredatorEffects(character)
    expect(character.data.disciplinas).toEqual([])
    expect(character.data.creationAdvantageDots).toBe(0)
    expect(character.data.creationFlawDots).toBe(0)
  })

  it('DTO de suplementos oferece fonte e regras públicas sem notas privadas', () => {
    for (const entry of PREDATOR_TYPES.filter(item => item.source !== 'COREBOOK')) {
      const dto = toPlayerPredatorTypeDto(entry)
      expect(dto.sourceReference).toBeTruthy()
      expect(dto.rulesText).toBeTruthy()
      for (const field of ['commonRisks', 'validationNotes', 'relationshipRequirements', 'availabilityBlocker']) expect(dto).not.toHaveProperty(field)
    }
  })
})
