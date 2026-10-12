import { describe, expect, it } from 'vitest'
import { fitsDistribution, matchesDistribution, remainingPoints } from '@/lib/vtm-v5/creation-guidance'
import { ATTRIBUTE_DISTRIBUTION, SKILL_DISTRIBUTIONS } from '@/lib/vtm-v5/presets'
import { normalizeCharacterRulesInput } from '@/lib/vtm-v5/normalize'

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
})
