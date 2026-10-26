import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { createTestCampaign, createTestCharacter, preparePostgresTest } from './postgres-test-helpers'

const session = vi.hoisted(() => {
  vi.stubEnv('NODE_ENV', 'test')
  return vi.fn()
})
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: session }))

import { changeSpecialty, specialtyView } from '@/lib/character-specialties'
import { getCommandCharacter } from '@/lib/character-commands'
import { updateCharacter } from '@/lib/characters'
import { GET, POST } from '@/app/api/characters/[id]/specialties/route'
import type { Specialty } from '@/lib/vtm-v5/specialties'

let id: string, campaignId: string
const key = '33333333-3333-4333-8333-333333333333'
let context: { params: Promise<{ id: string }> }
const purchase = { kind: 'PURCHASE' as const, skillId: 'briga', name: 'Agarrar', reason: 'Aprendizado', expectedRevision: 0, idempotencyKey: key }
const grant = { ...purchase, kind: 'GRANT' as const, skillId: 'academicos', name: 'História', grantId: 'skill:academicos:first-dot' }

function request(body: unknown): Request {
  return new Request(`http://localhost/api/characters/${id}/specialties`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
}

async function specialties(): Promise<Specialty[]> { return (await getCommandCharacter(id))!.gameState.specialties as Specialty[] }
async function ledger() { return (await db.execute(sql`SELECT id FROM character_ledger_events WHERE character_id = ${id}::uuid`)).rows }
async function editFixture(patch: Record<string, unknown>) { const current = (await getCommandCharacter(id))!; await db.execute(sql`UPDATE characters SET data = ${JSON.stringify({ ...current.data, ...patch })}::jsonb WHERE id = ${id}::uuid`) }

describe('comandos de especialidades e autorização PostgreSQL', () => {
  beforeEach(async () => {
    preparePostgresTest()
    campaignId = (await createTestCampaign('narrator')).id
    id = (await createTestCharacter('player', campaignId, 'Helena', { 'habilidade-erudição': 2, 'habilidade-briga': 2 })).id
    context = { params: Promise.resolve({ id }) }
    await db.execute(sql`UPDATE characters SET total_xp = 10 WHERE id = ${id}::uuid`)
    session.mockReset()
    session.mockResolvedValue({ user: { sub: 'player' } })
  })

  it('compra duas especialidades distintas de Ofícios com um ponto e cobra cada operação uma vez', async () => {
    await db.execute(sql`UPDATE characters SET campaign_id = NULL WHERE id = ${id}::uuid`)
    await editFixture({ 'habilidade-oficios': 1 })
    const first = { ...purchase, skillId: 'oficios', name: 'Pintura' }
    await changeSpecialty('player', id, first)
    const second = { ...first, name: 'Escultura', expectedRevision: (await getCommandCharacter(id))!.revision, idempotencyKey: '44444444-4444-4444-8444-444444444444' }
    const result = await changeSpecialty('player', id, second)
    expect(await changeSpecialty('player', id, second)).toEqual(result)
    expect((await specialties())).toHaveLength(2)
    expect((await getCommandCharacter(id))!.spentXp).toBe(6)
    expect(specialtyView((await getCommandCharacter(id))!, 'player').eligibility.purchase.map(option => option.skillId)).toContain('oficios')
  })

  it('concede especialidade gratuita sem mesa automaticamente', async () => {
    await db.execute(sql`UPDATE characters SET campaign_id = NULL WHERE id = ${id}::uuid`)
    await changeSpecialty('player', id, grant)
    expect((await specialties())[0]).toMatchObject({ status: 'APPROVED', costXp: 0 })
    expect(specialtyView((await getCommandCharacter(id))!, 'player').requiresApproval).toBe(false)
  })

  it('compra independente é aprovada, custa 3 XP e retry não cobra novamente', async () => {
    await db.execute(sql`UPDATE characters SET campaign_id = NULL WHERE id = ${id}::uuid`)
    await expect(changeSpecialty('other-player', id, purchase)).rejects.toMatchObject({ status: 403 })
    const result = await changeSpecialty('player', id, purchase)
    expect((await specialties())[0]).toMatchObject({ status: 'APPROVED', costXp: 3 })
    expect(await changeSpecialty('player', id, purchase)).toEqual(result)
    expect((await getCommandCharacter(id))!.spentXp).toBe(3)
  })

  

  it('seleciona concessão uma vez, preservando especialidade pendente e aprovação em retry', async () => {
    const first = await changeSpecialty('player', id, grant)
    expect((await specialties())).toHaveLength(1)
    expect((await specialties())[0]).toMatchObject({ id: 'specialty:skill:academicos:first-dot', status: 'PENDING', costXp: 0 })
    expect(await changeSpecialty('player', id, grant)).toEqual(first)
    await changeSpecialty('narrator', id, { kind: 'APPROVE', specialtyId: (await specialties())[0].id, reason: 'Revisão', expectedRevision: 1, idempotencyKey: 'approval' })
    expect(await changeSpecialty('player', id, grant)).toEqual(first)
    expect((await specialties())[0].status).toBe('APPROVED')
    expect((await ledger())).toHaveLength(2)
  })

  it('ficha independente recebe especialidade personalizada automaticamente', async () => {
    await db.execute(sql`UPDATE characters SET campaign_id = NULL WHERE id = ${id}::uuid`)
    await changeSpecialty('player', id, { ...grant, grantId: 'creation:additional', skillId: 'briga', name: 'Luta de rua' })
    expect((await specialties())[0]).toMatchObject({ origin: 'CREATION', status: 'APPROVED', costXp: 0 })
    const character = await getCommandCharacter(id)
    expect(specialtyView(character!, 'player').canApprove).toBe(false)
    await expect(changeSpecialty('player', id, { kind: 'APPROVE', specialtyId: (await specialties())[0].id, reason: 'Revisão', expectedRevision: 1, idempotencyKey: 'approval' })).rejects.toMatchObject({ status: 403 })
  })

  it('apenas Narrador da mesa aprova e não reaprova especialidade revisada', async () => {
    await changeSpecialty('player', id, grant)
    const approval = { kind: 'APPROVE' as const, specialtyId: (await specialties())[0].id, reason: 'Revisão', expectedRevision: 1, idempotencyKey: 'approval' }
    await expect(changeSpecialty('player', id, approval)).rejects.toMatchObject({ status: 403 })
    await expect(changeSpecialty('other-narrator', id, approval)).rejects.toMatchObject({ status: 403 })
    await changeSpecialty('narrator', id, approval)
    expect((await specialties())[0].status).toBe('APPROVED')
    await expect(changeSpecialty('narrator', id, { ...approval, expectedRevision: 2, idempotencyKey: 'approval-again' })).rejects.toMatchObject({ status: 409 })
  })

  it('Narrador não aprova concessão cuja habilidade foi removida', async () => {
    await changeSpecialty('player', id, grant)
    await editFixture({ 'habilidade-erudição': 0 })
    await expect(changeSpecialty('narrator', id, { kind: 'APPROVE', specialtyId: (await specialties())[0].id, reason: 'Revisão', expectedRevision: 1, idempotencyKey: 'approval' })).rejects.toMatchObject({ status: 422 })
    expect((await specialties())[0].status).toBe('PENDING')
  })

  it('compra gasta exatamente 3 XP e retry não cobra novamente', async () => {
    const first = await changeSpecialty('player', id, purchase)
    expect(first).toMatchObject({ availableXp: 7, revision: 1 })
    expect((await specialties())[0]).toMatchObject({ origin: 'XP', status: 'APPROVED', costXp: 3 })
    expect(await changeSpecialty('player', id, purchase)).toEqual(first)
    expect((await getCommandCharacter(id))!.spentXp).toBe(3)
    expect((await ledger())).toHaveLength(1)
  })

  it('duas compras concorrentes não ultrapassam saldo nem sobrescrevem revisão', async () => {
    await db.execute(sql`UPDATE characters SET total_xp = 3 WHERE id = ${id}::uuid`)
    const results = await Promise.allSettled([changeSpecialty('player', id, purchase), changeSpecialty('player', id, { ...purchase, name: 'Garras', idempotencyKey: 'second' })])
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.find(result => result.status === 'rejected')).toMatchObject({ reason: { status: 409 } })
    expect((await getCommandCharacter(id))!).toMatchObject({ totalXp: 3, spentXp: 3, revision: 1 })
    await expect(changeSpecialty('player', id, { ...purchase, name: 'Garras', expectedRevision: 1, idempotencyKey: 'third' })).rejects.toMatchObject({ status: 422 })
  })

  it('rejeição de compra pendente legada devolve XP uma vez e exige Narrador', async () => {
    await changeSpecialty('player', id, purchase)
    const pending = (await specialties()).map(specialty => ({ ...specialty, status: 'PENDING' }))
    await db.execute(sql`UPDATE characters SET game_state = jsonb_set(game_state, '{specialties}', ${JSON.stringify(pending)}::jsonb) WHERE id = ${id}::uuid`)
    const rejection = { kind: 'REJECT' as const, specialtyId: (await specialties())[0].id, reason: 'Não aplicável', expectedRevision: 1, idempotencyKey: 'reject' }
    await expect(changeSpecialty('player', id, rejection)).rejects.toMatchObject({ status: 403 })
    const result = await changeSpecialty('narrator', id, rejection)
    expect(await changeSpecialty('narrator', id, rejection)).toEqual(result)
    expect((await getCommandCharacter(id))!.spentXp).toBe(0)
    expect((await specialties())).toEqual([])
    expect((await ledger())).toHaveLength(2)
  })

  it('recusa habilidade inexistente, especialidade duplicada e excesso do limite sem cobrar', async () => {
    await expect(changeSpecialty('player', id, { ...purchase, skillId: 'inexistente' })).rejects.toMatchObject({ status: 422 })
    await changeSpecialty('player', id, purchase)
    await expect(changeSpecialty('player', id, { ...purchase, name: ' AGARRAR ', expectedRevision: 1, idempotencyKey: 'duplicate' })).rejects.toMatchObject({ status: 422 })
    await editFixture({ 'habilidade-briga': 1 })
    await expect(changeSpecialty('player', id, { ...purchase, name: 'Garras', expectedRevision: 1, idempotencyKey: 'limit' })).rejects.toMatchObject({ status: 422 })
    expect((await getCommandCharacter(id))!.spentXp).toBe(3)
    expect((await ledger())).toHaveLength(1)
  })

  it.each([{ totalXp: 10, spentXp: -1 }, { totalXp: -1, spentXp: -5 }, { totalXp: 1, spentXp: 2 }])('recusa estado econômico inconsistente %j', async balance => {
    await db.execute(sql`UPDATE characters SET total_xp = ${balance.totalXp}, spent_xp = ${balance.spentXp} WHERE id = ${id}::uuid`)
    await expect(changeSpecialty('player', id, purchase)).rejects.toMatchObject({ status: 422 })
    expect((await getCommandCharacter(id))!).toMatchObject(balance)
    expect((await ledger())).toHaveLength(0)
  })

  it('API não aceita origem CUSTOM gratuita nem aprovação ou preço forjados', async () => {
    expect((await POST(request({ ...purchase, kind: 'CUSTOM', costXp: 0 }), context)).status).toBe(400)
    const response = await POST(request({ ...purchase, origin: 'CUSTOM', status: 'APPROVED', costXp: 0 }), context)
    expect(response.status).toBe(200)
    expect((await specialties())[0]).toMatchObject({ origin: 'XP', status: 'APPROVED', costXp: 3 })
    expect((await getCommandCharacter(id))!.spentXp).toBe(3)
  })

  it('GET e POST negam sessões ausentes ou acesso a ficha alheia', async () => {
    session.mockResolvedValue(null)
    expect((await GET(new Request('http://localhost'), context)).status).toBe(401)
    expect((await POST(request(purchase), context)).status).toBe(401)
    session.mockResolvedValue({ user: { sub: 'other' } })
    expect((await GET(new Request('http://localhost'), context)).status).toBe(403)
    expect((await POST(request(purchase), context)).status).toBe(403)
    expect((await ledger())).toHaveLength(0)
  })

  it('gera opções canônicas e atualiza elegibilidade depois de salvar habilidades', async () => {
    session.mockResolvedValue({ user: { sub: 'player' } })
    await editFixture({ 'habilidade-Acadêmicos': 2 })
    const before = await (await GET(new Request('http://localhost'), context)).json()
    expect(before.skillValidation.valid).toBe(true)
    expect(before.eligibility.purchase.map((option: { skillId: string }) => option.skillId)).toContain('briga')
    await updateCharacter(id, 'player', { expectedRevision: 0, data: { 'habilidade-Ciência': 1, 'habilidade-briga': 0 } })
    const after = await (await GET(new Request('http://localhost'), context)).json()
    expect(after.revision).toBe(1)
    expect(after.eligibility.purchase.map((option: { skillId: string }) => option.skillId)).not.toContain('briga')
    expect(after.eligibility.grants['skill:ciencia:first-dot']).toEqual([{ skillId: 'ciencia', name: 'Ciência', dots: 1 }])
    expect((await getCommandCharacter(id))!.data).toHaveProperty('habilidade-ciencia', 1)
    expect((await getCommandCharacter(id))!.data).not.toHaveProperty('habilidade-Ciência')
  })

  it('mostra diagnóstico de pontos inválidos e bloqueia escolha sem debitar XP', async () => {
    session.mockResolvedValue({ user: { sub: 'player' } })
    await editFixture({ 'habilidade-briga': true })
    const response = await GET(new Request('http://localhost'), context)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.skillValidation.valid).toBe(false)
    expect(body.eligibility.purchase.some((option: { skillId: string }) => option.skillId === 'briga')).toBe(false)
    expect((await POST(request(purchase), context)).status).toBe(422)
    expect((await getCommandCharacter(id))!.spentXp).toBe(0)
  })

  it('aliases de habilidades preservam a aprovação da ficha', async () => {
    await db.execute(sql`UPDATE characters SET status = 'APPROVED' WHERE id = ${id}::uuid`)
    await updateCharacter(id, 'player', { expectedRevision: 0, data: { 'HABILIDADE-Briga': 3 } })
    expect((await getCommandCharacter(id))!.status).toBe('APPROVED')
    expect((await getCommandCharacter(id))!.data).toHaveProperty('habilidade-briga', 3)
    expect((await getCommandCharacter(id))!.data).not.toHaveProperty('HABILIDADE-Briga')
  })
})
