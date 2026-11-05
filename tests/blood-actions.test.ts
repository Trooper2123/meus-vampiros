import { describe, expect, it } from 'vitest'
import { calculateBloodPotencyEffects } from '@/lib/vtm-v5/blood-potency'
import { GENERATION_POTENCY_LIMITS } from '@/lib/vtm-v5/blood-potency-catalog'
import { resolveBloodAction, validateBloodAction } from '@/lib/vtm-v5/blood-actions'
import type { SessionState } from '@/lib/vtm-v5/session-state'

const state = (hunger = 4): SessionState => ({
  hunger, humanity: 7, healthDamage: { superficial: 4, aggravated: 2 },
  willpowerDamage: { superficial: 0, aggravated: 0 },
  healthCurrent: 0, willpowerCurrent: 5, stains: 0, condition: 'ACTIVE',
})
const potency = (value: number, gen?: number) => calculateBloodPotencyEffects({
  'potencia-de-sangue': value, ...(gen ? { geracao: gen } : {}), characterType: 'VAMPIRE_NPC',
})
describe('Alimentação e regeneração V5', () => {
  it.each(['toString', 'constructor', '__proto__'])('rejeita fonte herdada %s', source => {
    expect(() => validateBloodAction({ kind: 'FEED', source, servings: 1 })).toThrow()
  })
  it('preserva dano e estado original ao entrar em torpor durante os Rouse Checks', () => {
    const original = state(4)
    const result = resolveBloodAction(original, { kind: 'MEND_AGGRAVATED', nightId: '11111111-1111-4111-8111-111111111111' }, potency(2), () => 1, { hasAggravatedNightPermission: true })
    expect(result).toMatchObject({ healed: 0, rouseRolls: [1, 1], state: { hunger: 5, condition: 'TORPOR', healthDamage: { aggravated: 2 } } })
    expect(original).toEqual(state(4))
  })
  it.each([0, 11, 1.5, Number.NaN])('rejeita resultado de Rouse inválido %s', roll => {
    expect(() => resolveBloodAction(state(2), { kind: 'MEND_SUPERFICIAL' }, potency(2), () => roll)).toThrow()
  })
  it('mantém os limites geracionais oficiais 4–16 sem extrapolar 2 e 3', () => {
    expect(GENERATION_POTENCY_LIMITS[4]).toEqual([5, 10])
    expect(GENERATION_POTENCY_LIMITS[9]).toEqual([2, 5])
    expect(GENERATION_POTENCY_LIMITS[13]).toEqual([1, 3])
    expect(GENERATION_POTENCY_LIMITS[14]).toEqual([0, 0])
    expect(GENERATION_POTENCY_LIMITS[2]).toBeUndefined()
    expect(GENERATION_POTENCY_LIMITS[3]).toBeUndefined()
    expect(() => potency(4, 13)).toThrow()
    expect(() => calculateBloodPotencyEffects({ 'potencia-de-sangue': 1, creationType: 'THIN_BLOOD', geracao: 14 })).toThrow()
  })
  it('reduz Fome por sangue humano sem jamais alcançar zero sem matar', () => {
    const action = validateBloodAction({ kind: 'FEED', source: 'HUMAN_SAFE', servings: 1 })
    const result = resolveBloodAction(state(2), action, potency(1), () => 10)
    expect(result).toMatchObject({ hungerSlaked: 1, state: { hunger: 1 }, rouseRolls: [] })
    expect(state(2).hunger).toBe(2)
  })
  it('restringe animais e bolsas pela Potência, incluindo consumo dobrado no nível 2', () => {
    expect(() => resolveBloodAction(state(), {kind:'FEED',source:'MEDIUM_ANIMAL',servings:1}, potency(2), () => 10)).toThrow()
    expect(resolveBloodAction(state(), {kind:'FEED',source:'MEDIUM_ANIMAL',servings:2}, potency(2), () => 10).hungerSlaked).toBe(1)
    expect(() => resolveBloodAction(state(), {kind:'FEED',source:'LARGE_ANIMAL',servings:2}, potency(3), () => 10)).toThrow()
    expect(() => resolveBloodAction(state(), {kind:'FEED',source:'PROCESSED_BAG',servings:1}, potency(1), () => 10)).toThrow()
  })
  it('respeita penalidade humana e piso de Fome por Potência', () => {
    expect(resolveBloodAction(state(5), { kind:'FEED',source:'HUMAN_HARMFUL',servings:4,victimHarmed:true }, potency(5), () => 10).state.hunger).toBe(2)
    expect(resolveBloodAction(state(4), { kind:'FEED',source:'HUMAN_KILLED',servings:1 }, potency(8), () => 10).state.hunger).toBe(0)
  })
  it('regenera dano superficial após Rouse e só aumenta Fome quando falha', () => {
    const success = resolveBloodAction(state(2), { kind:'MEND_SUPERFICIAL' }, potency(4), () => 6)
    expect(success).toMatchObject({ healed:3, rouseRolls:[6], state:{hunger:2,healthDamage:{superficial:1,aggravated:2}} })
    const fail = resolveBloodAction(state(2), { kind:'MEND_SUPERFICIAL' }, potency(2), () => 2)
    expect(fail).toMatchObject({ healed:2,rouseRolls:[2],state:{hunger:3} })
    expect(() => resolveBloodAction(state(5), {kind:'MEND_SUPERFICIAL'}, potency(1), () => 1)).toThrow()
  })
  it('cura um agravado por noite após 3 Rouse Checks e exige noite validada', () => {
    const action = { kind:'MEND_AGGRAVATED' as const, nightId:'11111111-1111-4111-8111-111111111111' }
    expect(() => resolveBloodAction(state(), action, potency(2), () => 10)).toThrow()
    expect(() => resolveBloodAction(state(), action, potency(2), () => 10, {hasAggravatedNightPermission:true,alreadyMendedAggravated:true})).toThrow()
    const result = resolveBloodAction(state(1), action, potency(2), () => 10, {hasAggravatedNightPermission:true})
    expect(result).toMatchObject({healed:1,rouseRolls:[10,10,10],state:{healthDamage:{aggravated:1}}})
  })
  it('rejeita campos forjados inclusive resultado de dado, e exige confirmação Ventrue', () => {
    expect(() => validateBloodAction({kind:'MEND_SUPERFICIAL',rouseRoll:10})).toThrow()
    expect(() => validateBloodAction({kind:'FEED',source:'HUMAN_SAFE',servings:1,hungerSlaked:5})).toThrow()
    expect(() => resolveBloodAction(state(), {kind:'FEED',source:'HUMAN_SIP',servings:1},potency(1),()=>10,{isVentrue:true})).toThrow()
  })
})
