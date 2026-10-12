import { describe, expect, it } from 'vitest'
import { GHOUL_TEMPLATE, HUMAN_NPC_TEMPLATES } from '../lib/vtm-v5/presets'
import { canTransitionCharacterStatus, validateCharacter } from '../lib/vtm-v5/validation'
import type { CharacterRulesInput } from '../lib/vtm-v5/types'

function validVampire(overrides: Partial<CharacterRulesInput> = {}): CharacterRulesInput {
  return {
    characterType: 'PLAYER_VAMPIRE', creationType: 'FLEDGLING', clan: 'Toreador', isCaitiff: false, isThinBlood: false,
    generation: 13, bloodPotency: 1, humanity: 7,
    attributes: { forca: 4, destreza: 3, vigor: 3, carisma: 3, manipulacao: 2, compostura: 2, inteligencia: 2, raciocinio: 2, determinacao: 1 },
    skills: {}, convictions: [{ text: 'Proteger os inocentes', touchstone: 'Helena' }],
    disciplines: [{ name: 'Presença', level: 2, powers: [{ name: 'Fascínio' }, { name: 'Assombro' }] }, { name: 'Rapidez', level: 1, powers: [{ name: 'Reflexos rápidos' }] }],
    predatorType: 'Siren', advantages: ['Recursos', 'Aliados'], flaws: ['Inimigo', 'Segredo sombrio'], ...overrides,
  }
}

describe('regras de criação VtM V5', () => {
  it('aceita a distribuição padrão e calcula atributos secundários', () => {
    const report = validateCharacter(validVampire())
    expect(report.valid).toBe(true)
    expect(report.derived).toMatchObject({ health: 6, willpower: 3, initialXp: 0 })
  })

  it('rejeita atributos fora da distribuição e touchstone compartilhado', () => {
    const report = validateCharacter(validVampire({ attributes: { forca: 5 }, convictions: [{ text: 'A', touchstone: 'Helena' }, { text: 'B', touchstone: 'Helena' }] }))
    expect(report.errors.map((entry) => entry.code)).toEqual(expect.arrayContaining(['ATTRIBUTES_INVALID_DISTRIBUTION', 'ATTRIBUTES_OUT_OF_RANGE', 'TOUCHSTONE_NOT_UNIQUE']))
  })

  it('valida perfil rápido de habilidades e poderes por ponto de disciplina', () => {
    const skills = Object.fromEntries([3, ...Array(8).fill(2), ...Array(10).fill(1)].map((value, index) => [`skill-${index}`, value]))
    expect(validateCharacter(validVampire({ skillMode: 'JACK_OF_ALL_TRADES', skills })).valid).toBe(true)
    const invalid = validateCharacter(validVampire({ disciplines: [{ name: 'Presença', level: 3, powers: [{ name: 'Fascínio' }] }] }))
    expect(invalid.errors.map((entry) => entry.code)).toContain('DISCIPLINE_POWER_REQUIRED')
  })

  it('aplica restrições de predador e thin-blood', () => {
    expect(validateCharacter(validVampire({ clan: 'Ventrue', predatorType: 'Bagger' })).errors.map((entry) => entry.code)).toContain('PREDATOR_BAGGER_VENTRUE')
    expect(validateCharacter(validVampire({ creationType: 'THIN_BLOOD', isThinBlood: true, advantages: ['Retainers'] })).errors.map((entry) => entry.code)).toContain('THIN_BLOOD_ADVANTAGE_RESTRICTED')
  })

  it('valida PNC simples, ghoul e Blood Bond', () => {
    const npc = validateCharacter(validVampire({ characterType: 'HUMAN_NPC', npc: { mode: 'SIMPLE', difficulty: 6 } }))
    expect(npc.errors.map((entry) => entry.code)).toContain('NPC_DIFFICULTY_INVALID')
    const ghoul = validateCharacter(validVampire({ characterType: 'RETAINER', retainer: { isGhoul: true, controlMethod: 'VITAE', activeRegnantIds: ['a', 'b'], bondStrength: 7 } }))
    expect(ghoul.errors.map((entry) => entry.code)).toEqual(expect.arrayContaining(['GHOUL_VITAE_SOURCE_REQUIRED', 'MULTIPLE_ACTIVE_REGNANTS', 'BOND_STRENGTH_INVALID']))
    expect(GHOUL_TEMPLATE.disciplineLevel).toBe(1)
    expect(HUMAN_NPC_TEMPLATES.GANGSTER.physicalPool).toBe(4)
  })

  it('controla transições de status e permissões', () => {
    expect(canTransitionCharacterStatus('DRAFT', 'PENDING_REVIEW', false, true)).toBe(true)
    expect(canTransitionCharacterStatus('DRAFT', 'PENDING_REVIEW', false, false)).toBe(false)
    expect(canTransitionCharacterStatus('PENDING_REVIEW', 'APPROVED', true, true)).toBe(true)
    expect(canTransitionCharacterStatus('PENDING_REVIEW', 'APPROVED', false, true)).toBe(false)
  })
})
