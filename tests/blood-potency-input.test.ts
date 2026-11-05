import { describe, expect, it } from 'vitest'
import { assertBloodPotencyInput } from '@/lib/character-blood-potency'
import { BLOOD_POTENCY_DERIVED_FIELDS } from '@/lib/vtm-v5/blood-potency'

describe('validação de entrada da Potência do Sangue', () => {
  it.each([null, false, {}, [], ' ', -1, 11, 1.5])('rejeita potência inválida %j', value => {
    expect(() => assertBloodPotencyInput({ 'potencia-de-sangue': value })).toThrow()
  })
  it('mantém os limites de geração e de Sangue-Ralo em atualizações parciais', () => {
    expect(() => assertBloodPotencyInput({ 'potencia-de-sangue': 2 }, { geracao: 13 })).not.toThrow()
    expect(() => assertBloodPotencyInput({ 'potencia-de-sangue': 4 }, { geracao: 13 })).toThrow()
    expect(() => assertBloodPotencyInput({ 'potencia-de-sangue': 1 }, { cla: 'Sangue-Ralo' })).toThrow()
    expect(() => assertBloodPotencyInput({ 'potencia-de-sangue': 0 }, { cla: 'Sangue-Ralo' })).not.toThrow()
  })
  it('valida derivados mesmo quando a potência não foi enviada', () => {
    const field = BLOOD_POTENCY_DERIVED_FIELDS[0]
    expect(() => assertBloodPotencyInput({ [field]: 2 }, { [field]: 1 })).toThrow()
    expect(() => assertBloodPotencyInput({ [field]: 1 }, { [field]: 1 })).not.toThrow()
    expect(() => assertBloodPotencyInput({})).not.toThrow()
  })
})
