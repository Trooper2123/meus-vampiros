import type { PredatorTypeDefinition, PredatorTypeIssue, PredatorValidationInput, PredatorValidationReport } from './types'
import { resolvePredatorChoices } from './mechanics'
import { disciplineDefinition } from '../disciplines'

export function validatePredatorType(definition: PredatorTypeDefinition, input: PredatorValidationInput): PredatorValidationReport {
  const issues: PredatorTypeIssue[] = []
  const clan = input.clan?.trim().toLocaleLowerCase('pt-BR')
  if (!input.enabled) issues.push({ code: 'PREDATOR_TYPE_DISABLED_FOR_CAMPAIGN', message: 'Este tipo exige habilitação pelo Narrador da mesa.', blocking: true })
  if ((definition.code === 'BAGGER' || definition.baseCode === 'BAGGER') && clan === 'ventrue') issues.push({ code: 'PREDATOR_BAGGER_VENTRUE', message: 'Bagger não é permitido para Ventrue.', blocking: true })
  if (definition.code === 'FARMER' && (clan === 'ventrue' || (input.bloodPotency ?? 0) >= 3)) issues.push({ code: 'PREDATOR_FARMER_RESTRICTED', message: 'Farmer não é permitido para Ventrue ou Potência de Sangue 3 ou maior.', blocking: true })
  if (input.isThinBlood) issues.push({ code: 'THIN_BLOOD_PREDATOR_REVIEW', message: 'Sangue-ralo recém-criado exige exceção explícita do Narrador para escolher predação.', blocking: true })
  const activeOverrides = new Set((input.overrides ?? []).filter((entry) => !entry.revokedAt).map((entry) => entry.ruleCode))
  const visibleIssues = issues.map((issue) => activeOverrides.has(issue.code) ? { ...issue, blocking: false, message: `${issue.message} Exceção predefinida da mesa aplicada.` } : issue)
  if (definition.availabilityBlocker) visibleIssues.push({ code: 'PREDATOR_RULESET_UNSUPPORTED', message: definition.availabilityBlocker, blocking: true })
  if (definition.code === 'TITHE_COLLECTOR' && input.creationType !== 'ANCILLA') visibleIssues.push({ code: 'PREDATOR_ANCILLA_REQUIRED', message: 'Cobrador de Tributos exige o perfil de criação Ancilla.', blocking: true })
  return { valid: !visibleIssues.some((issue) => issue.blocking), issues: visibleIssues, relationshipRequirements: [...definition.relationshipRequirements] }
}

export function validatePredatorChoices(definition: PredatorTypeDefinition, specialty: unknown, discipline: unknown, optionCodes: unknown) {
  const issues: PredatorTypeIssue[] = []
  if (definition.specialtyOptions.length > 0 && (typeof specialty !== 'string' || !definition.specialtyOptions.includes(specialty))) issues.push({ code: 'PREDATOR_SPECIALTY_REQUIRED', message: 'Escolha uma especialidade válida.', blocking: true })
  const selectedDiscipline = disciplineDefinition(discipline)
  if (definition.disciplineOptions.length > 0 && (!selectedDiscipline || !definition.disciplineOptions.some(option => disciplineDefinition(option)?.id === selectedDiscipline.id))) issues.push({ code: 'PREDATOR_DISCIPLINE_REQUIRED', message: 'Escolha uma disciplina válida para esta predação; ela não precisa pertencer ao clã.', blocking: true })
  try {
    if (!Array.isArray(optionCodes) || optionCodes.some(code => typeof code !== 'string')) throw new Error('Escolhas inválidas.')
    resolvePredatorChoices(definition.code, optionCodes)
  } catch (error) { issues.push({ code: 'PREDATOR_OPTIONS_INVALID', message: error instanceof Error ? error.message : 'Escolhas inválidas.', blocking: true }) }
  return issues
}
