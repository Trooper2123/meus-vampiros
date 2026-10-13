import type { PredatorTypeDefinition, PredatorTypeIssue, PredatorValidationInput, PredatorValidationReport } from './types'
import { resolvePredatorChoices } from './mechanics'

export function validatePredatorType(definition: PredatorTypeDefinition, input: PredatorValidationInput): PredatorValidationReport {
  const issues: PredatorTypeIssue[] = []
  const clan = input.clan?.trim().toLocaleLowerCase('pt-BR')
  if (!input.enabled) issues.push({ code: 'PREDATOR_TYPE_DISABLED_FOR_CAMPAIGN', message: 'Este tipo não está habilitado para a campanha.', blocking: true })
  if (definition.code === 'BAGGER' && clan === 'ventrue') issues.push({ code: 'PREDATOR_BAGGER_VENTRUE', message: 'Bagger não é permitido para Ventrue.', blocking: true })
  if (definition.code === 'FARMER' && (clan === 'ventrue' || (input.bloodPotency ?? 0) >= 3)) issues.push({ code: 'PREDATOR_FARMER_RESTRICTED', message: 'Farmer não é permitido para Ventrue ou Potência de Sangue 3 ou maior.', blocking: true })
  if (input.isThinBlood) issues.push({ code: 'THIN_BLOOD_PREDATOR_REVIEW', message: 'Sangue-fraco recém-criado exige exceção explícita do Narrador para escolher predação.', blocking: true })
  const activeOverrides = new Set((input.overrides ?? []).filter((entry) => !entry.revokedAt).map((entry) => entry.ruleCode))
  const visibleIssues = issues.map((issue) => activeOverrides.has(issue.code) ? { ...issue, blocking: false, message: `${issue.message} Override do Mestre registrado.` } : issue)
  return { valid: !visibleIssues.some((issue) => issue.blocking), issues: visibleIssues, relationshipRequirements: [...definition.relationshipRequirements] }
}

export function validatePredatorChoices(definition: PredatorTypeDefinition, specialty: unknown, discipline: unknown, optionCodes: unknown) {
  const issues: PredatorTypeIssue[] = []
  if (definition.specialtyOptions.length > 0 && (typeof specialty !== 'string' || !definition.specialtyOptions.includes(specialty))) issues.push({ code: 'PREDATOR_SPECIALTY_REQUIRED', message: 'Escolha uma especialidade válida.', blocking: true })
  if (definition.disciplineOptions.length > 0 && (typeof discipline !== 'string' || !definition.disciplineOptions.includes(discipline))) issues.push({ code: 'PREDATOR_DISCIPLINE_REQUIRED', message: 'Escolha uma disciplina válida.', blocking: true })
  try {
    if (!Array.isArray(optionCodes) || optionCodes.some(code => typeof code !== 'string')) throw new Error('Escolhas inválidas.')
    resolvePredatorChoices(definition.code, optionCodes)
  } catch (error) { issues.push({ code: 'PREDATOR_OPTIONS_INVALID', message: error instanceof Error ? error.message : 'Escolhas inválidas.', blocking: true }) }
  return issues
}
