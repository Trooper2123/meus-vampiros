import { calculateBloodPotencyEffects, type BloodPotencyEffects } from './blood-potency'
import type { SessionState } from './session-state'

/** Regras de alimentação do Livro Básico V5 pp. 211–213, 216. */
export type FeedingSource = 'SMALL_ANIMALS' | 'MEDIUM_ANIMAL' | 'LARGE_ANIMAL' | 'UNPROCESSED_BAG' | 'PROCESSED_BAG' | 'HUMAN_SIP' | 'HUMAN_SAFE' | 'HUMAN_HARMFUL' | 'HUMAN_KILLED'
export type FeedingAction = { kind: 'FEED'; source: FeedingSource; servings: number; victimHarmed?: boolean; ventruePreferenceMatched?: boolean }
export type MendingAction = { kind: 'MEND_SUPERFICIAL'; rouseRoll?: never } | { kind: 'MEND_AGGRAVATED'; nightId: string; rouseRoll?: never }
export type BloodAction = FeedingAction | MendingAction
export type BloodActionResult = { state: SessionState; hungerSlaked: number; healed: number; rouseRolls: number[]; narrativeFlags: string[] }

const feedBase: Record<FeedingSource, number> = {
  SMALL_ANIMALS: 1, MEDIUM_ANIMAL: 1, LARGE_ANIMAL: 2, UNPROCESSED_BAG: 1, PROCESSED_BAG: 1,
  HUMAN_SIP: 1, HUMAN_SAFE: 2, HUMAN_HARMFUL: 1, HUMAN_KILLED: 5,
}
const animals = new Set<FeedingSource>(['SMALL_ANIMALS','MEDIUM_ANIMAL','LARGE_ANIMAL','UNPROCESSED_BAG','PROCESSED_BAG'])
const humans = new Set<FeedingSource>(['HUMAN_SIP','HUMAN_SAFE','HUMAN_HARMFUL','HUMAN_KILLED'])
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function validateBloodAction(input: unknown): BloodAction {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Ação de sangue inválida.')
  const value = input as Record<string, unknown>
  if (value.kind === 'FEED') {
    if (Object.keys(value).some(k => !['kind','source','servings','victimHarmed','ventruePreferenceMatched'].includes(k)) ||
      typeof value.source !== 'string' || !(value.source in feedBase) ||
      !Number.isSafeInteger(value.servings) || Number(value.servings) < 1 || Number(value.servings) > 5 ||
      (value.victimHarmed !== undefined && typeof value.victimHarmed !== 'boolean') ||
      (value.ventruePreferenceMatched !== undefined && typeof value.ventruePreferenceMatched !== 'boolean')) throw new Error('Alimentação inválida.')
    if (value.source === 'HUMAN_HARMFUL' && value.victimHarmed !== true) throw new Error('A alimentação prejudicial deve registrar dano na vítima.')
    if (value.source !== 'HUMAN_HARMFUL' && value.servings !== 1 && !animals.has(value.source as FeedingSource)) throw new Error('Quantidade incompatível com a fonte.')
    return value as FeedingAction
  }
  if (value.kind === 'MEND_SUPERFICIAL' && Object.keys(value).length === 1) return { kind: 'MEND_SUPERFICIAL' }
  if (value.kind === 'MEND_AGGRAVATED' && Object.keys(value).every(k => ['kind','nightId'].includes(k)) && typeof value.nightId === 'string' && uuid.test(value.nightId)) return { kind: 'MEND_AGGRAVATED', nightId: value.nightId }
  throw new Error('Regeneração inválida.')
}
export function resolveBloodAction(
  state: SessionState, action: BloodAction, effects: BloodPotencyEffects, rollD10: () => number,
  context: { isVentrue?: boolean; hasIronGullet?: boolean; hasAggravatedNightPermission?: boolean; alreadyMendedAggravated?: boolean } = {},
): BloodActionResult {
  if (state.condition === 'FINAL_DEATH' || state.condition === 'TORPOR' || state.condition === 'DAY_SLEEP' || state.condition === 'STAKED') throw new Error('Condição do personagem não permite esta ação automática.')
  const next = structuredClone(state)
  const flags: string[] = []
  if (action.kind === 'FEED') {
    if (context.isVentrue && action.ventruePreferenceMatched !== true) throw new Error('Preferência Ventrue não confirmada: resolução de Força de Vontade/Narrador necessária.')
    if (action.source === 'PROCESSED_BAG' && !context.hasIronGullet) throw new Error('Sangue processado exige Iron Gullet.')
    let slaked = feedBase[action.source] * action.servings
    if (action.source === 'HUMAN_HARMFUL') {
      slaked = action.servings
      if (slaked > 4) throw new Error('Máximo de quatro pontos na alimentação prejudicial.')
      flags.push('Vítima humana sofre dano agravado igual à quantidade drenada; testar sobrevivência.')
    }
    if (animals.has(action.source)) {
      const multiplier = effects.feedingPenalty.params.animalAndBaggedMultiplier
      slaked = Math.floor(slaked * multiplier)
      if (slaked === 0) throw new Error('Esta fonte não sacia Fome suficiente nas condições atuais.')
      if (action.source === 'PROCESSED_BAG') flags.push('Sangue processado sem ressonância.')
    } else if (humans.has(action.source) && action.source !== 'HUMAN_KILLED') {
      slaked = Math.max(0, slaked - effects.feedingPenalty.params.humanReductionPenalty)
    }
    const floor = action.source === 'HUMAN_KILLED' ? 0 : Math.max(1, effects.feedingPenalty.params.minimumHungerWithoutKilling ?? 1)
    const before = next.hunger
    next.hunger = Math.max(floor, before - slaked)
    if (action.source === 'HUMAN_KILLED') flags.push('Morte humana: avaliar Manchas, Humanidade e consequências narrativas.')
    return { state: next, hungerSlaked: before-next.hunger, healed: 0, rouseRolls: [], narrativeFlags: flags }
  }
  if (!effects.mendingAllowed) throw new Error('Regeneração por Rouse indisponível para este personagem.')
  if (action.kind === 'MEND_AGGRAVATED') {
    if (!context.hasAggravatedNightPermission) throw new Error('A regeneração agravada exige anoitecer validado pelo servidor.')
    if (context.alreadyMendedAggravated) throw new Error('Limite de um dano agravado por noite.')
    if (next.healthDamage.aggravated < 1) throw new Error('Não há dano agravado para regenerar.')
  } else if (next.healthDamage.superficial < 1) throw new Error('Não há dano superficial para regenerar.')
  // Com Fome 5, o teste falho exige frenesi/torpor conforme a circunstância: não resolver sem narrador.
  if (next.hunger === 5) throw new Error('Fome 5 requer resolução assistida do Narrador para Rouse Checks.')
  const count = action.kind === 'MEND_AGGRAVATED' ? 3 : 1
  const rolls: number[] = []
  for (let i = 0; i < count; i++) {
    const roll = rollD10()
    if (!Number.isSafeInteger(roll) || roll < 1 || roll > 10) throw new Error('Resultado de Rouse inválido.')
    rolls.push(roll)
    if (roll < 6) {
      if (next.hunger === 5) {
        if (action.kind === 'MEND_AGGRAVATED') {
          next.condition = 'TORPOR'; next.torpor = { cause: 'HUNGER', humanityAtEntry: next.humanity }
          flags.push('Torpor por falha de Rouse durante regeneração agravada.')
          break
        }
        throw new Error('Fome 5 durante regeneração superficial exige teste de frenesi assistido.')
      }
      next.hunger++
    }
  }
  // No caso de torpor em regeneração agravada, não conceder cura incompleta.
  const healed = next.condition === 'TORPOR' ? 0 : action.kind === 'MEND_AGGRAVATED'
    ? 1 : Math.min(next.healthDamage.superficial, effects.superficialMendAmount)
  if (action.kind === 'MEND_AGGRAVATED') next.healthDamage.aggravated -= healed
  else next.healthDamage.superficial -= healed
  next.healthCurrent += healed
  return { state: next, hungerSlaked: 0, healed, rouseRolls: rolls, narrativeFlags: flags }
}
