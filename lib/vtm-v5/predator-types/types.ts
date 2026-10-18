import type { PredatorChoiceGroup } from './mechanics'

export const PREDATOR_TYPE_SOURCES = ['COREBOOK', 'PLAYERS_GUIDE', 'PUBLICATIONS', 'COTBG_BACKER', 'SABBAT_ALTERNATIVE'] as const
export type PredatorTypeSource = typeof PREDATOR_TYPE_SOURCES[number]
export const PREDATOR_SOURCE_LABELS: Record<PredatorTypeSource, string> = {
  COREBOOK: 'Livro básico',
  PLAYERS_GUIDE: 'Guia comunitário de Bully (2021)',
  PUBLICATIONS: 'Publicações adicionais',
  COTBG_BACKER: 'Cultos dos Deuses de Sangue (pré-publicação)',
  SABBAT_ALTERNATIVE: 'Sabbat (versão alternativa)',
}

export const PREDATOR_TYPE_CODES = [
  'ALLEYCAT', 'BAGGER', 'BLOOD_LEECH', 'CLEAVER', 'CONSENSUALIST', 'FARMER', 'OSIRIS', 'SANDMAN', 'SCENE_QUEEN', 'SIREN',
  'BUSINESS_OWNER', 'CORPORATE_LEECH', 'CONFIDANT', 'EAT_THE_RICH', 'HIDE_AND_EAT', 'KIDNAPPER', 'HOSPITAL_HUNTER', 'LAB_RAT',
  'LOCAL_HAUNT', 'MANIC_PIXIE_PREDATOR', 'LURKER_IN_THE_CROWD', 'ONLINE_PREDATOR', 'OPPORTUNIST', 'PAY_FOR_BLOOD', 'PACK_HUNTER',
  'STREET_FEEDER', 'WATCHER_FROM_THE_WATER', 'WOLF_IN_SHEEPS_CLOTHING',
  'ROADSIDE_KILLER', 'TITHE_COLLECTOR', 'EXTORTIONIST', 'GRAVEROBBER',
  'SABBAT_RECLAIMER', 'SABBAT_SCAVENGER', 'SABBAT_HEDONIST', 'SABBAT_DOMINA', 'SABBAT_MASOCHIST', 'SABBAT_RIPPER', 'SABBAT_EXECUTIONER', 'SABBAT_ABSOLVER',
  'BAGGER_COTBG_OBLIVION',
] as const
export type PredatorTypeCode = typeof PREDATOR_TYPE_CODES[number]

export type MechanicalOption = { code: string; label: string; kind: 'MERIT' | 'FLAW' | 'BACKGROUND' | 'HUMANITY' | 'BLOOD_POTENCY'; dots?: number; modifier?: number }
export type RelationshipRequirement = { kind: 'CONTACT' | 'ENEMY' | 'FAMILY' | 'HERD' | 'CULT' | 'HAVEN' | 'OTHER'; label: string }

export type PredatorTypeDefinition = {
  code: PredatorTypeCode
  name: string
  originalName?: string
  sourceReference?: string
  rulesText?: string
  baseCode?: PredatorTypeCode
  availabilityBlocker?: string
  source: PredatorTypeSource
  optional: boolean
  enabledByDefault: boolean
  summary: string
  feedingStyle: string
  predatorRoll: string
  specialtyOptions: readonly string[]
  disciplineOptions: readonly string[]
  bonusOptions: readonly MechanicalOption[]
  flawsOrCosts: readonly MechanicalOption[]
  commonRisks: readonly string[]
  validationNotes: string
  relationshipRequirements: readonly RelationshipRequirement[]
  choiceGroups?: readonly PredatorChoiceGroup[]
}

export type PredatorTypeIssue = { code: string; message: string; blocking: boolean }
export type PredatorTypeSettings = { enabledSources: PredatorTypeSource[]; enabledCodes: PredatorTypeCode[] | null; disabledCodes: PredatorTypeCode[] }
export type PredatorTypeSelection = { code: PredatorTypeCode; specialty: string; discipline: string; optionCodes: string[]; appliedVersion: number }
export type PredatorTypeOverride = { ruleCode: string; justification: string; createdByUserId: string; createdAt: string; revokedAt?: string; revokedByUserId?: string }

export type PlayerPredatorTypeDto = {
  code: PredatorTypeCode
  name: string
  summary: string
  feedingStyle: string
  predatorRoll: string
  source: PredatorTypeSource
  specialtyOptions: string[]
  sourceReference?: string
  rulesText?: string
  disciplineOptions: string[]
  publicWarnings: PredatorTypeIssue[]
  selectable: boolean
  choiceGroups?: PredatorChoiceGroup[]
}

export type MasterPredatorTypeDto = PlayerPredatorTypeDto & {
  bonusOptions: MechanicalOption[]
  flawsOrCosts: MechanicalOption[]
  commonRisks: string[]
  validationNotes: string
  relationshipRequirements: RelationshipRequirement[]
  enabled: boolean
}

export type PredatorValidationInput = { clan: string | null; bloodPotency: number | null; isThinBlood: boolean; enabled: boolean; creationType?: unknown; overrides?: PredatorTypeOverride[] }
export type PredatorValidationReport = { valid: boolean; issues: PredatorTypeIssue[]; relationshipRequirements: RelationshipRequirement[] }
