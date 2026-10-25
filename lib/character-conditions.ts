import { CharacterCommandError, runCharacterCommand } from './character-commands'
import { readSessionState, type SessionState } from './vtm-v5/session-state'

export function changeCharacterCondition(actorId: string, id: string, condition: unknown, cause: unknown, reason: unknown, expectedRevision: unknown, key: string) {
  if (typeof condition !== 'string' || !['ACTIVE', 'STAKED', 'TORPOR'].includes(condition) || typeof reason !== 'string' || !reason.trim() || reason.length > 500 || !Number.isSafeInteger(expectedRevision) || Number(expectedRevision) < 0 || (condition === 'TORPOR' ? typeof cause !== 'string' || !['HUNGER', 'DAMAGE', 'VOLUNTARY'].includes(cause) : cause !== undefined)) throw new CharacterCommandError(400, 'Condição, causa ou motivo inválido.')
  return runCharacterCommand(actorId, id, { key, expectedRevision: Number(expectedRevision), type: 'CONDITION_CHANGED', payload: { condition, ...(cause ? { cause } : {}), reason: reason.trim() } }, character => !!character.campaignId && character.masterId === actorId, character => {
    if (character.characterType !== 'PLAYER_VAMPIRE') throw new CharacterCommandError(422, 'Este controle exige uma ficha de vampiro jogável.')
    const state = readSessionState(character.data, character.gameState)
    if (state.condition === 'FINAL_DEATH' || state.condition === condition || (condition !== 'ACTIVE' && ['TORPOR', 'STAKED'].includes(state.condition)) || (condition === 'ACTIVE' && !['TORPOR', 'STAKED'].includes(state.condition))) throw new CharacterCommandError(409, 'A condição atual não permite esta alteração narrativa.')
    state.condition = condition as SessionState['condition']
    if (condition === 'TORPOR') state.torpor = { cause: cause as NonNullable<SessionState['torpor']>['cause'], humanityAtEntry: state.humanity }
    else delete state.torpor
    character.gameState = { ...character.gameState, ...state }
    if (condition !== 'TORPOR') delete character.gameState.torpor
    return { ok: true, state }
  })
}
