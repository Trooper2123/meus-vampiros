import { expect, it } from 'vitest'
import { clanRollAdjustment, readClanConditions, validClanRollContext, type ClanCondition } from '@/lib/vtm-v5/clan-mechanics'
import type { ClanCode } from '@/lib/vtm-v5/clans'

const character = (code: ClanCode, active: ClanCondition[]) => ({ campaignId: 'campaign', data: { clanCode: code }, gameState: { clanConditions: { clanCode: code, campaignId: 'campaign', active } } })

it.each([['BANU_HAQIM', 3], ['HECATA', 3], ['LASOMBRA', 2], ['MINISTRY', 2], ['RAVNOS', 2], ['SALUBRI', 2], ['TZIMISCE', 2]] as const)('calcula penalidade de compulsão de %s no servidor', (code, penalty) => {
  expect(clanRollAdjustment(character(code, ['COMPULSION_PENALTY']), null).modifiers).toMatchObject({ clanCode: code, dicePenalty: penalty })
  expect(clanRollAdjustment(character(code, []), null).modifiers).toBeUndefined()
})

it('acumula luz com compulsão, sem duplicar fontes ou condições', () => {
  const fixture = character('MINISTRY', ['BRIGHT_LIGHT', 'COMPULSION_PENALTY', 'BRIGHT_LIGHT'])
  expect(clanRollAdjustment(fixture, 3).modifiers).toMatchObject({ dicePenalty: 5, sourceIds: ['CLAN-MINISTRY'] })
  expect(clanRollAdjustment(fixture, 3, { pursuingCompulsion: true }).modifiers?.dicePenalty).toBe(3)
})

it('calcula comunicação e detecção Lasombra separadamente', () => {
  const fixture = character('LASOMBRA', ['ELECTRONIC_DETECTION'])
  expect(clanRollAdjustment(fixture, 3)).toMatchObject({ modifiers: { dicePenalty: 3 }, difficulty: undefined })
  expect(clanRollAdjustment(character('LASOMBRA', []), 3, { communication: true })).toMatchObject({ modifiers: { dicePenalty: 0 }, difficulty: 5 })
  expect(() => clanRollAdjustment(character('HECATA', []), 3, { communication: true })).toThrow()
  expect(() => clanRollAdjustment(fixture, null)).toThrow()
})

it.each(['HECATA', 'MINISTRY', 'RAVNOS', 'SALUBRI', 'TZIMISCE'] as const)('permite exceção narrativa aplicável à compulsão de %s', code => {
  expect(clanRollAdjustment(character(code, ['COMPULSION_PENALTY']), null, { pursuingCompulsion: true }).modifiers?.dicePenalty).toBe(0)
})

it.each(['BANU_HAQIM', 'LASOMBRA'] as const)('não dispensa compulsão de %s por mera tentativa', code => {
  expect(() => clanRollAdjustment(character(code, ['COMPULSION_PENALTY']), null, { pursuingCompulsion: true })).toThrow()
})

it('ignora condições de outro clã/mesa e campos desconhecidos', () => {
  const fixture = character('MINISTRY', ['BRIGHT_LIGHT'])
  expect(readClanConditions({ ...fixture, campaignId: 'other' })).toEqual([])
  expect(readClanConditions({ ...fixture, campaignId: null })).toEqual([])
  expect(readClanConditions({ ...fixture, data: { clanCode: 'HECATA' } })).toEqual([])
  expect(readClanConditions({ ...fixture, gameState: {} })).toEqual([])
  expect(validClanRollContext({ dicePenalty: -100 })).toBe(false)
  expect(validClanRollContext({ communication: 'true' })).toBe(false)
  expect(validClanRollContext([])).toBe(false)
  expect(validClanRollContext({ communication: true, pursuingCompulsion: false })).toBe(true)
})
