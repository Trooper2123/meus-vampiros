export const BLOOD_RULESETS = ['CORE_V5_ORIGINAL_V1', 'COMPANION_ERRATA_P63_V1'] as const
export type BloodRuleset = typeof BLOOD_RULESETS[number]
export const BLOOD_CATEGORIES = ['BLOOD_SURGE', 'SUPERFICIAL_MENDING', 'DISCIPLINE_BONUS', 'DISCIPLINE_ROUSE_REROLL', 'FEEDING', 'BANE_SEVERITY'] as const
export type BloodCategory = typeof BLOOD_CATEGORIES[number]

// Linhas explícitas da SPEC: Surto, cura, bônus, rerrolagem, Gravidade.
export const BLOOD_POTENCY_RULES = {
  CORE_V5_ORIGINAL_V1: [
    [0, 1, 0, 0, 0], [1, 1, 0, 1, 1], [1, 2, 1, 1, 1],
    [2, 2, 1, 2, 2], [2, 3, 2, 2, 2], [3, 3, 2, 3, 3],
    [3, 3, 3, 3, 3], [4, 3, 3, 4, 4], [4, 4, 4, 4, 4],
    [5, 4, 4, 5, 5], [5, 5, 5, 5, 5],
  ],
  COMPANION_ERRATA_P63_V1: [
    [1, 1, 0, 0, 0], [2, 1, 0, 1, 2], [2, 2, 1, 1, 2],
    [3, 2, 1, 2, 3], [3, 3, 2, 2, 3], [4, 3, 2, 3, 4],
    [4, 3, 3, 3, 4], [5, 3, 3, 4, 5], [5, 4, 4, 4, 5],
    [6, 4, 4, 5, 6], [6, 5, 5, 5, 6],
  ],
} as const

export const GENERATION_POTENCY_LIMITS: Record<number, readonly [number, number]> = {
  4: [5, 10], 5: [4, 9], 6: [3, 8], 7: [3, 7], 8: [2, 6], 9: [2, 5],
  10: [1, 4], 11: [1, 4], 12: [1, 3], 13: [1, 3], 14: [0, 0], 15: [0, 0], 16: [0, 0],
}

export function feedingRule(level: number) {
  const animalAndBaggedMultiplier = level >= 3 ? 0 : (level === 2 ? 0.5 : 1)
  let humanReductionPenalty = 0
  if (level === 10) humanReductionPenalty = 3
  else if (level >= 6) humanReductionPenalty = 2
  else if (level >= 4) humanReductionPenalty = 1
  let minimumHungerWithoutKilling: number | null = null
  if (level >= 8) minimumHungerWithoutKilling = 3
  else if (level >= 5) minimumHungerWithoutKilling = 2
  let code = `F${level}`
  if (level <= 1) code = 'F0'
  else if (level === 6 || level === 7) code = 'F6_7'
  else if (level === 8 || level === 9) code = 'F8_9'
  let displayText = 'Sem penalidade adicional de Potência; as regras gerais de alimentação continuam aplicáveis.'
  if (level === 2) displayText = 'Sangue animal e ensacado exigem o dobro da quantidade para saciar a mesma Fome.'
  else if (level >= 3) displayText = 'Sangue animal e ensacado não saciam Fome.'
  if (humanReductionPenalty) displayText += ` Sangue humano sacia ${humanReductionPenalty} ponto(s) a menos por humano.`
  if (minimumHungerWithoutKilling) displayText += ` Somente drenar e matar um humano reduz Fome abaixo de ${minimumHungerWithoutKilling}.`
  return { code, params: { animalAndBaggedMultiplier, humanReductionPenalty, minimumHungerWithoutKilling }, displayText }
}
