import { expect, it } from 'vitest'
import { normalizeCharacterRulesInput } from '@/lib/vtm-v5/normalize'
import { validateCharacter } from '@/lib/vtm-v5/validation'
const validate = (data: Record<string, unknown>) => validateCharacter(normalizeCharacterRulesInput(data))
it.each(['HUMAN_NPC', 'VAMPIRE_NPC'])('valida %s sem distribuição de jogador', characterType => {
  const base = { characterType, cla: 'Brujah', npc: { mode: 'POOLS', physicalPool: 7, socialPool: 2, mentalPool: 3 } }
  expect(validate(base).valid).toBe(true)
  expect(validate({ ...base, npc: undefined }).errors.map(entry => entry.code)).toContain('NPC_MODE_REQUIRED')
  for (const value of [-1, 0, 2.5, 21, '3', Number.NaN]) expect(validate({ ...base, npc: { ...base.npc, physicalPool: value } }).valid).toBe(false)
})
it('valida NPC simples e completo, poderes e origem vampírica', () => {
  expect(validate({ characterType: 'HUMAN_NPC', npc: { mode: 'SIMPLE', difficulty: 3 } }).valid).toBe(true)
  expect(validate({ characterType: 'HUMAN_NPC', npc: { mode: 'COMPLETE' } }).valid).toBe(false)
  expect(validate({ characterType: 'HUMAN_NPC', npc: { mode: 'SIMPLE', difficulty: 3 }, disciplinas: [{ name: 'Dominação', level: 2, powers: [{ name: 'Um poder' }] }] }).errors.map(entry => entry.code)).toContain('NPC_DISCIPLINES_INVALID')
  expect(validate({ characterType: 'VAMPIRE_NPC', cla: 'Inventado', npc: { mode: 'SIMPLE', difficulty: 3 } }).errors.map(entry => entry.code)).toContain('VAMPIRE_NPC_ORIGIN_REQUIRED')
})
