import { CharacterCommandError, runCharacterCommand } from './character-commands'
import { normalizeCharacterRulesInput } from './vtm-v5/normalize'
import { normalizeSpecialtySkillId, specialtyRollBonus } from './vtm-v5/specialties'
import { characterSpecialties } from './character-specialties'
import { serverDiceProvider, type DiceProvider } from './vtm-v5/dice-provider'
import { evaluateV5Roll } from './vtm-v5/dice-evaluator'
import { readSessionState } from './vtm-v5/session-state'

export type RollInput = { attribute: string; skillId: string; difficulty: number; specialtyId?: string; visibility: 'PUBLIC' | 'SECRET'; reason: string; idempotencyKey: string; expectedRevision: number }

export function executeCharacterRoll(actorId: string, id: string, input: RollInput, provider: DiceProvider = serverDiceProvider) {
  return runCharacterCommand(actorId, id, { key: input.idempotencyKey, type: 'DICE_ROLLED', expectedRevision: input.expectedRevision, payload: input }, character => character.ownerId === actorId || character.masterId === actorId, character => {
    if (character.status !== 'APPROVED' || character.characterType !== 'PLAYER_VAMPIRE') throw new CharacterCommandError(422, 'A ficha precisa ser um vampiro aprovado para rolar.')
    if (character.validationReport && typeof character.validationReport === 'object' && (character.validationReport as { valid?: boolean }).valid === false) throw new CharacterCommandError(422, 'A ficha possui um relatório de validação inválido.')
    const state = readSessionState(character.data, character.gameState)
    if (state.humanity <= 0) throw new CharacterCommandError(422, 'Este personagem não é mais jogável.')
    if (['TORPOR', 'FINAL_DEATH', 'STAKED', 'DAY_SLEEP'].includes(state.condition)) throw new CharacterCommandError(409, 'A condição do personagem impede esta ação normal.')
    const isMaster = character.masterId === actorId
    if (input.visibility === 'SECRET' && !isMaster) throw new CharacterCommandError(403, 'Rolagens secretas exigem o Narrador.')
    if (input.specialtyId && !isMaster) throw new CharacterCommandError(403, 'A aplicabilidade da especialidade nesta rolagem exige o Narrador.')
    const normalized = normalizeCharacterRulesInput(character.data)
    const attribute = normalized.attributes[input.attribute]
    const skills = Object.fromEntries(Object.entries(normalized.skills).map(([skill, dots]) => [normalizeSpecialtySkillId(skill), dots]))
    const skill = normalizeSpecialtySkillId(input.skillId)
    const skillDots = skills[skill]
    if (!Number.isSafeInteger(attribute) || attribute < 1 || attribute > 5 || !Number.isSafeInteger(skillDots) || skillDots < 0 || skillDots > 5) throw new CharacterCommandError(422, 'Atributo ou habilidade inválido na ficha.')
    let bonus: number
    try { bonus = specialtyRollBonus(input.specialtyId ? [input.specialtyId] : [], skill, characterSpecialties(character), isMaster) }
    catch (error) { throw new CharacterCommandError(422, error instanceof Error ? error.message : 'Especialidade inválida.') }
    const pool = attribute + skillDots + bonus
    const hungerCount = Math.min(pool, state.hunger)
    const dice = provider.rollD10(pool)
    if (dice.length !== pool) throw new CharacterCommandError(500, 'O provedor de dados retornou resultado inválido.')
    const result = evaluateV5Roll(dice.slice(0, pool - hungerCount), dice.slice(pool - hungerCount), input.difficulty)
    return { ok: true, pool, specialtyBonus: bonus, visibility: input.visibility, result }
  })
}
