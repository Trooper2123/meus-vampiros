import { calculateSecondaryAttributes } from './secondary-attributes'

export type DamageTrack = { superficial: number; aggravated: number }
export type SessionState = {
  hunger: number
  humanity: number
  healthDamage: DamageTrack
  willpowerDamage: DamageTrack
  healthCurrent: number
  willpowerCurrent: number
  stains: number
  condition: 'ACTIVE' | 'DAY_SLEEP' | 'STAKED' | 'TORPOR' | 'FINAL_DEATH'
  torpor?: { cause: 'HUNGER' | 'DAMAGE' | 'VOLUNTARY'; startedAtNightId?: string; humanityAtEntry: number }
}

const integer = (value: unknown, fallback: number) => Number.isSafeInteger(Number(value)) ? Number(value) : fallback

export function readSessionState(data: Record<string, unknown>, persisted: Record<string, unknown>): SessionState {
  const maxima = calculateSecondaryAttributes(data)
  const healthDamage = (persisted.healthDamage as DamageTrack | undefined) ?? { superficial: Math.max(0, maxima.healthMax - integer(data.vitalidade, maxima.healthMax)), aggravated: 0 }
  const willpowerDamage = (persisted.willpowerDamage as DamageTrack | undefined) ?? { superficial: Math.max(0, maxima.willpowerMax - integer(data.vontade, maxima.willpowerMax)), aggravated: 0 }
  return {
    hunger: integer(persisted.hunger ?? data.fome, 1), humanity: integer(persisted.humanity ?? data.humanidade, maxima.initialHumanity),
    healthDamage, willpowerDamage,
    healthCurrent: Math.max(0, maxima.healthMax - healthDamage.superficial - healthDamage.aggravated), willpowerCurrent: Math.max(0, maxima.willpowerMax - willpowerDamage.superficial - willpowerDamage.aggravated),
    stains: integer(persisted.stains, 0), condition: (persisted.condition as SessionState['condition']) ?? 'ACTIVE',
    ...(persisted.torpor ? { torpor: persisted.torpor as SessionState['torpor'] } : {}),
  }
}

export function validateDamage(damage: unknown, maximum: number): damage is DamageTrack {
  if (!damage || typeof damage !== 'object' || Array.isArray(damage)) return false
  const track = damage as Record<string, unknown>
  return Object.keys(track).every(key => ['superficial', 'aggravated'].includes(key)) && Number.isSafeInteger(track.superficial) && Number.isSafeInteger(track.aggravated) && Number(track.superficial) >= 0 && Number(track.aggravated) >= 0 && Number(track.superficial) + Number(track.aggravated) <= maximum
}

export function applyAwakening(state: SessionState, roll: number, nightId: string) {
  if (!Number.isInteger(roll) || roll < 1 || roll > 10 || state.hunger < 0 || state.hunger > 5) throw new Error('Despertar inválido.')
  if (state.condition === 'TORPOR' || state.condition === 'FINAL_DEATH') return { state, outcome: 'SKIPPED' as const }
  const next = structuredClone(state)
  if (roll >= 6) {
    if (next.condition === 'DAY_SLEEP') next.condition = 'ACTIVE'
    return { state: next, outcome: 'AWAKENED' as const }
  }
  if (state.hunger === 5) {
    next.condition = 'TORPOR'
    next.torpor = { cause: 'HUNGER', startedAtNightId: nightId, humanityAtEntry: state.humanity }
    return { state: next, outcome: 'TORPOR' as const }
  }
  next.hunger += 1
  if (next.condition === 'DAY_SLEEP') next.condition = 'ACTIVE'
  return { state: next, outcome: 'AWAKENED_HUNGRIER' as const }
}
