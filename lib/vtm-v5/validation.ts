import { ATTRIBUTE_DISTRIBUTION, CREATION_ADJUSTMENTS, SKILL_DISTRIBUTIONS, baseBloodPotencyForGeneration } from './presets'
import { CHARACTER_STATUSES, type CharacterRulesInput, type CharacterStatus, type ValidationIssue, type ValidationReport } from './types'

const issue = (code: string, field: string, message: string): ValidationIssue => ({ code, field, message })
const sortedValues = (values: number[]) => values.filter((value) => value > 0).sort((first, second) => second - first)
const sameDistribution = (actual: number[], expected: readonly number[]) => actual.length === expected.length && actual.every((value, index) => value === expected[index])

export function validateCharacter(input: CharacterRulesInput, exceptionCodes: readonly string[] = []): ValidationReport {
  const exceptions = new Set(exceptionCodes)
  const errors: ValidationIssue[] = []
  const warnings: ValidationIssue[] = []
  const adjustment = CREATION_ADJUSTMENTS[input.creationType]
  const stamina = input.attributes.vigor ?? input.attributes.stamina
  const resolve = input.attributes.determinacao ?? input.attributes.resolve
  const composure = input.attributes.compostura ?? input.attributes.composure
  const expectedBloodPotency = baseBloodPotencyForGeneration(input.generation)

  if (input.characterType === 'PLAYER_VAMPIRE') {
    const attributes = Object.values(input.attributes)
    if (!input.masterOverride && !sameDistribution([...attributes].sort((a, b) => b - a), ATTRIBUTE_DISTRIBUTION)) errors.push(issue('ATTRIBUTES_INVALID_DISTRIBUTION', 'attributes', 'A distribuição deve ser 4, 3, 3, 3, 2, 2, 2, 2, 1.'))
    if (attributes.length !== 9 || attributes.some((value) => value < 1 || value > 5)) errors.push(issue('ATTRIBUTES_OUT_OF_RANGE', 'attributes', 'Preencha os nove atributos com valores entre 1 e 5.'))

    const skillValues = Object.values(input.skills)
    if (skillValues.some((value) => value < 0 || value > 5)) errors.push(issue('SKILLS_OUT_OF_RANGE', 'skills', 'Habilidades devem possuir valores entre 0 e 5.'))
    if (input.skillMode && input.skillMode !== 'DETAILED' && !sameDistribution(sortedValues(skillValues), SKILL_DISTRIBUTIONS[input.skillMode])) errors.push(issue('SKILLS_INVALID_DISTRIBUTION', 'skills', 'A distribuição de habilidades não corresponde ao perfil selecionado.'))

    const convictions = input.convictions.filter((conviction) => conviction.text || conviction.touchstone)
    if (convictions.length < 1 || convictions.length > 3) errors.push(issue('CONVICTIONS_INVALID_COUNT', 'convictions', 'Informe de uma a três convicções.'))
    if (convictions.some((conviction) => !conviction.text || !conviction.touchstone)) errors.push(issue('TOUCHSTONE_REQUIRED', 'convictions', 'Cada convicção deve possuir um touchstone mortal próprio.'))
    const touchstones = convictions.map((conviction) => conviction.touchstone.trim().toLocaleLowerCase('pt-BR')).filter(Boolean)
    if (new Set(touchstones).size !== touchstones.length) errors.push(issue('TOUCHSTONE_NOT_UNIQUE', 'convictions', 'Cada convicção exige um touchstone diferente.'))

    if (input.isCaitiff && input.clan) errors.push(issue('CAITIFF_WITH_CLAN', 'clan', 'Caitiff não pode possuir clã definido.'))
    if ((input.humanity ?? adjustment.humanity) <= 0) errors.push(issue('HUMANITY_NOT_PLAYABLE', 'humanity', 'Humanidade 0 torna o personagem não jogável.'))
    if (expectedBloodPotency !== null && input.bloodPotency !== null && input.bloodPotency !== expectedBloodPotency + adjustment.bloodPotencyModifier) warnings.push(issue('BLOOD_POTENCY_GENERATION_MISMATCH', 'bloodPotency', 'A Potência de Sangue difere da geração e idade selecionadas; requer aprovação do Mestre.'))

    const disciplineDots = input.disciplines.reduce((total, discipline) => total + discipline.level, 0)
    if (!input.isThinBlood && disciplineDots !== 3 + (input.predatorDisciplineBonus === 1 ? 1 : 0)) errors.push(issue('DISCIPLINE_DOTS_INVALID', 'disciplines', 'Distribua três pontos iniciais e, quando aplicado, um ponto de predação.'))
    for (const discipline of input.disciplines.filter((entry) => entry.level > 0)) {
      const selectedPowers = discipline.powers.slice(0, discipline.level).filter((power) => typeof power === 'string' ? power.trim() : power.name?.trim()).length
      if (selectedPowers !== discipline.level) errors.push(issue('DISCIPLINE_POWER_REQUIRED', 'disciplines', `Escolha um poder para cada ponto de ${discipline.name || 'disciplina'}.`))
    }

    const clan = input.clan?.trim().toLocaleLowerCase('pt-BR')
    const predator = input.predatorType?.trim().toLocaleLowerCase('pt-BR')
    if (predator === 'bagger' && clan === 'ventrue' && !exceptions.has('PREDATOR_BAGGER_VENTRUE')) errors.push(issue('PREDATOR_BAGGER_VENTRUE', 'predatorType', 'Bagger não é permitido para Ventrue.'))
    if (predator === 'farmer' && (clan === 'ventrue' || (input.bloodPotency ?? 0) >= 3) && !exceptions.has('PREDATOR_FARMER_RESTRICTED')) errors.push(issue('PREDATOR_FARMER_RESTRICTED', 'predatorType', 'Farmer não é permitido para Ventrue ou Potência de Sangue 3+.'))
    if (input.isThinBlood && input.predatorType && !exceptions.has('THIN_BLOOD_PREDATOR_REVIEW')) warnings.push(issue('THIN_BLOOD_PREDATOR_REVIEW', 'predatorType', 'Thin-blood recém-criado normalmente não seleciona tipo de predador.'))
    const restrictedAdvantages = ['bonding', 'mawla', 'retainers', 'retentor', 'status']
    if (input.isThinBlood && input.advantages.some((name) => restrictedAdvantages.includes(name.trim().toLocaleLowerCase('en-US')))) errors.push(issue('THIN_BLOOD_ADVANTAGE_RESTRICTED', 'advantages', 'Thin-blood não pode adquirir esta vantagem diretamente sem override do Mestre.'))
    const advantageDots = input.advantageDots ?? input.advantages.length
    if (advantageDots > 7 + adjustment.advantageDots) errors.push(issue('ADVANTAGES_LIMIT_EXCEEDED', 'advantages', 'O limite de vantagens da criação foi excedido.'))
    const flawDots = input.flawDots ?? input.flaws.length
    if (flawDots < 2 + adjustment.flawDots) errors.push(issue('FLAWS_MINIMUM_NOT_MET', 'flaws', 'A ficha precisa do mínimo de falhas exigido pela criação.'))
  }

  if (input.characterType === 'HUMAN_NPC' && input.npc?.mode === 'SIMPLE' && (!Number.isInteger(input.npc.difficulty) || (input.npc.difficulty ?? 0) < 1 || (input.npc.difficulty ?? 0) > 5)) errors.push(issue('NPC_DIFFICULTY_INVALID', 'npc.difficulty', 'A dificuldade do NPC humano deve estar entre 1 e 5.'))
  if (input.characterType === 'VAMPIRE_NPC' && !input.clan && !input.isCaitiff && !input.isThinBlood) errors.push(issue('VAMPIRE_NPC_ORIGIN_REQUIRED', 'clan', 'NPC vampiro deve possuir clã, Caitiff ou thin-blood.'))
  if (input.characterType === 'RETAINER') {
    if (!input.retainer?.controlMethod) errors.push(issue('RETAINER_CONTROL_REQUIRED', 'retainer.controlMethod', 'Todo retentor precisa de um método de controle.'))
    if (input.retainer?.isGhoul && !input.retainer.domitorCharacterId && !input.retainer.storedVitaeJustification?.trim()) errors.push(issue('GHOUL_VITAE_SOURCE_REQUIRED', 'retainer.domitorCharacterId', 'Ghoul exige domitor ou justificativa de vitae armazenada.'))
    if ((input.retainer?.disciplineLevel ?? 0) > 1) warnings.push(issue('GHOUL_DISCIPLINE_REVIEW', 'retainer.disciplineLevel', 'Disciplina de ghoul acima do nível 1 requer regra especial.'))
    if ((input.retainer?.activeRegnantIds?.length ?? 0) > 1) errors.push(issue('MULTIPLE_ACTIVE_REGNANTS', 'retainer.activeRegnantIds', 'Um thrall pode possuir somente um regente ativo.'))
    if (input.retainer?.bondStrength !== null && input.retainer?.bondStrength !== undefined && (input.retainer.bondStrength < 1 || input.retainer.bondStrength > 6)) errors.push(issue('BOND_STRENGTH_INVALID', 'retainer.bondStrength', 'Bond Strength deve estar entre 1 e 6.'))
  }

  return { valid: errors.length === 0, errors, warnings, derived: { health: Number.isFinite(stamina) ? stamina + 3 : null, willpower: Number.isFinite(resolve) && Number.isFinite(composure) ? resolve + composure : null, humanity: input.humanity ?? adjustment.humanity, initialXp: adjustment.initialXp, bloodPotency: input.bloodPotency ?? (expectedBloodPotency === null ? null : expectedBloodPotency + adjustment.bloodPotencyModifier) } }
}

const STATUS_TRANSITIONS: Record<CharacterStatus, CharacterStatus[]> = {
  DRAFT: ['PENDING_REVIEW', 'ARCHIVED'], PENDING_REVIEW: ['DRAFT', 'APPROVED', 'ARCHIVED'], APPROVED: ['DRAFT', 'ARCHIVED', 'DISABLED'], ARCHIVED: ['DRAFT'], DISABLED: ['DRAFT'],
}

export function canTransitionCharacterStatus(current: CharacterStatus, next: CharacterStatus, isMaster: boolean, reportValid: boolean) {
  if (!CHARACTER_STATUSES.includes(current) || !CHARACTER_STATUSES.includes(next) || !STATUS_TRANSITIONS[current].includes(next)) return false
  if (next === 'PENDING_REVIEW') return !isMaster && current === 'DRAFT' && reportValid
  if (next === 'APPROVED') return isMaster && reportValid
  return isMaster
}
