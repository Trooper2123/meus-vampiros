import { describe, expect, it, vi } from 'vitest'

const execute = vi.hoisted(() => vi.fn())
vi.mock('@/lib/db', () => ({ db: { execute } }))
import { hasMasterAccess } from '@/lib/campaigns'

describe('perfil único autenticado', () => {
  it.each([
    { sub: 'user' },
    { sub: 'user', 'https://meus-vampiros.app/roles': [] },
    { sub: 'user', 'https://meus-vampiros.app/roles': ['jogador'] },
    { sub: 'user', 'https://meus-vampiros.app/roles': ['mestre'] },
  ])('permite funcionalidades comuns independentemente de roles: %j', async user => {
    expect(await hasMasterAccess(user)).toBe(true)
    expect(execute).not.toHaveBeenCalled()
  })

  it.each([null, { sub: '' }, { sub: '   ' }])('exige identidade autenticada válida: %j', async user => {
    expect(await hasMasterAccess(user)).toBe(false)
  })
})
