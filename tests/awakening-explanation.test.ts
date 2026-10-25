import { expect, it } from 'vitest'
import { awakeningExplanation } from '@/lib/vtm-v5/awakening-explanation'

it.each([
  [{ eligible: false, status: 'PENDING_REVIEW', condition: 'ACTIVE' }, 'aprovação ativa'],
  [{ eligible: false, status: 'APPROVED', condition: 'FINAL_DEATH' }, 'Morte definitiva'],
  [{ eligible: false, status: 'APPROVED', condition: 'ACTIVE' }, 'tipo de ficha'],
  [{ eligible: true, status: 'APPROVED', condition: 'TORPOR' }, 'sem rolar'],
  [{ eligible: true, status: 'APPROVED', condition: 'STAKED' }, 'impedido de agir'],
] as const)('explica elegibilidade e restrições sem alterar regras: %j', (character, text) => {
  expect(awakeningExplanation(character)).toContain(text)
})
it('ficha ativa elegível não recebe aviso de bloqueio', () => {
  expect(awakeningExplanation({ eligible: true, status: 'APPROVED', condition: 'ACTIVE' })).toBeNull()
})
