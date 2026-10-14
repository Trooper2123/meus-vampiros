import { beforeEach, describe, expect, it, vi } from 'vitest'

const session = vi.hoisted(() => {
  vi.stubEnv('DATABASE_URL', undefined)
  vi.stubEnv('NODE_ENV', 'test')
  return vi.fn()
})
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: session }))

import { changeSpecialty, specialtyView } from '@/lib/character-specialties'
import { getCommandCharacter } from '@/lib/character-commands'
import { updateCharacter } from '@/lib/characters'
import { GET, POST } from '@/app/api/characters/[id]/specialties/route'
import type { Specialty } from '@/lib/vtm-v5/specialties'

const id = '11111111-1111-4111-8111-111111111111'
const campaignId = '22222222-2222-4222-8222-222222222222'
const key = '33333333-3333-4333-8333-333333333333'
const context = { params: Promise.resolve({ id }) }
const purchase = { kind: 'PURCHASE' as const, skillId: 'briga', name: 'Agarrar', reason: 'Aprendizado', expectedRevision: 0, idempotencyKey: key }
const grant = { ...purchase, kind: 'GRANT' as const, skillId: 'academicos', name: 'História', grantId: 'skill:academicos:first-dot' }

function request(body: unknown): Request {
  return new Request(`http://localhost/api/characters/${id}/specialties`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
}

function specialties(): Specialty[] { return global.__devDb!.characters[0].gameState!.specialties as Specialty[] }

describe('comandos de especialidades e autorização real em memória', () => {
  it('concede especialidade gratuita sem mesa automaticamente', async () => {
    global.__devDb!.characters[0].campaignId = null
    await changeSpecialty('player', id, grant)
    expect(specialties()[0]).toMatchObject({ status: 'APPROVED', costXp: 0 })
    expect(specialtyView((await getCommandCharacter(id))!, 'player').requiresApproval).toBe(false)
  })

  it('compra independente é aprovada, custa 3 XP e retry não cobra novamente', async () => {
    global.__devDb!.characters[0].campaignId = null
    await expect(changeSpecialty('other-player', id, purchase)).rejects.toMatchObject({ status: 403 })
    const result = await changeSpecialty('player', id, purchase)
    expect(specialties()[0]).toMatchObject({ status: 'APPROVED', costXp: 3 })
    expect(await changeSpecialty('player', id, purchase)).toEqual(result)
    expect(global.__devDb!.characters[0].spentXp).toBe(3)
  })

  beforeEach(() => {
    const now = new Date()
    global.__devDb = {
      characters: [{ id, userId: 'player', createdByUserId: 'player', name: 'Helena', concept: null, clan: null, generation: null, status: 'DRAFT', characterType: 'PLAYER_VAMPIRE', campaignId, data: { 'habilidade-erudição': 2, 'habilidade-briga': 2 }, totalXp: 10, spentXp: 0, revision: 0, gameState: {}, createdAt: now, updatedAt: now }],
      campaigns: [{ id: campaignId, masterUserId: 'narrator', name: 'Mesa', theme: null, principios: null, averageXp: null, status: 'Ativa', lastSessionAt: null, createdAt: now, updatedAt: now }], possessions: [], characterLedgerEvents: [],
    }
    session.mockReset()
    session.mockResolvedValue({ user: { sub: 'player' } })
  })

  it('seleciona concessão uma vez, preservando especialidade pendente e aprovação em retry', async () => {
    const first = await changeSpecialty('player', id, grant)
    expect(specialties()).toHaveLength(1)
    expect(specialties()[0]).toMatchObject({ id: 'specialty:skill:academicos:first-dot', status: 'PENDING', costXp: 0 })
    expect(await changeSpecialty('player', id, grant)).toEqual(first)
    await changeSpecialty('narrator', id, { kind: 'APPROVE', specialtyId: specialties()[0].id, reason: 'Revisão', expectedRevision: 1, idempotencyKey: 'approval' })
    expect(await changeSpecialty('player', id, grant)).toEqual(first)
    expect(specialties()[0].status).toBe('APPROVED')
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(2)
  })

  it('ficha independente recebe especialidade personalizada automaticamente', async () => {
    global.__devDb!.characters[0].campaignId = null
    await changeSpecialty('player', id, { ...grant, grantId: 'creation:additional', skillId: 'briga', name: 'Luta de rua' })
    expect(specialties()[0]).toMatchObject({ origin: 'CREATION', status: 'APPROVED', costXp: 0 })
    const character = await getCommandCharacter(id)
    expect(specialtyView(character!, 'player').canApprove).toBe(false)
    await expect(changeSpecialty('player', id, { kind: 'APPROVE', specialtyId: specialties()[0].id, reason: 'Revisão', expectedRevision: 1, idempotencyKey: 'approval' })).rejects.toMatchObject({ status: 403 })
  })

  it('apenas Narrador da mesa aprova e não reaprova especialidade revisada', async () => {
    await changeSpecialty('player', id, purchase)
    const approval = { kind: 'APPROVE' as const, specialtyId: specialties()[0].id, reason: 'Revisão', expectedRevision: 1, idempotencyKey: 'approval' }
    await expect(changeSpecialty('player', id, approval)).rejects.toMatchObject({ status: 403 })
    await expect(changeSpecialty('other-narrator', id, approval)).rejects.toMatchObject({ status: 403 })
    await changeSpecialty('narrator', id, approval)
    expect(specialties()[0].status).toBe('APPROVED')
    await expect(changeSpecialty('narrator', id, { ...approval, expectedRevision: 2, idempotencyKey: 'approval-again' })).rejects.toMatchObject({ status: 409 })
  })

  it('Narrador não aprova concessão cuja habilidade foi removida', async () => {
    await changeSpecialty('player', id, grant)
    global.__devDb!.characters[0].data['habilidade-erudição'] = 0
    await expect(changeSpecialty('narrator', id, { kind: 'APPROVE', specialtyId: specialties()[0].id, reason: 'Revisão', expectedRevision: 1, idempotencyKey: 'approval' })).rejects.toMatchObject({ status: 422 })
    expect(specialties()[0].status).toBe('PENDING')
  })

  it('compra reserva exatamente 3 XP e retry não cobra novamente', async () => {
    const first = await changeSpecialty('player', id, purchase)
    expect(first).toMatchObject({ availableXp: 7, revision: 1 })
    expect(specialties()[0]).toMatchObject({ origin: 'XP', status: 'PENDING', costXp: 3 })
    expect(await changeSpecialty('player', id, purchase)).toEqual(first)
    expect(global.__devDb!.characters[0].spentXp).toBe(3)
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(1)
  })

  it('duas compras concorrentes não ultrapassam saldo nem sobrescrevem revisão', async () => {
    global.__devDb!.characters[0].totalXp = 3
    const results = await Promise.allSettled([changeSpecialty('player', id, purchase), changeSpecialty('player', id, { ...purchase, name: 'Garras', idempotencyKey: 'second' })])
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.find(result => result.status === 'rejected')).toMatchObject({ reason: { status: 409 } })
    expect(global.__devDb!.characters[0]).toMatchObject({ totalXp: 3, spentXp: 3, revision: 1 })
    await expect(changeSpecialty('player', id, { ...purchase, name: 'Garras', expectedRevision: 1, idempotencyKey: 'third' })).rejects.toMatchObject({ status: 422 })
  })

  it('rejeição devolve XP uma vez e jogador não pode rejeitar a própria compra', async () => {
    await changeSpecialty('player', id, purchase)
    const rejection = { kind: 'REJECT' as const, specialtyId: specialties()[0].id, reason: 'Não aplicável', expectedRevision: 1, idempotencyKey: 'reject' }
    await expect(changeSpecialty('player', id, rejection)).rejects.toMatchObject({ status: 403 })
    const result = await changeSpecialty('narrator', id, rejection)
    expect(await changeSpecialty('narrator', id, rejection)).toEqual(result)
    expect(global.__devDb!.characters[0].spentXp).toBe(0)
    expect(specialties()).toEqual([])
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(2)
  })

  it('recusa habilidade inexistente, especialidade duplicada e excesso do limite sem cobrar', async () => {
    await expect(changeSpecialty('player', id, { ...purchase, skillId: 'inexistente' })).rejects.toMatchObject({ status: 422 })
    await changeSpecialty('player', id, purchase)
    await expect(changeSpecialty('player', id, { ...purchase, name: ' AGARRAR ', expectedRevision: 1, idempotencyKey: 'duplicate' })).rejects.toMatchObject({ status: 422 })
    global.__devDb!.characters[0].data['habilidade-briga'] = 1
    await expect(changeSpecialty('player', id, { ...purchase, name: 'Garras', expectedRevision: 1, idempotencyKey: 'limit' })).rejects.toMatchObject({ status: 422 })
    expect(global.__devDb!.characters[0].spentXp).toBe(3)
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(1)
  })

  it.each([{ totalXp: 10, spentXp: -1 }, { totalXp: -1, spentXp: -5 }, { totalXp: 10.5, spentXp: 0.5 }])('recusa estado econômico inconsistente %j', async balance => {
    Object.assign(global.__devDb!.characters[0], balance)
    await expect(changeSpecialty('player', id, purchase)).rejects.toMatchObject({ status: 422 })
    expect(global.__devDb!.characters[0]).toMatchObject(balance)
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
  })

  it('API não aceita origem CUSTOM gratuita nem aprovação ou preço forjados', async () => {
    expect((await POST(request({ ...purchase, kind: 'CUSTOM', costXp: 0 }), context)).status).toBe(400)
    const response = await POST(request({ ...purchase, origin: 'CUSTOM', status: 'APPROVED', costXp: 0 }), context)
    expect(response.status).toBe(200)
    expect(specialties()[0]).toMatchObject({ origin: 'XP', status: 'PENDING', costXp: 3 })
    expect(global.__devDb!.characters[0].spentXp).toBe(3)
  })

  it('GET e POST negam sessões ausentes ou acesso a ficha alheia', async () => {
    session.mockResolvedValue(null)
    expect((await GET(new Request('http://localhost'), context)).status).toBe(401)
    expect((await POST(request(purchase), context)).status).toBe(401)
    session.mockResolvedValue({ user: { sub: 'other' } })
    expect((await GET(new Request('http://localhost'), context)).status).toBe(403)
    expect((await POST(request(purchase), context)).status).toBe(403)
    expect(global.__devDb!.characterLedgerEvents).toHaveLength(0)
  })

  it('gera opções canônicas e atualiza elegibilidade depois de salvar habilidades', async () => {
    session.mockResolvedValue({ user: { sub: 'player' } })
    const record = global.__devDb!.characters[0]
    record.data['habilidade-Acadêmicos'] = 2
    const before = await (await GET(new Request('http://localhost'), context)).json()
    expect(before.skillValidation.valid).toBe(true)
    expect(before.eligibility.purchase.map((option: { skillId: string }) => option.skillId)).toContain('briga')
    await updateCharacter(id, 'player', { expectedRevision: 0, data: { 'habilidade-Ciência': 1, 'habilidade-briga': 0 } })
    const after = await (await GET(new Request('http://localhost'), context)).json()
    expect(after.revision).toBe(1)
    expect(after.eligibility.purchase.map((option: { skillId: string }) => option.skillId)).not.toContain('briga')
    expect(after.eligibility.grants['skill:ciencia:first-dot']).toEqual([{ skillId: 'ciencia', name: 'Ciência', dots: 1 }])
    expect(record.data).toHaveProperty('habilidade-ciencia', 1)
    expect(record.data).not.toHaveProperty('habilidade-Ciência')
  })

  it('mostra diagnóstico de pontos inválidos e bloqueia escolha sem debitar XP', async () => {
    session.mockResolvedValue({ user: { sub: 'player' } })
    global.__devDb!.characters[0].data['habilidade-briga'] = true
    const response = await GET(new Request('http://localhost'), context)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.skillValidation.valid).toBe(false)
    expect(body.eligibility.purchase.some((option: { skillId: string }) => option.skillId === 'briga')).toBe(false)
    expect((await POST(request(purchase), context)).status).toBe(422)
    expect(global.__devDb!.characters[0].spentXp).toBe(0)
  })

  it('aliases de habilidades não contornam a revisão de uma ficha aprovada', async () => {
    const record = global.__devDb!.characters[0]
    record.status = 'APPROVED'
    await updateCharacter(id, 'player', { expectedRevision: 0, data: { 'HABILIDADE-Briga': 3 } })
    expect(record.status).toBe('DRAFT')
    expect(record.data).toHaveProperty('habilidade-briga', 3)
    expect(record.data).not.toHaveProperty('HABILIDADE-Briga')
  })
})
