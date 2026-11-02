import { randomInt } from 'node:crypto'
import { CharacterCommandError, runCharacterCommand } from './character-commands'
import { getBloodPolicy } from './blood-policy'
import { calculateBloodPotencyEffects, type BloodContext } from './vtm-v5/blood-potency'
import { readSessionState } from './vtm-v5/session-state'
import { resolveBloodAction, validateBloodAction } from './vtm-v5/blood-actions'
import type { BloodAction } from './vtm-v5/blood-actions'

const ironGullet = (data: Record<string, unknown>) => {
  const merits = Array.isArray(data.vantagens) ? data.vantagens as Record<string, unknown>[] : []
  return merits.some(item => ['IRON_GULLET','ESTOMAGO_DE_FERRO'].includes(String(item.code ?? item.id ?? '').toUpperCase()))
}
export async function performCharacterBloodAction(actorId: string, id: string, rawAction: unknown, expectedRevision: number, key: string) {
  let action: BloodAction
  try { action = validateBloodAction(rawAction) }
  catch (error) { throw new CharacterCommandError(400, error instanceof Error ? error.message : 'Ação inválida.') }
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw new CharacterCommandError(400, 'Revisão inválida.')
  return runCharacterCommand(actorId, id, { key, expectedRevision, type: 'BLOOD_ACTION', payload: action },
    character => actorId === character.ownerId || actorId === character.masterId,
    async (character, transaction) => {
      if (!['PLAYER_VAMPIRE','VAMPIRE_NPC'].includes(character.characterType)) throw new CharacterCommandError(422, 'Esta ação exige ficha de vampiro.')
      const policy = await getBloodPolicy(character.campaignId)
      const context = character.gameState.bloodContext as BloodContext | undefined
      let effects
      try { effects = calculateBloodPotencyEffects({ ...character.data, characterType: character.characterType }, policy.rulesetVersion,
        { ...context, characterRevision: character.revision, now: new Date().toISOString() }, policy) }
      catch (error) { throw new CharacterCommandError(422, error instanceof Error ? error.message : 'Potência inválida.') }
      let permission = false
      let already = false
      if (action.kind === 'MEND_AGGRAVATED' && character.campaignId) {
        const rows = await transaction.execute<{id: string}>(await import('drizzle-orm').then(({sql}) => sql`SELECT n.id FROM chronicle_nights n JOIN night_awakenings a ON a.night_id = n.id WHERE n.id = ${action.nightId}::uuid AND n.campaign_id = ${character.campaignId}::uuid AND a.character_id = ${character.id}::uuid AND n.status = 'ACTIVE'`))
        permission = rows.rows.length > 0
        const existing = character.gameState.lastAggravatedMendNightId
        already = existing === action.nightId
      }
      const state = readSessionState(character.data, character.gameState)
      let result
      try {
        result = resolveBloodAction(state, action, effects, () => randomInt(1, 11), {
          isVentrue: character.data.clanCode === 'VENTRUE' || String(character.data.cla ?? '').toLowerCase() === 'ventrue',
          hasIronGullet: ironGullet(character.data),
          hasAggravatedNightPermission: permission, alreadyMendedAggravated: already,
        })
      } catch (error) { throw new CharacterCommandError(422, error instanceof Error ? error.message : 'Ação não permitida.') }
      character.gameState = { ...character.gameState, ...result.state }
      if (action.kind === 'MEND_AGGRAVATED' && result.healed > 0) character.gameState.lastAggravatedMendNightId = action.nightId
      return { ok: true, ...result, rulesetVersion: effects.rulesetVersion, potency: effects.globalEffectiveBloodPotency }
    })
}
