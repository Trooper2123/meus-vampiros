import { beforeEach, describe, expect, it, vi } from 'vitest'

const session = vi.hoisted(() => { vi.stubEnv('DATABASE_URL', undefined); vi.stubEnv('NODE_ENV', 'test'); return vi.fn() })
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: session }))

import { changeCharacterResources } from '@/lib/character-resources'
import { getCommandCharacter } from '@/lib/character-commands'
import { GET, PATCH } from '@/app/api/characters/[id]/resources/route'

const id = '11111111-1111-4111-8111-111111111111'
const campaignId = '22222222-2222-4222-8222-222222222222'

describe('recursos de sessão com provider real em memória', () => {
  beforeEach(() => {
    session.mockResolvedValue({ user: { sub: 'player' } })
    const now = new Date()
    global.__devDb = {
      characters: [{ id, userId: 'player', createdByUserId: 'player', name: 'Helena', concept: null, clan: null, generation: null, status: 'APPROVED', characterType: 'PLAYER_VAMPIRE', campaignId, data: { vigor: 2, determinacao: 3, compostura: 2, humanidade: 7, fome: 1 }, totalXp: 10, spentXp: 0, revision: 0, gameState: { hunger: 1, healthDamage: { superficial: 0, aggravated: 0 }, healthCurrent: 5, willpowerDamage: { superficial: 0, aggravated: 0 }, willpowerCurrent: 5, condition: 'TORPOR', torpor: { cause: 'HUNGER', humanityAtEntry: 7 } }, createdAt: now, updatedAt: now }],
      campaigns: [{ id: campaignId, masterUserId: 'narrator', name: 'Mesa', theme: null, principios: null, averageXp: null, status: 'Ativa', lastSessionAt: null, createdAt: now, updatedAt: now }], possessions: [], characterLedgerEvents: [],
    }
  })

  it('proprietário altera Fome e danos mantendo condição e recursos independentes', async () => {
    const changes = { hunger: 3, healthDamage: { superficial: 2, aggravated: 1 }, willpowerDamage: { superficial: 1, aggravated: 1 } }
    const result = await changeCharacterResources('player', id, changes, '  Combate  ', 0, 'damage')
    expect(result).toMatchObject({ ok: true, revision: 1, state: { hunger: 3, healthCurrent: 2, willpowerCurrent: 3, condition: 'TORPOR', torpor: { cause: 'HUNGER' } }, maxima: { healthMax: 5, willpowerMax: 5 } })
    expect(global.__devDb!.characterLedgerEvents[0]).toMatchObject({ createdByUserId: 'player', eventType: 'RESOURCES_CHANGED', payload: { input: { reason: 'Combate', changes }, before: { revision: 0, gameState: { hunger: 1 } }, after: { revision: 1, state: { hunger: 3 } } } })
    expect((await getCommandCharacter(id))!.gameState).toMatchObject({ hunger: 3, healthDamage: changes.healthDamage, condition: 'TORPOR' })
  })

  it('terceiros e Narradores de outras mesas não alteram recursos', async () => {
    for (const actor of ['other', 'other-narrator']) await expect(changeCharacterResources(actor, id, { hunger: 3 }, 'Sessão', 0, actor)).rejects.toMatchObject({ status: 403 })
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
  })

  it.each([{ humanity: 6 }, { stains: 2 }, { hunger: 3, humanity: 6 }])('proprietário altera campos narrativos %j com histórico', async changes => {
    const result = await changeCharacterResources('player', id, changes, 'Sessão', 0, 'narrative-player')
    expect(result).toMatchObject({ ok: true, revision: 1, state: changes })
    expect(global.__devDb!.characterLedgerEvents[0]).toMatchObject({ createdByUserId: 'player', payload: { input: { changes } } })
  })

  it('Narrador altera Humanidade e manchas sem remover torpor ou sua causa', async () => {
    const result = await changeCharacterResources('narrator', id, { humanity: 6, stains: 2 }, 'Consequência', 0, 'narrative')
    expect(result).toMatchObject({ state: { humanity: 6, stains: 2, condition: 'TORPOR', torpor: { cause: 'HUNGER', humanityAtEntry: 7 } } })
    expect(global.__devDb!.characterLedgerEvents[0].createdByUserId).toBe('narrator')
  })

  it.each([{ hunger: -1 }, { hunger: 6 }, { hunger: 1.5 }, { hunger: '2' }, { hunger: Infinity }, { humanity: 11 }, { stains: -1 }, { stains: 11 }, { healthDamage: { superficial: -1, aggravated: 0 } }, { healthDamage: { superficial: 1.5, aggravated: 0 } }, { healthDamage: { superficial: 4, aggravated: 2 } }, { willpowerDamage: { superficial: 5, aggravated: 1 } }, { healthDamage: { superficial: 1 } }, { healthDamage: [] }, { healthDamage: { superficial: 0, aggravated: 0, current: 5 } }])('recusa recurso fora do formato ou limite %j', async changes => {
    await expect(changeCharacterResources('narrator', id, changes, 'Sessão', 0, 'invalid')).rejects.toMatchObject({ status: 400 })
    expect(global.__devDb!.characters[0].revision).toBe(0)
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
  })

  it('aceita extremos de Fome e dano máximo', async () => {
    await changeCharacterResources('player', id, { hunger: 0, healthDamage: { superficial: 2, aggravated: 3 } }, 'Combate', 0, 'bounds')
    expect(global.__devDb!.characters[0].gameState).toMatchObject({ hunger: 0, healthCurrent: 0 })
    await changeCharacterResources('player', id, { hunger: 5 }, 'Sessão', 1, 'hunger-five')
    expect(global.__devDb!.characters[0].gameState!.hunger).toBe(5)
  })

  it('registra Fome zero e motivo sem XP ou penalidades narrativas automáticas', async () => {
    const result = await changeCharacterResources('player', id, { hunger: 0 }, 'Ação tabu confirmada', 0, 'zero-hunger')
    expect(result).toMatchObject({ state: { hunger: 0, humanity: 7, stains: 0 } })
    expect(global.__devDb!.characters[0]).toMatchObject({ totalXp: 10, spentXp: 0 })
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(1)
    expect(global.__devDb!.characterLedgerEvents[0]).toMatchObject({ eventType: 'RESOURCES_CHANGED', payload: { input: { changes: { hunger: 0 }, reason: 'Ação tabu confirmada' }, before: { gameState: { hunger: 1 } }, after: { state: { hunger: 0 } } } })
  })

  it('conflito de revisão não sobrescreve danos e retry retorna resposta original após outro comando', async () => {
    const first = await changeCharacterResources('player', id, { hunger: 2 }, 'Sessão', 0, 'first')
    await changeCharacterResources('player', id, { healthDamage: { superficial: 2, aggravated: 0 } }, 'Combate', 1, 'second')
    await expect(changeCharacterResources('player', id, { hunger: 3 }, 'Sessão', 0, 'stale')).rejects.toMatchObject({ status: 409 })
    expect(await changeCharacterResources('player', id, { hunger: 2 }, 'Sessão', 0, 'first')).toEqual(first)
    expect(global.__devDb!.characters[0].gameState).toMatchObject({ hunger: 2, healthDamage: { superficial: 2, aggravated: 0 } })
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(2)
  })

  it('alteração concorrente com mesma revisão aceita somente um comando', async () => {
    const results = await Promise.allSettled([changeCharacterResources('player', id, { hunger: 2 }, 'Sessão', 0, 'first'), changeCharacterResources('player', id, { healthDamage: { superficial: 1, aggravated: 0 } }, 'Combate', 0, 'second')])
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.find(result => result.status === 'rejected')).toMatchObject({ reason: { status: 409 } })
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(1)
  })

  it('mudança do máximo preserva dano e calcula o atual sem recuperar dano consumido', async () => {
    await changeCharacterResources('player', id, { healthDamage: { superficial: 2, aggravated: 1 } }, 'Combate', 0, 'damage')
    global.__devDb!.characters[0].data.vigor = 4
    const result = await changeCharacterResources('player', id, { hunger: 3 }, 'Sessão', 1, 'hunger')
    expect(result).toMatchObject({ maxima: { healthMax: 7 }, state: { healthDamage: { superficial: 2, aggravated: 1 }, healthCurrent: 4 } })
  })

  it.each([{}, { condition: 'ACTIVE' }, { torpor: null }, { healthCurrent: 5 }])('não aceita campos livres nem remoção de condição %j', changes => {
    expect(() => changeCharacterResources('player', id, changes, 'Sessão', 0, 'invalid')).toThrow()
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
  })

  function request(changes: Record<string, unknown> = { hunger: 0 }) {
    return new Request(`http://localhost/api/characters/${id}/resources`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ changes, reason: 'Ação confirmada', expectedRevision: 0, idempotencyKey: '33333333-3333-4333-8333-333333333333' }) })
  }
  const context = { params: Promise.resolve({ id }) }

  it('rota bloqueia leitura e alteração sem autenticação', async () => {
    session.mockResolvedValue(null)
    expect((await GET(request(), context)).status).toBe(401)
    expect((await PATCH(request(), context)).status).toBe(401)
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
  })

  it.each(['other-player', 'other-narrator'])('rota impede IDOR de %s', async actor => {
    session.mockResolvedValue({ user: { sub: actor } })
    expect((await GET(request(), context)).status).toBe(403)
    expect((await PATCH(request({ humanity: 6, stains: 2 }), context)).status).toBe(403)
    expect(global.__devDb!.characters[0].gameState!.hunger).toBe(1)
  })

  it('rota permite ao proprietário alterar Humanidade e Manchas', async () => {
    const response = await PATCH(request({ humanity: 8, stains: 2 }), context)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ ok: true, state: { humanity: 8, stains: 2 } })
  })

  it('respostas do jogador omitem informação privada de torpor', async () => {
    const read = await (await GET(request(), context)).json()
    expect(read.canEditNarrative).toBe(true)
    expect(read.state).not.toHaveProperty('torpor')
    const changed = await (await PATCH(request(), context)).json()
    expect(changed.state).not.toHaveProperty('torpor')
    expect(global.__devDb!.characters[0].gameState).toHaveProperty('torpor')
    expect(changed).toMatchObject({ ok: true, revision: 1, state: { hunger: 0 } })
  })

  it('rotas validam identificadores e limites recebidos', async () => {
    const invalid = { params: Promise.resolve({ id: '../../other' }) }
    expect((await GET(request(), invalid)).status).toBe(400)
    expect((await PATCH(request(), invalid)).status).toBe(400)
    expect((await PATCH(request({ hunger: 6 }), context)).status).toBe(400)
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
  })
})
