import { CharacterCommandError, runCharacterCommand } from './character-commands'
import { normalizeCharacterRulesInput } from './vtm-v5/normalize'
import { normalizeSpecialtySkillId, specialtyRollBonus } from './vtm-v5/specialties'
import { characterSpecialties } from './character-specialties'
import { serverDiceProvider, type DiceProvider } from './vtm-v5/dice-provider'
import { evaluateV5Roll, resolveTakingHalf, resolveAutomaticWin } from './vtm-v5/dice-evaluator'
import { rollV5Pool } from './vtm-v5/dice-roll-service'
import { readSessionState } from './vtm-v5/session-state'
import { ROLL_MODES, storeRoll, type RollMode } from './character-roll-history'
import { clanRollAdjustment, readClanConditions, validClanRollContext, type ClanRollContext } from './vtm-v5/clan-mechanics'
import { calculateBloodPotencyEffects, type BloodContext } from './vtm-v5/blood-potency'
import { getBloodPolicy } from './blood-policy'

export type RollInput = { mode?: RollMode; hiddenDifficulty?: boolean; clanContext?: ClanRollContext; attribute: string; skillId: string; difficulty: number; specialtyId?: string; visibility: 'PUBLIC' | 'SECRET'; reason: string; idempotencyKey: string; expectedRevision: number }

export function executeCharacterRoll(actorId: string, id: string, input: RollInput, provider: DiceProvider = serverDiceProvider) {
  if (input.mode !== undefined && !ROLL_MODES.includes(input.mode) || input.hiddenDifficulty !== undefined && typeof input.hiddenDifficulty !== 'boolean' || !Number.isSafeInteger(input.difficulty) || input.difficulty < 1 || input.difficulty > 50) throw new CharacterCommandError(400, 'Contexto de rolagem inválido.')
  if (input.clanContext !== undefined && !validClanRollContext(input.clanContext)) throw new CharacterCommandError(400, 'Contexto de clã inválido.')
  return runCharacterCommand(actorId, id, { key: input.idempotencyKey, type: 'DICE_ROLLED', expectedRevision: input.expectedRevision, payload: input }, character => (character.ownerId === actorId || character.masterId === actorId) && (!(input.visibility === 'SECRET' || input.hiddenDifficulty || input.clanContext !== undefined) || character.masterId === actorId), async character => {
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
    if (mode === 'CHECK' && input.clanContext !== undefined) throw new CharacterCommandError(400, 'Check não recebe modificadores de clã.')
    if (input.clanContext?.communication && (mode !== 'TEST' || skill !== 'tecnologia')) throw new CharacterCommandError(422, 'Comunicação Lasombra exige teste de Tecnologia.')
    let severity: number | null = null
    const needsSeverity = mode !== 'CHECK' && (readClanConditions(character).some(condition => condition !== 'COMPULSION_PENALTY') || input.clanContext?.communication)
    if (needsSeverity) {
      const policy = await getBloodPolicy(character.campaignId)
      try { severity = calculateBloodPotencyEffects(character.data, policy.rulesetVersion, { ...(character.gameState.bloodContext as BloodContext | undefined), characterRevision: character.revision, now: new Date().toISOString() }, policy).baneSeverity }
      catch { throw new CharacterCommandError(422, 'Não foi possível calcular a Gravidade da Perdição.') }
    }
    let adjustment: ReturnType<typeof clanRollAdjustment> = { modifiers: undefined, difficulty: undefined }
    if (mode !== 'CHECK') {
      try { adjustment = clanRollAdjustment(character, severity, input.clanContext) }
      catch (error) { throw new CharacterCommandError(422, error instanceof Error ? error.message : 'Contexto de clã inválido.') }
    }
    const difficulty = adjustment.difficulty ?? input.difficulty
    const basePool = mode === 'CHECK' ? 1 : mode === 'WILLPOWER' ? state.willpowerCurrent : mode === 'HUMANITY' ? state.humanity : attribute + skillDots + bonus
    const pool = Math.max(0, basePool - (adjustment.modifiers?.dicePenalty ?? 0))
    const hungerCount = ['TEST', 'TAKING_HALF', 'AUTOMATIC'].includes(mode) ? Math.min(pool, state.hunger) : 0
    let result = ['TAKING_HALF', 'AUTOMATIC'].includes(mode) ? evaluateV5Roll([], [], mode === 'CHECK' ? 1 : difficulty) : rollV5Pool(provider, pool, hungerCount, mode === 'CHECK' ? 1 : difficulty)
    if (mode === 'TAKING_HALF' || mode === 'AUTOMATIC') {
      let shortcut
      try { shortcut = mode === 'TAKING_HALF' ? resolveTakingHalf(pool, difficulty) : resolveAutomaticWin(pool, difficulty) }
      catch { throw new CharacterCommandError(422, 'A parada não atende ao atalho solicitado.') }
      result = { ...result, ...shortcut, totalFailure: shortcut.successes === 0, outcome: shortcut.success ? 'SUCCESS' : 'FAILURE' }
    }
    return { ok: true, ...storeRoll(character, actorId, { mode, pool, specialtyBonus: bonus, visibility: input.visibility, reason: input.reason, hiddenDifficulty: input.hiddenDifficulty, ...(adjustment.modifiers ? { clanModifiers: adjustment.modifiers } : {}) }, result) }
  })
}
