import { CharacterCommandError, type CommandCharacter } from './character-commands'
import { applyCreationEffects, removeCreationEffects } from './creation-effects'
import { characterSpecialties, specialtyRules } from './character-specialties'
import { normalizeDiscipline } from './vtm-v5/clans'
import { PREDATOR_TYPE_BY_CODE, validatePredatorChoices, type PredatorTypeSelection } from './vtm-v5/predator-types'
import { resolvePredatorChoices } from './vtm-v5/predator-types/mechanics'
import { normalizeSpecialtySkillId, selectSpecialtyGrant } from './vtm-v5/specialties'

export function applyPredatorEffects(character: CommandCharacter) {
  const selection = character.data.predatorTypeSelection as PredatorTypeSelection | undefined
  if (!selection) {
    removeCreationEffects(character, 'PREDATOR')
    character.gameState.specialties = characterSpecialties(character).filter(entry => entry.origin !== 'PREDATOR')
    delete character.data.predatorEffectsVersion
    delete character.data.predatorDisciplineBonus
    return
  }
  const definition = PREDATOR_TYPE_BY_CODE.get(selection.code)
  if (!definition || validatePredatorChoices(definition, selection.specialty, selection.discipline, selection.optionCodes).some(issue => issue.blocking)) throw new CharacterCommandError(422, 'Escolhas de predação inválidas.')
  const clan = String(character.data.cla ?? '').trim().toLowerCase()
  if (definition.code === 'SIREN' && clan === 'nosferatu') throw new CharacterCommandError(422, 'Nosferatu não pode receber Aparência positiva de Siren.')
  if (['BAGGER', 'OSIRIS'].includes(definition.code) && selection.discipline === 'Feitiçaria de Sangue' && clan !== 'tremere') throw new CharacterCommandError(422, 'Esta escolha de Feitiçaria de Sangue exige Tremere.')
  const previous = characterSpecialties(character).find(entry => entry.origin === 'PREDATOR' && entry.grantId === `predator:${selection.code}:specialty` && entry.name === selection.specialty)
  const specialties = characterSpecialties(character).filter(entry => entry.origin !== 'PREDATOR')
  try {
    const specialty = selectSpecialtyGrant({ grantId: `predator:${selection.code}:specialty`, skillId: normalizeSpecialtySkillId(selection.specialty.split('(')[0]), name: selection.specialty }, specialties, specialtyRules(character))
    const selected = previous ?? specialty
    if (!character.campaignId) selected.status = 'APPROVED'
    specialties.push(selected)
  } catch { throw new CharacterCommandError(422, 'A especialidade de predação exige habilidade com pontos e limite disponível.') }
  const traits = [...definition.bonusOptions, ...definition.flawsOrCosts, ...resolvePredatorChoices(selection.code, selection.optionCodes)].filter(option => ['MERIT', 'FLAW', 'BACKGROUND'].includes(option.kind)).map(option => ({ kind: option.kind === 'FLAW' ? 'FLAW' as const : 'MERIT' as const, name: option.label, dots: option.dots! }))
  applyCreationEffects(character, 'PREDATOR', { [normalizeDiscipline(selection.discipline)]: 1 }, traits)
  character.gameState.specialties = specialties
  character.data.predatorDisciplineBonus = 1
  character.data.predatorEffectsVersion = 1
}
