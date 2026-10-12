import type { CreationType } from './types'

export const ATTRIBUTE_DISTRIBUTION = [4, 3, 3, 3, 2, 2, 2, 2, 1]

export const SKILL_DISTRIBUTIONS = {
  JACK_OF_ALL_TRADES: [3, ...Array(8).fill(2), ...Array(10).fill(1)],
  BALANCED: [...Array(3).fill(3), ...Array(5).fill(2), ...Array(7).fill(1)],
  SPECIALIST: [4, ...Array(3).fill(3), ...Array(3).fill(2), ...Array(3).fill(1)],
} as const

export const CREATION_ADJUSTMENTS: Record<CreationType, { initialXp: number; humanity: number; bloodPotencyModifier: number; advantageDots: number; flawDots: number }> = {
  FLEDGLING: { initialXp: 0, humanity: 7, bloodPotencyModifier: 0, advantageDots: 0, flawDots: 0 },
  NEONATE: { initialXp: 15, humanity: 7, bloodPotencyModifier: 0, advantageDots: 0, flawDots: 0 },
  ANCILLA: { initialXp: 35, humanity: 6, bloodPotencyModifier: 1, advantageDots: 2, flawDots: 2 },
  THIN_BLOOD: { initialXp: 0, humanity: 7, bloodPotencyModifier: 0, advantageDots: 0, flawDots: 0 },
}

export const HUMAN_NPC_TEMPLATES = {
  INVESTIGATIVE_POLICE: { physicalPool: 4, socialPool: 3, mentalPool: 4, health: 6, willpower: 5 },
  GANGSTER: { physicalPool: 4, socialPool: 3, mentalPool: 3, health: 6, willpower: 4 },
  CLERGY: { physicalPool: 3, socialPool: 5, mentalPool: 4, health: 5, willpower: 7 },
  FAITH_HUNTER: { physicalPool: 4, socialPool: 4, mentalPool: 5, health: 6, willpower: 8 },
  INQUISITOR: { physicalPool: 5, socialPool: 4, mentalPool: 5, health: 7, willpower: 7 },
  DELTA_INQUISITOR: { physicalPool: 6, socialPool: 4, mentalPool: 4, health: 8, willpower: 7 },
} as const

export const GHOUL_TEMPLATE = { physicalPool: 4, socialPool: 4, mentalPool: 4, health: 6, willpower: 5, disciplineLevel: 1 } as const

export function baseBloodPotencyForGeneration(generation: number | null): number | null {
  if (generation === null) return null
  if (generation >= 14 && generation <= 16) return 0
  if (generation >= 12 && generation <= 13) return 1
  if (generation >= 10 && generation <= 11) return 2
  return null
}
