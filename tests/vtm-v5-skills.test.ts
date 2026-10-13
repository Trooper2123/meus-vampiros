import { describe, expect, it } from 'vitest'
import { mergeCharacterSkills, normalizeSkillId, serializeCharacterSkills, validateCharacterSkills, validateSkillValues } from '../lib/vtm-v5/skills'
import { calculateSpecialtyGrants, eligibleSpecialtySkills, type Specialty } from '../lib/vtm-v5/specialties'

describe('validação e elegibilidade de habilidades', () => {
  it('normaliza rótulos, prefixos, acentos e alias Erudição', () => {
    expect(normalizeSkillId('HABILIDADE-Erudição')).toBe('academicos')
    expect(normalizeSkillId('Armas de fogo')).toBe('armas-de-fogo')
    const validation = validateCharacterSkills({ 'habilidade-Ciência': '2', 'habilidade-ciencia': 2, 'habilidade-Erudição': 1, segredo: 'não é habilidade' })
    expect(validation.valid).toBe(true)
    expect(validation.skills).toMatchObject({ ciencia: 2, academicos: 1, briga: 0 })
  })

  it.each([-1, 6, 1.5, Number.NaN, Number.POSITIVE_INFINITY, true, null, {}, 'abc'])('não oferece habilidades com pontos inválidos: %j', value => {
    const validation = validateSkillValues({ Briga: value })
    expect(validation.valid).toBe(false)
    expect(validation.skills.briga).toBe(0)
  })

  it('rejeita aliases conflitantes e habilidades desconhecidas', () => {
    const validation = validateSkillValues({ Erudição: 1, academicos: 2, superpoder: 5 })
    expect(validation.valid).toBe(false)
    expect(validation.skills.academicos).toBe(0)
    expect(validation.issues).toHaveLength(2)
  })

  it('gera opções atualizadas e concessão quando o primeiro ponto é atribuído', () => {
    expect(eligibleSpecialtySkills({ skills: { Ciencia: 0, Briga: 1 } }, []).map(option => option.skillId)).toEqual(['briga'])
    const rules = { skills: { Ciência: 1, Briga: 0 }, creation: true }
    const grant = calculateSpecialtyGrants(rules).find(entry => entry.skillId === 'ciencia')!
    expect(eligibleSpecialtySkills(rules, [], grant)).toEqual([{ skillId: 'ciencia', dots: 1, name: 'Ciência' }])
  })

  it('limita opções por concessão, pontos e especialidades pendentes', () => {
    const specialty: Specialty = { id: 'pending', skillId: 'briga', name: 'Agarrar', origin: 'XP', status: 'PENDING', costXp: 3 }
    const rules = { skills: { Briga: 1, Ciência: 2 } }
    expect(eligibleSpecialtySkills(rules, [specialty]).map(option => option.skillId)).toEqual(['ciencia'])
    expect(eligibleSpecialtySkills(rules, [], { id: 'skill', origin: 'SKILL', skillId: 'ciencia' }).map(option => option.skillId)).toEqual(['ciencia'])
    expect(eligibleSpecialtySkills(rules, [specialty], { id: 'predator', origin: 'PREDATOR', options: [{ skillId: 'briga', name: 'Agarrar' }] })).toEqual([])
  })

  it('serializa uma única chave canônica e preserva demais campos', () => {
    const result = serializeCharacterSkills({ 'habilidade-Ciência': 0, 'habilidade-ciencia': 2, segredo: 'preservado' }, { Ciência: 3 })
    expect(result).toMatchObject({ 'habilidade-ciencia': 3, segredo: 'preservado' })
    expect(result).not.toHaveProperty('habilidade-Ciência')
  })

  it('atualização parcial substitui aliases sem perder habilidades não editadas', () => {
    const result = mergeCharacterSkills({ 'habilidade-Ciência': 1, 'habilidade-ciencia': 2, 'habilidade-briga': 3, segredo: 'preservado' }, { 'habilidade-Ciência': 4 })
    expect(result).toEqual({ 'habilidade-ciencia': 4, 'habilidade-briga': 3, segredo: 'preservado' })
    expect(() => mergeCharacterSkills(result, { 'habilidade-briga': 6 })).toThrow()
  })
})
