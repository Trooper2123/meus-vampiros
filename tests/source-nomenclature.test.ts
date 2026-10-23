import { describe, expect, it } from 'vitest'
import { DISCIPLINES, disciplineDefinition } from '@/lib/vtm-v5/disciplines'
import { normalizePredatorType, PREDATOR_TYPES, toPlayerPredatorTypeDto } from '@/lib/vtm-v5/predator-types'

describe('nomenclatura canônica', () => {
  it('exibe disciplinas em inglês e conserva nomes em português como aliases', () => {
    expect(DISCIPLINES.every(entry => entry.name === entry.name.trim() && entry.name === entry.name.replace(/[áéíóúãõç]/gi, ''))).toBe(true)
    expect(disciplineDefinition('Dominação')?.name).toBe('Dominate')
    expect(disciplineDefinition('PROTEANISMO')?.name).toBe('Protean')
  })

  it('exibe predações em inglês e resolve aliases antigos em português', () => {
    const variant = PREDATOR_TYPES.find(entry => entry.code === 'BAGGER_COTBG_OBLIVION')!
    expect(variant.name).toBe('Bagger (Oblivion)')
    expect(normalizePredatorType('Ensacador (variante Oblívio)')).toBe(variant.code)
    expect(toPlayerPredatorTypeDto(variant).name).toBe('Bagger (Oblivion)')
    expect(toPlayerPredatorTypeDto(variant).aliases).toContain('Ensacador (variante Oblívio)')
    expect(toPlayerPredatorTypeDto(variant).disciplineOptions).toContain('Oblivion')
  })
})
