import { expect, it } from 'vitest'
import { characterText } from '@/lib/vtm-v5/text'
import { normalizeCharacterRulesInput } from '@/lib/vtm-v5/normalize'
import { normalizePredatorTypeWithWarning } from '@/lib/vtm-v5/predator-types/normalize'

it.each([{}, [], true, null, undefined, Number.NaN, Infinity])('não converte entrada inválida em texto de ficha: %j', value => {
  expect(characterText(value)).toBe('')
})
it('preserva texto e números finitos sem executar conversão de objetos', () => {
  expect(characterText('Ventrue')).toBe('Ventrue')
  expect(characterText(12)).toBe('12')
  expect(characterText({ toString() { throw new Error('não executar') } })).toBe('')
})

it('aviso de predação desconhecida não executa conversão de objeto', () => {
  const result = normalizePredatorTypeWithWarning({ toString() { throw new Error('não executar') } })
  expect(result.warning?.message).toContain('valor inválido')
  expect(normalizePredatorTypeWithWarning('Desconhecido').warning?.message).toContain('Desconhecido')
})
it('objetos não satisfazem nomes, convicções ou vantagens', () => {
  const input = normalizeCharacterRulesInput({ cla: {}, predador: {}, disciplinas: [{ name: {}, level: 1 }], 'convicoes-crenca-1': {}, 'convicoes-pilar-1': [], advantages: [{}], flaws: [{}] })
  expect(input).toMatchObject({ clan: null, predatorType: null, advantages: [], flaws: [], convictions: [{ text: '', touchstone: '' }, { text: '', touchstone: '' }, { text: '', touchstone: '' }], disciplines: [{ name: '' }] })
})
