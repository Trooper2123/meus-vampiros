import { describe, expect, it } from 'vitest'
import { applyPredatorTypeSelection, normalizePredatorType, PREDATOR_TYPE_BY_CODE, PREDATOR_TYPES, toPlayerPredatorTypeDto, validatePredatorChoices, validatePredatorType } from '@/lib/vtm-v5/predator-types'

describe('catálogo de tipos de predação', () => {
  it('possui 40 tipos e uma variante com códigos únicos', () => {
    expect(PREDATOR_TYPES.filter((entry) => entry.source === 'COREBOOK')).toHaveLength(10)
    expect(PREDATOR_TYPES.filter((entry) => entry.source === 'PLAYERS_GUIDE')).toHaveLength(18)
    expect(new Set(PREDATOR_TYPES.map((entry) => entry.code)).size).toBe(41)
    expect(PREDATOR_TYPES.filter(entry => entry.source === 'PUBLICATIONS')).toHaveLength(2)
    expect(PREDATOR_TYPES.filter(entry => entry.source === 'COTBG_BACKER')).toHaveLength(3)
    expect(PREDATOR_TYPES.filter(entry => entry.source === 'SABBAT_ALTERNATIVE')).toHaveLength(8)
    expect(PREDATOR_TYPES.filter((entry) => entry.source === 'PLAYERS_GUIDE').every((entry) => entry.optional && !entry.enabledByDefault)).toBe(true)
  })

  it.each(PREDATOR_TYPES)('normaliza $name e seu código', (definition) => {
    expect(normalizePredatorType(definition.name.toLocaleLowerCase('pt-BR'))).toBe(definition.code)
    expect(normalizePredatorType(definition.code)).toBe(definition.code)
  })

  it('não inclui dados privados na projeção do jogador', () => {
    const dto = toPlayerPredatorTypeDto(PREDATOR_TYPE_BY_CODE.get('SIREN')!)
    expect(Object.keys(dto).sort()).toEqual(['aliases', 'choiceGroups', 'code', 'disciplineOptions', 'feedingStyle', 'name', 'predatorRoll', 'publicWarnings', 'selectable', 'source', 'specialtyOptions', 'summary'])
    expect(dto).not.toHaveProperty('commonRisks')
    expect(dto).not.toHaveProperty('validationNotes')
  })
})

describe('motor de tipos de predação', () => {
  it('bloqueia Bagger para Ventrue e Farmer para Potência de Sangue 3+', () => {
    expect(validatePredatorType(PREDATOR_TYPE_BY_CODE.get('BAGGER')!, { clan: 'Ventrue', bloodPotency: 1, isThinBlood: false, enabled: true }).valid).toBe(false)
    expect(validatePredatorType(PREDATOR_TYPE_BY_CODE.get('FARMER')!, { clan: 'Toreador', bloodPotency: 3, isThinBlood: false, enabled: true }).valid).toBe(false)
  })

  it('exige escolhas explícitas e aplica modificadores sem duplicação', () => {
    const definition = PREDATOR_TYPE_BY_CODE.get('ALLEYCAT')!
    expect(validatePredatorChoices(definition, '', '', [])).toHaveLength(2)
    const selection = { code: definition.code, specialty: definition.specialtyOptions[0], discipline: definition.disciplineOptions[0], optionCodes: definition.bonusOptions.map((entry) => entry.code) }
    const first = applyPredatorTypeSelection({ humanidade: 7, 'potencia-de-sangue': 1 }, definition, selection)
    const second = applyPredatorTypeSelection(first.data, definition, selection)
    expect(first.data.humanidade).toBe(6)
    expect(second.data.humanidade).toBe(6)
    expect(second.changed).toBe(false)
  })

  it('produz pendências estruturadas', () => {
    const report = validatePredatorType(PREDATOR_TYPE_BY_CODE.get('CLEAVER')!, { clan: 'Toreador', bloodPotency: 1, isThinBlood: false, enabled: true })
    expect(report.relationshipRequirements.map((entry) => entry.kind)).toContain('FAMILY')
  })
})
