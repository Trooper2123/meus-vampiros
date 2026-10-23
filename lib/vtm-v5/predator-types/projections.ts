import type { MasterPredatorTypeDto, PlayerPredatorTypeDto, PredatorTypeDefinition, PredatorTypeIssue } from './types'
import { disciplineDefinition } from '../disciplines'

export function toPlayerPredatorTypeDto(definition: PredatorTypeDefinition, publicWarnings: PredatorTypeIssue[] = [], selectable = true): PlayerPredatorTypeDto {
  return { code: definition.code, name: definition.name, aliases: [...(definition.aliases ?? [])], summary: definition.summary, feedingStyle: definition.feedingStyle, predatorRoll: definition.predatorRoll, source: definition.source, ...(definition.sourceReference ? { sourceReference: definition.sourceReference } : {}), ...(definition.rulesText ? { rulesText: definition.rulesText } : {}), specialtyOptions: [...definition.specialtyOptions], disciplineOptions: definition.disciplineOptions.map(name => disciplineDefinition(name)?.name ?? name), choiceGroups: structuredClone([...(definition.choiceGroups ?? [])]), publicWarnings, selectable }
}

export function toMasterPredatorTypeDto(definition: PredatorTypeDefinition, enabled: boolean, issues: PredatorTypeIssue[] = []): MasterPredatorTypeDto {
  return { ...toPlayerPredatorTypeDto(definition, issues, enabled), bonusOptions: [...definition.bonusOptions], flawsOrCosts: [...definition.flawsOrCosts], commonRisks: [...definition.commonRisks], validationNotes: definition.validationNotes, relationshipRequirements: [...definition.relationshipRequirements], enabled }
}
