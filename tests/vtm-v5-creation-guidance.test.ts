import { describe, expect, it } from 'vitest'
import { fitsDistribution, matchesDistribution, remainingPoints } from '@/lib/vtm-v5/creation-guidance'
import { ATTRIBUTE_DISTRIBUTION, SKILL_DISTRIBUTIONS } from '@/lib/vtm-v5/presets'
import { normalizeCharacterRulesInput } from '@/lib/vtm-v5/normalize'
import { validateCharacter } from '@/lib/vtm-v5/validation'

describe('assistência de distribuição na criação', () => {
  it('aceita a distribuição exata de atributos e informa que não restam pontos', () => {
    expect(matchesDistribution([4, 3, 3, 3, 2, 2, 2, 2, 1], ATTRIBUTE_DISTRIBUTION)).toBe(true)
    expect(remainingPoints([4, 3, 3, 3, 2, 2, 2, 2, 1], ATTRIBUTE_DISTRIBUTION)).toBe(0)
  })

  it('recusa mais atributos altos que o permitido', () => {
    expect(fitsDistribution([4, 4, 1, 1, 1, 1, 1, 1, 1], ATTRIBUTE_DISTRIBUTION)).toBe(false)
  })

  it('recusa habilidades acima da capacidade do perfil equilibrado', () => {
    expect(fitsDistribution([4], SKILL_DISTRIBUTIONS.BALANCED)).toBe(false)
    expect(fitsDistribution([3, 3, 3], SKILL_DISTRIBUTIONS.BALANCED)).toBe(true)
  })

  it('contabiliza os níveis reais de vantagens e defeitos', () => {
    const input = normalizeCharacterRulesInput({
      vantagens: [{ name: 'Recursos', level: 3 }, { name: 'Aliados', level: 2 }],
      defeitos: [{ name: 'Inimigo', level: 2 }],
    })

    expect(input.advantageDots).toBe(5)
    expect(input.flawDots).toBe(2)
  })

  it('gera um erro por disciplina sem poderes, mesmo compartilhando código/campo', () => {
    const report = validateCharacter(normalizeCharacterRulesInput({ disciplinas: [{ name: 'Presença', level: 2, powers: [] }, { name: 'Rapidez', level: 1, powers: [] }] }))
    const errors = report.errors.filter(issue => issue.code === 'DISCIPLINE_POWER_REQUIRED')
    expect(errors).toHaveLength(2)
    expect(errors.map(issue => `${issue.code}-${issue.field}`)).toEqual(['DISCIPLINE_POWER_REQUIRED-disciplines', 'DISCIPLINE_POWER_REQUIRED-disciplines'])
    expect(errors[0].message).toContain('Presença')
    expect(errors[1].message).toContain('Rapidez')
  })

  it('gera um erro por disciplina sem poderes, mesmo compartilhando código/campo', () => {
    const report = validateCharacter(normalizeCharacterRulesInput({ disciplinas: [{ name: 'Presença', level: 2, powers: [] }, { name: 'Rapidez', level: 1, powers: [] }] }))
    const errors = report.errors.filter(issue => issue.code === 'DISCIPLINE_POWER_REQUIRED')
    expect(errors).toHaveLength(2)
    expect(errors.map(issue => `${issue.code}-${issue.field}`)).toEqual(['DISCIPLINE_POWER_REQUIRED-disciplines', 'DISCIPLINE_POWER_REQUIRED-disciplines'])
    expect(errors[0].message).toContain('Presença')
    expect(errors[1].message).toContain('Rapidez')
  })

  it('inclui concessões de clã/predação e não desconta metadados do total', () => {
    const input = normalizeCharacterRulesInput({
      vantagens: [{ name: 'Recursos', level: 4 }, { id: 'grant:PREDATOR', name: 'Aliados', level: 3 }],
      defeitos: [{ id: 'grant:CLAN', name: 'Repulsivo', level: 2 }],
      creationAdvantageDots: 3, creationFlawDots: 2,
    })
    expect(input.advantageDots).toBe(7)
    expect(input.flawDots).toBe(2)
    const errors = validateCharacter(input).errors.map(issue => issue.code)
    expect(errors).not.toContain('ADVANTAGES_LIMIT_EXCEEDED')
    expect(errors).not.toContain('FLAWS_MINIMUM_NOT_MET')
  })

  it('mantém limites do perfil mesmo com concessões/metadados de desconto forjados', () => {
    const input = normalizeCharacterRulesInput({ creationType: 'ANCILLA', vantagens: [{ level: 5 }, { level: 5 }], defeitos: [{ level: 2 }, { level: 2 }], creationAdvantageDots: 999, creationFlawDots: 999 })
    const errors = validateCharacter(input).errors.map(issue => issue.code)
    expect(input.advantageDots).toBe(10)
    expect(input.flawDots).toBe(4)
    expect(errors).toContain('ADVANTAGES_LIMIT_EXCEEDED')
    expect(errors).not.toContain('FLAWS_MINIMUM_NOT_MET')
  })
})
