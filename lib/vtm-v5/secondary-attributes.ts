import { CREATION_ADJUSTMENTS } from './presets'
import { normalizeCharacterRulesInput } from './normalize'
import { PREDATOR_TYPES } from './predator-types/catalog'

export function calculateSecondaryAttributes(data: Record<string, unknown>) {
  const input = normalizeCharacterRulesInput(data)
  const definition = PREDATOR_TYPES.find((entry) => entry.code === input.predatorType)
  const predatorModifier = definition?.flawsOrCosts.concat(definition.bonusOptions)
    .filter((entry) => entry.kind === 'HUMANITY')
    .reduce((total, entry) => total + (entry.modifier ?? 0), 0) ?? 0
  const ageModifier = CREATION_ADJUSTMENTS[input.creationType].humanity - 7
  const attribute = (key: string) => Math.max(1, Math.min(5, Number.isFinite(input.attributes[key]) ? input.attributes[key] : 1))
  return {
    healthMax: attribute('vigor') + 3,
    willpowerMax: attribute('determinacao') + attribute('compostura'),
    initialHumanity: Math.max(0, Math.min(10, 7 + ageModifier + predatorModifier)),
    formulas: { health: 'Vigor + 3', willpower: 'Determinação + Compostura', humanity: '7 + idade + predador' },
    modifiers: { age: ageModifier, predator: predatorModifier },
  }
}

export function applySecondaryAttributes(data: Record<string, unknown>, previous?: Record<string, unknown>) {
  if ((data.characterType ?? 'PLAYER_VAMPIRE') !== 'PLAYER_VAMPIRE') return data
  const secondaryAttributes = calculateSecondaryAttributes(data)
  const result: Record<string, unknown> = { ...data, secondaryAttributes }
  for (const [field, initial] of Object.entries({ humanidade: secondaryAttributes.initialHumanity, vitalidade: secondaryAttributes.healthMax, vontade: secondaryAttributes.willpowerMax, fome: 1 })) {
    result[field] = previous?.[field] ?? initial
  }
  if (previous) {
    for (const field of ['healthDamage', 'willpowerDamage', 'vitalidadeDanoSuperficial', 'vitalidadeDanoAgravado', 'vontadeDanoSuperficial', 'vontadeDanoAgravado']) {
      if (previous[field] !== undefined) result[field] = previous[field]
    }
  }
  return result
}
