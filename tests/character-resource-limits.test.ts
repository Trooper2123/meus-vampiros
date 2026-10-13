import { beforeEach, describe, expect, it, vi } from 'vitest'

const session = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: session }))
import { PATCH } from '../app/api/characters/resources/route'

const id = '11111111-1111-4111-8111-111111111111'
const request = (body: unknown) => new Request('http://localhost', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

describe('endpoint legado de recursos sem revisão', () => {
  beforeEach(() => { session.mockResolvedValue({ user: { sub: 'owner' } }) })

  it('não permite usar o fluxo legado para contornar trilhas e autorização narrativa', async () => {
    const response = await PATCH(request({ characterId: id, humanidade: 10, vitalidade: 10, vontade: 10, fome: 0 }))
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ error: expect.stringContaining('revisão') })
  })

  it('exige autenticação', async () => {
    session.mockResolvedValue(null)
    expect((await PATCH(request({ characterId: id }))).status).toBe(401)
  })

  it.each([null, [], {}, { characterId: 'invalid' }])('rejeita identificador inválido %j', async body => {
    expect((await PATCH(request(body))).status).toBe(400)
  })
})
