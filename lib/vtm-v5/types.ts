export const CHARACTER_TYPES = ['PLAYER_VAMPIRE', 'HUMAN_NPC', 'VAMPIRE_NPC', 'RETAINER'] as const
export const PLAYER_CHARACTER_TYPES = ['PLAYER_VAMPIRE', 'RETAINER'] as const satisfies readonly CharacterType[]
export const CHARACTER_STATUSES = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'ARCHIVED', 'DISABLED'] as const
export const CHARACTER_VISIBILITIES = ['PLAYER_VISIBLE', 'ST_ONLY', 'PARTIAL'] as const
export const CREATION_TYPES = ['FLEDGLING', 'NEONATE', 'ANCILLA', 'THIN_BLOOD'] as const

export type CharacterType = typeof CHARACTER_TYPES[number]
export type CharacterStatus = typeof CHARACTER_STATUSES[number]
export type CharacterVisibility = typeof CHARACTER_VISIBILITIES[number]
export type CreationType = typeof CREATION_TYPES[number]

export function canCreateCharacterType(characterType: CharacterType, isMaster: boolean): boolean {
  return isMaster || PLAYER_CHARACTER_TYPES.includes(characterType as (typeof PLAYER_CHARACTER_TYPES)[number])
}

export type ValidationIssue = { code: string; field: string; message: string }
export type ValidationReport = {
  valid: boolean
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
  derived: { health: number | null; willpower: number | null; humanity: number | null; initialXp: number; bloodPotency: number | null }
}

export type DisciplineInput = { name: string; level: number; powers: Array<string | { name?: string }> }
export type ConvictionInput = { text: string; touchstone: string }

export type CharacterRulesInput = {
  characterType: CharacterType
  creationType: CreationType
  clan: string | null
  isCaitiff: boolean
  isThinBlood: boolean
  generation: number | null
  bloodPotency: number | null
  humanity: number | null
  attributes: Record<string, number>
  skills: Record<string, number>
  skillMode?: 'DETAILED' | 'JACK_OF_ALL_TRADES' | 'BALANCED' | 'SPECIALIST'
  convictions: ConvictionInput[]
  disciplines: DisciplineInput[]
  disciplineXpDots?: number
  predatorDisciplineBonus?: number
  predatorType: string | null
  advantages: string[]
  flaws: string[]
  advantageDots?: number
  flawDots?: number
  masterOverride?: boolean
  npc?: { mode?: 'SIMPLE' | 'POOLS' | 'COMPLETE'; difficulty?: number; physicalPool?: number; socialPool?: number; mentalPool?: number }
  retainer?: { controlMethod?: string; isGhoul?: boolean; domitorCharacterId?: string | null; storedVitaeJustification?: string; disciplineLevel?: number | null; activeRegnantIds?: string[]; bondStrength?: number | null }
}
