import { describe, expect, it } from 'vitest'
import { calculateSpecialtyGrants, calculateSpecialtyPurchase, createCustomSpecialty, normalizeSpecialtySkillId, reconcileSpecialties, selectSpecialtyGrant, specialtyRollBonus, validateSpecialty, type Specialty, type SpecialtyRules } from '@/lib/vtm-v5/specialties'

const rules: SpecialtyRules = { skills: { 'habilidade-erudição': 2, 'Ofícios': 1, Performance: 1, Ciência: 1, Briga: 2 }, creation: true }
const specialty: Specialty = { id: 'selected-1', skillId: 'academicos', name: 'História', origin: 'SKILL', grantId: 'skill:academicos:first-dot', status: 'APPROVED', costXp: 0 }

describe('especialidades V5', () => {
  it('reconhece os identificadores de habilidades do formulário e nomes do resumo', () => {
    expect(normalizeSpecialtySkillId('habilidade-erudição')).toBe('academicos')
    expect(normalizeSpecialtySkillId('Empatia com animais')).toBe('empatia-com-animais')
    expect(calculateSpecialtyGrants(rules).map(grant => grant.id)).toEqual(['skill:academicos:first-dot', 'skill:oficios:first-dot', 'skill:performance:first-dot', 'skill:ciencia:first-dot', 'creation:additional'])
  })

  it('gera somente uma concessão por primeiro ponto e preserva a escolha em saves repetidos', () => {
    const first = reconcileSpecialties([specialty], rules)
    const repeated = reconcileSpecialties(first.preserved, { ...rules, skills: { ...rules.skills, 'habilidade-erudição': 5 } })
    expect(repeated.preserved).toEqual(first.preserved)
    expect(repeated.availableGrants).toEqual(first.availableGrants)
    expect(repeated.availableGrants.some(grant => grant.id === specialty.grantId)).toBe(false)
  })

  it('usa identificador determinístico na seleção e mantém aprovação em retries', () => {
    const input = { grantId: 'skill:academicos:first-dot', skillId: 'Erudição', name: 'História' }
    const selected = selectSpecialtyGrant(input, [], rules)
    expect(selected.id).toBe('specialty:skill:academicos:first-dot')
    const approved: Specialty = { ...selected, status: 'APPROVED' }
    expect(selectSpecialtyGrant(input, [approved], rules)).toEqual(approved)
    expect(() => selectSpecialtyGrant({ ...input, name: 'Filosofia' }, [approved], rules)).toThrow('Concessão já utilizada.')
  })

  it('registra escolhas incompatíveis sem descartar silenciosamente seus dados', () => {
    const result = reconcileSpecialties([specialty], { skills: { academicos: 0 } })
    expect(result.preserved).toEqual([])
    expect(result.incompatible[0].specialty).toEqual(specialty)
    expect(result.incompatible[0].errors).toContain('Concessão incompatível.')
  })

  it('recusa concessões reutilizadas e duplicatas normalizadas', () => {
    expect(validateSpecialty({ ...specialty, id: 'selected-2', name: '  HISTÓRIA  ' }, [specialty], rules)).toContain('Especialidade duplicada.')
    expect(validateSpecialty({ ...specialty, id: 'selected-2', name: 'Filosofia' }, [specialty], rules)).toContain('Concessão já utilizada.')
    expect(reconcileSpecialties([specialty, specialty], rules).incompatible[0].errors).toContain('Identificador duplicado.')
  })

  it('limita especialidades pelos pontos e aplica somente exceções explícitas', () => {
    const first: Specialty = { ...specialty, skillId: 'briga', origin: 'CUSTOM', grantId: undefined }
    const second: Specialty = { ...first, id: 'second', name: 'Garras' }
    expect(validateSpecialty(second, [first], { skills: { briga: 1 } })).toContain('Limite de especialidades excedido.')
    expect(validateSpecialty(second, [first], { skills: { briga: 1 }, limits: { briga: 2 } })).toEqual([])
    expect(() => validateSpecialty(first, [], { skills: { briga: 1 }, limits: { briga: -1 } })).toThrow()
  })

  it('Ofícios permite mais especialidades que pontos sem liberar duplicatas ou habilidades zeradas', () => {
    const first: Specialty = { ...specialty, skillId: 'oficios', origin: 'CUSTOM', grantId: undefined, name: 'Pintura' }
    const second: Specialty = { ...first, id: 'second', name: 'Escultura' }
    expect(validateSpecialty(second, [first], { skills: { Ofícios: 1 } })).toEqual([])
    expect(validateSpecialty(second, [first], { skills: { Ofícios: 1 }, limits: { oficios: 1 } })).toContain('Limite de especialidades excedido.')
    expect(validateSpecialty({ ...second, name: 'Pintura' }, [first], { skills: { Ofícios: 1 } })).toContain('Especialidade duplicada.')
    expect(validateSpecialty(second, [first], { skills: { Ofícios: 0 } })).toContain('A habilidade precisa de ao menos um ponto.')
    expect(reconcileSpecialties([first, second], { skills: { Ofícios: 1 } }).preserved).toHaveLength(2)
  })

  it('trocar predador informa incompatibilidade e concede a nova escolha uma vez', () => {
    const selected: Specialty = { ...specialty, origin: 'PREDATOR', grantId: 'predator:CONFIDANT:specialty', name: 'Psicologia' }
    const initial: SpecialtyRules = { ...rules, predator: { code: 'CONFIDANT', options: [{ skillId: 'Erudição', name: 'Psicologia' }] } }
    expect(validateSpecialty(selected, [], initial)).toEqual([])
    const replaced = reconcileSpecialties([selected], { ...rules, predator: { code: 'ALLEYCAT', options: [{ skillId: 'Briga', name: 'Agarrar' }] } })
    expect(replaced.incompatible[0].specialty).toEqual(selected)
    expect(replaced.availableGrants.some(grant => grant.id === 'predator:ALLEYCAT:specialty')).toBe(true)
    expect(validateSpecialty({ ...selected, name: 'Qualquer coisa' }, [], initial)).toContain('Concessão incompatível.')
  })

  it('propostas personalizadas continuam pendentes sem mesa ou autoaprovação', () => {
    expect(createCustomSpecialty({ id: 'custom', skillId: 'Briga', name: '  Garras   afiadas ' }, [], rules)).toEqual({ id: 'custom', skillId: 'briga', name: 'Garras afiadas', origin: 'CUSTOM', status: 'PENDING', costXp: 0 })
    expect(() => createCustomSpecialty({ id: specialty.id, skillId: 'Briga', name: 'Garras' }, [specialty], rules)).toThrow('Identificador duplicado.')
  })

  it.each([NaN, Infinity, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])('recusa saldo inválido %s', availableXp => {
    expect(() => calculateSpecialtyPurchase(availableXp)).toThrow('Saldo de XP inválido.')
  })

  it('calcula 3 XP no servidor e recusa saldo insuficiente e preço forjado', () => {
    expect(calculateSpecialtyPurchase(3)).toEqual({ costXp: 3, remainingXp: 0 })
    expect(calculateSpecialtyPurchase(10)).toEqual({ costXp: 3, remainingXp: 7 })
    expect(() => calculateSpecialtyPurchase(2)).toThrow('Saldo de XP insuficiente.')
    expect(validateSpecialty({ ...specialty, origin: 'XP', grantId: undefined, costXp: 0 }, [], rules)).toContain('Custo de especialidade inválido.')
  })

  it('recusa habilidades inexistentes, pontos inválidos e aliases conflitantes', () => {
    expect(validateSpecialty({ ...specialty, skillId: 'superpoder' }, [], rules)).toContain('A habilidade precisa de ao menos um ponto.')
    expect(() => calculateSpecialtyGrants({ skills: { inexistente: 1 } })).toThrow()
    expect(() => calculateSpecialtyGrants({ skills: { briga: 6 } })).toThrow()
    expect(() => calculateSpecialtyGrants({ skills: { academicos: 1, Erudição: 2 } })).toThrow()
    expect(validateSpecialty({ ...specialty, name: 'História\u0000' }, [], rules)).toContain('Especialidade inválida.')
  })

  it('aplica no máximo um dado com escolha autorizada, aprovada e aplicável', () => {
    expect(specialtyRollBonus([], 'Erudição', [specialty], true)).toBe(0)
    expect(specialtyRollBonus([specialty.id], 'habilidade-erudição', [specialty], true)).toBe(1)
    expect(() => specialtyRollBonus([specialty.id, specialty.id], 'Erudição', [specialty], true)).toThrow('Apenas uma')
    expect(() => specialtyRollBonus([specialty.id], 'Briga', [specialty], true)).toThrow()
    expect(() => specialtyRollBonus([specialty.id], 'Erudição', [], true)).toThrow()
    expect(() => specialtyRollBonus([specialty.id], 'Erudição', [{ ...specialty, status: 'PENDING' }], true)).toThrow()
    expect(() => specialtyRollBonus([specialty.id], 'Erudição', [specialty], false)).toThrow()
  })
})
