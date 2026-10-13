import { describe, expect, it } from 'vitest'
import { isMaster } from '../lib/campaigns'

describe('papel de Narrador no claim Auth0', () => {
  it('reconhece o papel mestre sem depender de possuir uma campanha', () => {
    expect(isMaster({ sub: 'narrator', 'https://meus-vampiros.app/roles': ['jogador', 'mestre'] })).toBe(true)
  })

  it.each([null, { sub: 'player' }, { sub: 'player', 'https://meus-vampiros.app/roles': [] }, { sub: 'player', 'https://meus-vampiros.app/roles': ['jogador'] }, { sub: 'player', 'https://meus-vampiros.app/roles': ['modelo.md'] }, { sub: 'player', 'https://meus-vampiros.app/roles': 'mestre' }])('rejeita claim ausente ou inválido: %j', user => {
    expect(isMaster(user)).toBe(false)
  })
})
