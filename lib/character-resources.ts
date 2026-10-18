import { CharacterCommandError, runCharacterCommand } from './character-commands'
import { readSessionState, validateDamage, type SessionState } from './vtm-v5/session-state'
import { calculateSecondaryAttributes } from './vtm-v5/secondary-attributes'

export function changeCharacterResources(actorId: string, id: string, changes: Record<string, unknown>, reason: string, expectedRevision: number, key: string) {
  const allowed = new Set(['hunger', 'humanity', 'healthDamage', 'willpowerDamage', 'stains'])
  if (!reason.trim() || reason.length > 500 || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0 || !Object.keys(changes).length || Object.keys(changes).some(field => !allowed.has(field))) throw new CharacterCommandError(400, 'Alteração de recursos inválida.')
  return runCharacterCommand(actorId, id, { key, expectedRevision, type: 'RESOURCES_CHANGED', payload: { changes, reason: reason.trim() } }, character => character.ownerId === actorId || character.masterId === actorId, character => {
    if (character.characterType !== 'PLAYER_VAMPIRE') throw new CharacterCommandError(422, 'Este fluxo exige uma ficha de vampiro jogável.')
    const state = readSessionState(character.data, character.gameState)
    const maxima = calculateSecondaryAttributes(character.data)
    for (const [field, maximum] of Object.entries({ hunger: 5, humanity: 10, stains: 10 })) {
      if (changes[field] !== undefined) {
        if (!Number.isSafeInteger(changes[field]) || Number(changes[field]) < 0 || Number(changes[field]) > maximum) throw new CharacterCommandError(400, 'Valor de recurso inválido.')
        state[field as 'hunger' | 'humanity' | 'stains'] = Number(changes[field])
      }
    }
    for (const [field, maximum] of Object.entries({ healthDamage: maxima.healthMax, willpowerDamage: maxima.willpowerMax })) {
      if (changes[field] !== undefined) {
        if (!validateDamage(changes[field], maximum)) throw new CharacterCommandError(400, 'Trilha de dano inválida.')
        state[field as 'healthDamage' | 'willpowerDamage'] = structuredClone(changes[field]) as SessionState['healthDamage']
        state[field === 'healthDamage' ? 'healthCurrent' : 'willpowerCurrent'] = maximum - state[field as 'healthDamage' | 'willpowerDamage'].superficial - state[field as 'healthDamage' | 'willpowerDamage'].aggravated
      }
    }
    character.gameState = { ...character.gameState, ...state }
    return { ok: true, state, maxima }
  })
}
