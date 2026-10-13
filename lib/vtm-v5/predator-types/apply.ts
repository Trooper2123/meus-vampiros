import type { PredatorTypeDefinition, PredatorTypeSelection } from './types'
import { PREDATOR_TYPE_BY_CODE } from './catalog'

export const PREDATOR_TYPE_APPLIED_VERSION = 1

export function removePredatorTypeSelection(data: Record<string, unknown>) {
  const previous = data.predatorTypeSelection as Partial<PredatorTypeSelection> | undefined
  const definition = previous?.code ? PREDATOR_TYPE_BY_CODE.get(previous.code) : undefined
  const options = definition?.flawsOrCosts.concat(definition.bonusOptions) ?? []
  const humanityModifier = options.filter((entry) => entry.kind === 'HUMANITY').reduce((total, entry) => total + (entry.modifier ?? 0), 0)
  const bloodPotencyModifier = options.filter((entry) => entry.kind === 'BLOOD_POTENCY').reduce((total, entry) => total + (entry.modifier ?? 0), 0)
  const result: Record<string, unknown> = { ...data, predador: '', humanidade: Number(data.humanidade ?? 7) - humanityModifier, 'potencia-de-sangue': Number(data['potencia-de-sangue'] ?? 0) - bloodPotencyModifier }
  for (const field of ['predatorTypeCode', 'predatorTypeSelection', 'predatorTypeBaseHumanity', 'predatorTypeBaseBloodPotency', 'predatorTypeRelationshipRequirements']) delete result[field]
  return result
}

export function applyPredatorTypeSelection(data: Record<string, unknown>, definition: PredatorTypeDefinition, selection: Omit<PredatorTypeSelection, 'appliedVersion'>) {
  const previous = data.predatorTypeSelection && typeof data.predatorTypeSelection === 'object' ? data.predatorTypeSelection as Partial<PredatorTypeSelection> : null
  const sameSelection = previous?.code === selection.code && previous.specialty === selection.specialty && previous.discipline === selection.discipline && JSON.stringify(previous.optionCodes ?? []) === JSON.stringify(selection.optionCodes)
  const humanityModifier = definition.flawsOrCosts.concat(definition.bonusOptions).filter((entry) => entry.kind === 'HUMANITY').reduce((total, entry) => total + (entry.modifier ?? 0), 0)
  const bloodPotencyModifier = definition.flawsOrCosts.concat(definition.bonusOptions).filter((entry) => entry.kind === 'BLOOD_POTENCY').reduce((total, entry) => total + (entry.modifier ?? 0), 0)
  const previousDefinition = previous?.code ? PREDATOR_TYPE_BY_CODE.get(previous.code) : undefined
  const previousOptions = previousDefinition?.flawsOrCosts.concat(previousDefinition.bonusOptions) ?? []
  const previousHumanityModifier = previousOptions.filter((entry) => entry.kind === 'HUMANITY').reduce((total, entry) => total + (entry.modifier ?? 0), 0)
  const previousBloodPotencyModifier = previousOptions.filter((entry) => entry.kind === 'BLOOD_POTENCY').reduce((total, entry) => total + (entry.modifier ?? 0), 0)
  const baseHumanity = Number(data.humanidade ?? data.predatorTypeBaseHumanity ?? 7) - previousHumanityModifier
  const baseBloodPotency = Number(data['potencia-de-sangue'] ?? data.predatorTypeBaseBloodPotency ?? 0) - previousBloodPotencyModifier
  const persisted: PredatorTypeSelection = { ...selection, appliedVersion: PREDATOR_TYPE_APPLIED_VERSION }
  return {
    changed: !sameSelection,
    data: { ...data, predador: definition.name, predatorTypeCode: definition.code, predatorTypeSelection: persisted, predatorTypeBaseHumanity: baseHumanity, predatorTypeBaseBloodPotency: baseBloodPotency, humanidade: baseHumanity + humanityModifier, 'potencia-de-sangue': baseBloodPotency + bloodPotencyModifier, predatorTypeRelationshipRequirements: [...definition.relationshipRequirements] },
    selection: persisted,
    modifiers: { humanityModifier, bloodPotencyModifier },
  }
}
