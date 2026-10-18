import { CharacterCommandError, runCharacterCommand } from './character-commands'
import { normalizeCharacterRulesInput } from './vtm-v5/normalize'
import { normalizeSpecialtySkillId, specialtyRollBonus } from './vtm-v5/specialties'
import { characterSpecialties } from './character-specialties'
import { serverDiceProvider, type DiceProvider } from './vtm-v5/dice-provider'
import { evaluateV5Roll, resolveTakingHalf, resolveAutomaticWin } from './vtm-v5/dice-evaluator'
import { readSessionState } from './vtm-v5/session-state'
import { ROLL_MODES, storeRoll, type RollMode } from './character-roll-history'

export type RollInput = { mode?: RollMode; hiddenDifficulty?: boolean; attribute: string; skillId: string; difficulty: number; specialtyId?: string; visibility: 'PUBLIC' | 'SECRET'; reason: string; idempotencyKey: string; expectedRevision: number }

export function executeCharacterRoll(actorId: string, id: string, input: RollInput, provider: DiceProvider = serverDiceProvider) {
  if (input.mode !== undefined && !ROLL_MODES.includes(input.mode) || input.hiddenDifficulty !== undefined && typeof input.hiddenDifficulty !== 'boolean' || !Number.isSafeInteger(input.difficulty) || input.difficulty < 1 || input.difficulty > 50) throw new CharacterCommandError(400, 'Contexto de rolagem inválido.')
  return runCharacterCommand(actorId, id, { key: input.idempotencyKey, type: 'DICE_ROLLED', expectedRevision: input.expectedRevision, payload: input }, character => (character.ownerId === actorId || character.masterId === actorId) && (!(input.visibility === 'SECRET' || input.hiddenDifficulty) || character.masterId === actorId), character => {
    if (character.status !== 'APPROVED' || character.characterType !== 'PLAYER_VAMPIRE') throw new CharacterCommandError(422, 'A ficha precisa ser um vampiro aprovado para rolar.')
    if (character.validationReport && typeof character.validationReport === 'object' && (character.validationReport as { valid?: boolean }).valid === false) throw new CharacterCommandError(422, 'A ficha possui um relatório de validação inválido.')
    const state = readSessionState(character.data, character.gameState)
    if (state.humanity <= 0) throw new CharacterCommandError(422, 'Este personagem não é mais jogável.')
    if (['TORPOR', 'FINAL_DEATH', 'STAKED', 'DAY_SLEEP'].includes(state.condition)) throw new CharacterCommandError(409, 'A condição do personagem impede esta ação normal.')
    const isMaster = character.masterId === actorId
    const mode = input.mode ?? 'TEST'
    if (input.specialtyId && !['TEST', 'TAKING_HALF', 'AUTOMATIC'].includes(mode)) throw new CharacterCommandError(400, 'Este teste não recebe bônus de especialidade.')
    if ((input.hiddenDifficulty || ['TAKING_HALF', 'AUTOMATIC'].includes(mode)) && !isMaster) throw new CharacterCommandError(403, 'Este contexto exige condução do Narrador.')
    const canUseSpecialties = isMaster || (!character.campaignId && character.ownerId === actorId)
    if (input.visibility === 'SECRET' && !isMaster) throw new CharacterCommandError(403, 'Rolagens secretas exigem o Narrador.')
    if (input.specialtyId && !canUseSpecialties) throw new CharacterCommandError(403, 'A aplicabilidade da especialidade nesta rolagem exige o Narrador.')
    const normalized = normalizeCharacterRulesInput(character.data)
    const attribute = normalized.attributes[input.attribute]
    const skills = Object.fromEntries(Object.entries(normalized.skills).map(([skill, dots]) => [normalizeSpecialtySkillId(skill), dots]))
    const skill = normalizeSpecialtySkillId(input.skillId)
    const skillDots = skills[skill]
    if (['TEST', 'TAKING_HALF', 'AUTOMATIC'].includes(mode) && (!Number.isSafeInteger(attribute) || attribute < 1 || attribute > 5 || !Number.isSafeInteger(skillDots) || skillDots < 0 || skillDots > 5)) throw new CharacterCommandError(422, 'Atributo ou habilidade inválido na ficha.')
    let bonus: number
    try { bonus = specialtyRollBonus(input.specialtyId ? [input.specialtyId] : [], skill, characterSpecialties(character), canUseSpecialties) }
    catch (error) { throw new CharacterCommandError(422, error instanceof Error ? error.message : 'Especialidade inválida.') }
    const pool = mode === 'CHECK' ? 1 : mode === 'WILLPOWER' ? state.willpowerCurrent : mode === 'HUMANITY' ? state.humanity : attribute + skillDots + bonus
    const hungerCount = ['TEST', 'TAKING_HALF', 'AUTOMATIC'].includes(mode) ? Math.min(pool, state.hunger) : 0
    const dice = ['TAKING_HALF', 'AUTOMATIC'].includes(mode) ? [] : provider.rollD10(pool)
    if (!['TAKING_HALF', 'AUTOMATIC'].includes(mode) && dice.length !== pool) throw new CharacterCommandError(500, 'O provedor de dados retornou resultado inválido.')
    let result = evaluateV5Roll(dice.slice(0, pool - hungerCount), dice.slice(pool - hungerCount), mode === 'CHECK' ? 1 : input.difficulty)
    if (mode === 'TAKING_HALF' || mode === 'AUTOMATIC') {
      let shortcut
      try { shortcut = mode === 'TAKING_HALF' ? resolveTakingHalf(pool, input.difficulty) : resolveAutomaticWin(pool, input.difficulty) }
      catch { throw new CharacterCommandError(422, 'A parada não atende ao atalho solicitado.') }
      result = { ...result, ...shortcut, totalFailure: shortcut.successes === 0, outcome: shortcut.success ? 'SUCCESS' : 'FAILURE' }
    }
    return { ok: true, ...storeRoll(character, actorId, { mode, pool, specialtyBonus: bonus, visibility: input.visibility, reason: input.reason, hiddenDifficulty: input.hiddenDifficulty }, result) }
  })
}
