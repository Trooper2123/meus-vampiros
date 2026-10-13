import { describe, expect, it } from 'vitest'
import { projectIndependentCharacter } from '../lib/character-duplicate'

describe('projeção independente e allowlist aninhada', () => {
  it('preserva escolhas e danos sem copiar informações privadas', () => {
    const source = {
      predatorTypeSelection: { code: 'BAGGER', specialty: 'Medicina', discipline: 'Ofuscação', optionCodes: ['OPTION', 1], masterComment: 'secret', appliedVersion: 99 },
      healthDamage: { superficial: 2, aggravated: 1, masterComment: 'secret' },
      willpowerDamage: { superficial: '2', aggravated: 1 },
      advantages: ['Contato', { narratorNotes: 'secret' }],
      flaws: ['Inimigo', null],
    }
    expect(projectIndependentCharacter(source)).toEqual({
      predatorTypeSelection: { code: 'BAGGER', specialty: 'Medicina', discipline: 'Ofuscação', optionCodes: ['OPTION'], appliedVersion: 1 },
      healthDamage: { superficial: 2, aggravated: 1 },
      willpowerDamage: { aggravated: 1 },
      advantages: ['Contato'], flaws: ['Inimigo'],
    })
  })

  it('mantém defaults de coleções malformadas e poderes em string', () => {
    const projected = projectIndependentCharacter({ vantagens: [null], defeitos: [false], disciplinas: [null, { name: 'Presença', level: 2, powers: ['Fascínio', { name: 'Olhar', effect: 'Efeito', hidden: 'secret' }, null] }] })
    expect(projected).toEqual({
      vantagens: [{ name: '', level: 0, description: '' }],
      defeitos: [{ name: '', level: 0, description: '' }],
      disciplinas: [{ name: '', level: 0, powers: [] }, { name: 'Presença', level: 2, powers: ['Fascínio', { name: 'Olhar', effect: 'Efeito' }, {}] }],
    })
  })

  it('mantém chaves dinâmicas permitidas sem compartilhar referências', () => {
    const source = { 'habilidade-ciência': 3, 'convicoes-crenca-1': 'Convicção', narratorNotes: 'secret', disciplinas: [{ name: 'Presença', powers: ['Fascínio'] }] }
    const result = projectIndependentCharacter(source)
    expect(result).toMatchObject({ 'habilidade-ciência': 3, 'convicoes-crenca-1': 'Convicção' })
    expect(result).not.toHaveProperty('narratorNotes')
    source.disciplinas[0].powers.push('Novo poder')
    expect(result.disciplinas).toEqual([{ name: 'Presença', level: 0, powers: ['Fascínio'] }])
  })
})
