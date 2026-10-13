import type { MasterPredatorTypeDto, PlayerPredatorTypeDto, PredatorTypeDefinition, PredatorTypeIssue } from './types'

export function toPlayerPredatorTypeDto(definition: PredatorTypeDefinition, publicWarnings: PredatorTypeIssue[] = [], selectable = true): PlayerPredatorTypeDto {
  return { code: definition.code, name: definition.name, summary: definition.summary, feedingStyle: definition.feedingStyle, predatorRoll: definition.predatorRoll, source: definition.source, specialtyOptions: [...definition.specialtyOptions], disciplineOptions: [...definition.disciplineOptions], publicWarnings, selectable }
}

export function toMasterPredatorTypeDto(definition: PredatorTypeDefinition, enabled: boolean, issues: PredatorTypeIssue[] = []): MasterPredatorTypeDto {
  return { ...toPlayerPredatorTypeDto(definition, issues, enabled), bonusOptions: [...definition.bonusOptions], flawsOrCosts: [...definition.flawsOrCosts], commonRisks: [...definition.commonRisks], validationNotes: definition.validationNotes, relationshipRequirements: [...definition.relationshipRequirements], enabled }
}
