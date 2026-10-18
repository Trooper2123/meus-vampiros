import { describe, expect, it } from 'vitest'
import { CLANS, validateClanSelection, type ClanSelection } from '@/lib/vtm-v5/clans'
import { predatorMechanics, resolvePredatorChoices } from '@/lib/vtm-v5/predator-types/mechanics'
import { PREDATOR_TYPE_CODES } from '@/lib/vtm-v5/predator-types/types'
import { PREDATOR_TYPES, validatePredatorType } from '@/lib/vtm-v5/predator-types'
import { SPECIALTY_SKILL_NAMES } from '@/lib/vtm-v5/skills'
import { applyPredatorEffects } from '@/lib/predator-effects'
import type { CommandCharacter } from '@/lib/character-commands'

describe('clãs da referência local V5', () => {
  it.each(CLANS.filter(clan => !['CAITIFF', 'THIN_BLOOD'].includes(clan.code)))('valida o pacote 2+1 de $name', clan => {
    const disciplines: readonly string[] = clan.disciplines
    const selection = { code: clan.code, disciplineDots: { [disciplines[0]]: 2, [disciplines[1]]: 1 }, feedingPreference: 'Adultos', afflictionCategory: 'MENTAL' } as ClanSelection
    expect(validateClanSelection(selection).code).toBe(clan.code)
    expect(() => validateClanSelection({ ...selection, disciplineDots: { Animalismo: 3 } })).toThrow()
  })
  it('rejeita coerção de pontos e clãs incompletos', () => {
    expect(() => validateClanSelection({ code: 'BRUJAH', disciplineDots: { Rapidez: '2', Potência: '1' } } as unknown as ClanSelection)).toThrow()
    expect(() => validateClanSelection({ code: 'LASOMBRA', disciplineDots: {} } as unknown as ClanSelection)).toThrow()
  })
  it('exige preferências e categoria específicas', () => {
    expect(() => validateClanSelection({ code: 'VENTRUE', disciplineDots: { Dominação: 2, Fortitude: 1 } })).toThrow()
    expect(() => validateClanSelection({ code: 'MALKAVIAN', disciplineDots: { Auspícios: 2, Dominação: 1 } })).toThrow()
  })
  it('valida as exceções Caitiff e sangue-ralo', () => {
    expect(validateClanSelection({ code: 'CAITIFF', caitiffDisciplines: ['Animalismo', 'Fortitude', 'Presença'], disciplineDots: { Fortitude: 2, Presença: 1 } }).code).toBe('CAITIFF')
    expect(() => validateClanSelection({ code: 'CAITIFF', caitiffDisciplines: ['Animalismo', 'Animalismo', 'Fortitude'], disciplineDots: { Fortitude: 2, Animalismo: 1 } })).toThrow()
    expect(validateClanSelection({ code: 'THIN_BLOOD', disciplineDots: {} }).code).toBe('THIN_BLOOD')
    expect(() => validateClanSelection({ code: 'THIN_BLOOD', disciplineDots: { Fortitude: 1 } })).toThrow()
  })
})

describe('escolhas mecânicas de predação', () => {
  it.each(PREDATOR_TYPES)('materializa e reverte $code sem alterar XP ou danos', definition => {
    const optionCodes = (definition.choiceGroups ?? []).map(group => `${group.code}:${group.options[0].code}:${group.totalDots}`)
    const character: CommandCharacter = { id: 'fixture', name: 'Fixture', ownerId: 'player', campaignId: null, masterId: null, characterType: 'PLAYER_VAMPIRE', status: 'DRAFT', revision: 0, totalXp: 10, spentXp: 3, data: { cla: 'Tremere', predatorTypeSelection: { code: definition.code, specialty: definition.specialtyOptions[0], discipline: definition.disciplineOptions[0], optionCodes }, ...Object.fromEntries(Object.keys(SPECIALTY_SKILL_NAMES).map(skill => [`habilidade-${skill}`, 5])) }, gameState: { healthDamage: { superficial: 2, aggravated: 1 } } }
    applyPredatorEffects(character)
    expect(character.data.disciplinas).toEqual([expect.objectContaining({ level: 1 })])
    expect(character.gameState.specialties).toHaveLength(1)
    applyPredatorEffects(character)
    expect(character.data.disciplinas).toEqual([expect.objectContaining({ level: 1 })])
    delete character.data.predatorTypeSelection
    applyPredatorEffects(character)
    expect(character.data.disciplinas).toEqual([])
    expect(character.data.creationAdvantageDots).toBe(0)
    expect(character.data.creationFlawDots).toBe(0)
    expect(character.gameState.specialties).toEqual([])
    expect(character.spentXp).toBe(3)
    expect(character.gameState.healthDamage).toEqual({ superficial: 2, aggravated: 1 })
  })
  it('exige exceção explícita do Narrador para sangue-ralo', () => {
    const definition = PREDATOR_TYPES[0]
    const input = { clan: null, bloodPotency: 0, isThinBlood: true, enabled: true }
    expect(validatePredatorType(definition, input).valid).toBe(false)
    expect(validatePredatorType(definition, { ...input, overrides: [{ ruleCode: 'THIN_BLOOD_PREDATOR_REVIEW', justification: 'Exceção da mesa', createdByUserId: 'narrator', createdAt: new Date().toISOString() }] }).valid).toBe(true)
  })
  it.each(PREDATOR_TYPE_CODES)('possui mecânica e escolhas válidas para %s', code => {
    const mechanics = predatorMechanics(code)
    const values = mechanics.choiceGroups.map(group => `${group.code}:${group.options[0].code}:${group.totalDots}`)
    expect(resolvePredatorChoices(code, values)).toHaveLength(mechanics.choiceGroups.length)
    expect(() => resolvePredatorChoices(code, ['FORGED:OPTION:1'])).toThrow()
  })
  it('valida distribuição, duplicidade e obrigatoriedade', () => {
    expect(resolvePredatorChoices('OSIRIS', ['FOLLOWERS:FAME:1', 'FOLLOWERS:HERD:2', 'COSTS:ENEMIES:2'])).toHaveLength(3)
    expect(() => resolvePredatorChoices('OSIRIS', [])).toThrow()
    expect(() => resolvePredatorChoices('OSIRIS', ['FOLLOWERS:FAME:1', 'FOLLOWERS:FAME:2', 'COSTS:ENEMIES:2'])).toThrow()
    expect(() => resolvePredatorChoices('BLOOD_LEECH', ['SECRET:SHUNNED:1'])).toThrow()
  })
})
