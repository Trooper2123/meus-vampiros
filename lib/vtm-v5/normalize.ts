import type { DisciplineAcquisition } from './discipline-access'
import { CHARACTER_TYPES, CREATION_TYPES, type CharacterRulesInput, type CharacterType, type CreationType, type DisciplineInput } from './types'
import { normalizePredatorType } from './predator-types'
import { characterText } from './text'
import { manualSkillValues, type CreationGrant } from './creation-grants'

const numberOrNull = (value: unknown) => {
  const parsed = Number(value)
  return value === '' || value === null || value === undefined || !Number.isFinite(parsed) ? null : parsed
}
const stringArray = (value: unknown) => Array.isArray(value) ? value.map(characterText).filter(Boolean) : []
const traitDots = (value: unknown) => Array.isArray(value) ? value.reduce((total, item) => {
  if (!item || typeof item !== 'object') return total
  return total + Math.max(0, Number((item as Record<string, unknown>).level) || 0)
}, 0) : 0

export function normalizeCharacterRulesInput(data: Record<string, unknown>, creationGrants: readonly CreationGrant[] = [], acquisitions: readonly DisciplineAcquisition[] = []): CharacterRulesInput {
  const characterType = CHARACTER_TYPES.includes(data.characterType as CharacterType) ? data.characterType as CharacterType : 'PLAYER_VAMPIRE'
  const creationType = CREATION_TYPES.includes(data.creationType as CreationType) ? data.creationType as CreationType : 'FLEDGLING'
  const attributeKeys = ['forca', 'destreza', 'vigor', 'carisma', 'manipulacao', 'compostura', 'inteligencia', 'raciocinio', 'determinacao']
  const attributes = Object.fromEntries(attributeKeys.map((key) => [key, Number(data[key] ?? 0)]))
  const skills = Object.fromEntries(Object.entries(data).filter(([key]) => key.startsWith('habilidade-')).map(([key, value]) => [key.slice(11), Number(value ?? 0)]))
  const disciplines = (Array.isArray(data.disciplinas) ? data.disciplinas : []).map((entry): DisciplineInput => {
    const discipline = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {}
    return { name: characterText(discipline.name), level: Number(discipline.level ?? 0), powers: Array.isArray(discipline.powers) ? discipline.powers as DisciplineInput['powers'] : [] }
  })
  const convictions = [1, 2, 3].map((index) => ({ text: characterText(data[`convicoes-crenca-${index}`]), touchstone: characterText(data[`convicoes-pilar-${index}`]) }))
  const clan = characterText(data.cla).trim() || null

  return {
    characterType,
    creationType,
    clan,
    isCaitiff: Boolean(data.isCaitiff) || clan?.toLocaleLowerCase('pt-BR') === 'caitiff',
    isThinBlood: Boolean(data.isThinBlood) || creationType === 'THIN_BLOOD',
    generation: numberOrNull(data.geracao),
    bloodPotency: numberOrNull(data['potencia-de-sangue']),
    humanity: numberOrNull(data.humanidade),
    attributes,
    skills: manualSkillValues(skills, creationGrants),
    skillMode: typeof data.skillMode === 'string' ? data.skillMode as CharacterRulesInput['skillMode'] : undefined,
    convictions,
    disciplines,
    disciplineXpDots: acquisitions.filter(entry => entry.source === 'XP').length,
    predatorDisciplineBonus: data.predatorDisciplineBonus === 1 ? 1 : 0,
    predatorType: normalizePredatorType(data.predatorTypeCode ?? data.predador) ?? (characterText(data.predador).trim() || null),
    advantages: stringArray(data.advantages ?? (Array.isArray(data.vantagens) ? data.vantagens.map((item) => typeof item === 'object' && item ? (item as Record<string, unknown>).name : item) : [])),
    flaws: stringArray(data.flaws ?? (Array.isArray(data.defeitos) ? data.defeitos.map((item) => typeof item === 'object' && item ? (item as Record<string, unknown>).name : item) : [])),
    advantageDots: traitDots(data.vantagens),
    flawDots: traitDots(data.defeitos),
    masterOverride: data.masterOverride === true,
    npc: data.npc && typeof data.npc === 'object' ? data.npc as CharacterRulesInput['npc'] : undefined,
    retainer: data.retainer && typeof data.retainer === 'object' ? data.retainer as CharacterRulesInput['retainer'] : undefined,
  }
}
