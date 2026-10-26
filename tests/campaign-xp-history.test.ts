import { randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { beforeEach, expect, it, vi } from 'vitest'
const auth = vi.hoisted(() => ({ actor: 'xp-master' }))
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: async () => auth.actor ? { user: { sub: auth.actor } } : null }))
import { db } from '@/lib/db'
import { createTestCampaign, createTestCharacter, preparePostgresTest } from './postgres-test-helpers'
import { getCommandCharacter, runCharacterCommand } from '@/lib/character-commands'
import { changeSpecialty } from '@/lib/character-specialties'
import { grantCharacterXp } from '@/lib/character-xp'
import { changeCharacterDiscipline } from '@/lib/character-disciplines'
import { updateCharacter } from '@/lib/characters'
import { getCampaignXpHistory, markCampaignXpViewed, xpHistoryFilters } from '@/lib/campaign-xp-history'
import { GET, PATCH } from '@/app/api/campaigns/[id]/xp-history/route'
import { PATCH as status } from '@/app/api/characters/[id]/status/route'

const filters = (query = '') => xpHistoryFilters(new URLSearchParams(query))
const context = (id: string) => ({ params: Promise.resolve({ id }) })
const request = (id: string, body: unknown, origin = 'http://localhost') => new Request(`http://localhost/api/campaigns/${id}/xp-history`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body) })
async function setup(balance = 50) {
  preparePostgresTest()
  const campaign = await createTestCampaign('xp-master')
  const character = await createTestCharacter('xp-player', campaign.id, 'Rai teste', { cla: 'Brujah', 'habilidade-briga': 3, humanidade: 7, disciplinas: [{ id: 'cel', name: 'Rapidez', level: 2 }, { id: 'pot', name: 'Potência', level: 1 }] })
  await db.execute(sql`UPDATE characters SET status = 'APPROVED', total_xp = ${balance}, game_state = '{"privateNarrator":"segredo de teste"}'::jsonb WHERE id = ${character.id}::uuid`)
  return { campaign, character }
}
async function purchase(id: string, name = 'Agarrar', revision = 0, key = randomUUID()) {
  return changeSpecialty('xp-player', id, { kind: 'PURCHASE', skillId: 'briga', name, reason: 'Treino', expectedRevision: revision, idempotencyKey: key })
}
beforeEach(() => { auth.actor = 'xp-master' })

it('compra especialidade ativa uma vez, mantém aprovação e registra custo real sem níveis fictícios', async () => {
  const { campaign, character } = await setup()
  const key = randomUUID()
  const result = await purchase(character.id, 'Agarrar', 0, key)
  expect(await purchase(character.id, 'Agarrar', 0, key)).toEqual(result)
  const current = (await getCommandCharacter(character.id))!
  expect(current).toMatchObject({ status: 'APPROVED', spentXp: 3, totalXp: 50, revision: 1 })
  expect(current.gameState.specialties).toEqual([expect.objectContaining({ status: 'APPROVED', origin: 'XP', costXp: 3 })])
  expect(current.gameState.campaignApprovals).toHaveProperty(campaign.id)
  const history = await getCampaignXpHistory('xp-master', campaign.id, filters())
  expect(history).toMatchObject({ total: 1, unread: 1, characters: [{ totalXp: 50, spentXp: 3, availableXp: 47 }] })
  expect(history.entries[0]).toMatchObject({ type: 'XP_SPENT', category: 'SPECIALTY', traitName: 'Agarrar', xpAmount: 3, previousValue: null, newValue: null, source: 'XP', viewed: false })
  expect(JSON.stringify(history)).not.toContain('segredo de teste')
  expect(JSON.stringify(history)).not.toContain('gameState')
})

it('compra Disciplina pelo mecanismo V5, preservando aprovação e pré-requisitos', async () => {
  const { campaign, character } = await setup()
  const command = { kind: 'PURCHASE' as const, disciplineId: 'CELERITY', targetLevel: 3, reason: 'Treino', expectedRevision: 0, idempotencyKey: randomUUID() }
  await expect(changeCharacterDiscipline('xp-player', character.id, command)).rejects.toMatchObject({ status: 422 })
  await changeCharacterDiscipline('xp-master', character.id, { ...command, kind: 'AUTHORIZE', acquisitionSource: 'XP', requirement: 'LEARNING_APPROVAL' })
  const purchaseCommand = { ...command, expectedRevision: 1, idempotencyKey: randomUUID() }
  await changeCharacterDiscipline('xp-player', character.id, purchaseCommand)
  await changeCharacterDiscipline('xp-player', character.id, purchaseCommand)
  expect(await getCommandCharacter(character.id)).toMatchObject({ status: 'APPROVED', spentXp: 15 })
  const history = await getCampaignXpHistory('xp-master', campaign.id, filters('category=DISCIPLINE'))
  expect(history.entries).toHaveLength(1)
  expect(history.entries[0]).toMatchObject({ category: 'DISCIPLINE', previousValue: 2, newValue: 3, xpAmount: 15 })
})

it('edições de atributos, habilidades e características não geram nova pendência nem compra fictícia', async () => {
  const { campaign, character } = await setup()
  await updateCharacter(character.id, 'xp-player', { data: { forca: 3, 'habilidade-briga': 4 }, expectedRevision: 0 })
  expect(await getCommandCharacter(character.id)).toMatchObject({ status: 'APPROVED' })
  expect((await getCampaignXpHistory('xp-master', campaign.id, filters())).entries).toEqual([])
  expect((await status(request(character.id, { status: 'DRAFT' }), context(character.id))).status).toBe(409)
})

it('leitura é idempotente, preserva histórico e não marca compras futuras', async () => {
  const { campaign, character } = await setup()
  await purchase(character.id)
  const first = (await getCampaignXpHistory('xp-master', campaign.id, filters())).entries[0]
  await Promise.all([markCampaignXpViewed('xp-master', campaign.id, [first.id]), markCampaignXpViewed('xp-master', campaign.id, [first.id])])
  await purchase(character.id, 'Soco', 1)
  expect(await getCampaignXpHistory('xp-master', campaign.id, filters())).toMatchObject({ total: 2, unread: 1 })
  const viewed = await getCampaignXpHistory('xp-master', campaign.id, filters('viewed=true'))
  expect(viewed.entries.map(entry => entry.id)).toEqual([first.id])
  expect((await getCampaignXpHistory('xp-master', campaign.id, filters('viewed=false'))).entries).toHaveLength(1)
  const receipts = await db.execute(sql`SELECT id FROM character_ledger_events WHERE character_id = ${character.id}::uuid AND event_type = 'XP_HISTORY_VIEWED'`)
  expect(receipts.rows).toHaveLength(1)
})

it('aprovação sobrevive a arquivamento/reativação sem nova aprovação', async () => {
  const { character } = await setup()
  expect((await status(request(character.id, { status: 'ARCHIVED', expectedRevision: 0 }), context(character.id))).status).toBe(200)
  expect(await getCommandCharacter(character.id)).toMatchObject({ status: 'ARCHIVED' })
  const reactivated = await status(request(character.id, { status: 'DRAFT', expectedRevision: 1 }), context(character.id))
  expect(reactivated.status).toBe(200)
  expect(await reactivated.json()).toMatchObject({ status: 'APPROVED' })
  expect(await getCommandCharacter(character.id)).toMatchObject({ status: 'APPROVED' })
})

it('antes da aprovação, permite solicitar correções e rejeitar sem conceder aprovação', async () => {
  const { character } = await setup()
  await db.execute(sql`UPDATE characters SET status = 'PENDING_REVIEW' WHERE id = ${character.id}::uuid`)
  expect((await status(request(character.id, { status: 'DRAFT', expectedRevision: 0 }), context(character.id))).status).toBe(200)
  expect(await getCommandCharacter(character.id)).toMatchObject({ status: 'DRAFT' })
  await db.execute(sql`UPDATE characters SET status = 'PENDING_REVIEW' WHERE id = ${character.id}::uuid`)
  expect((await status(request(character.id, { status: 'ARCHIVED', expectedRevision: 1 }), context(character.id))).status).toBe(200)
  expect((await getCommandCharacter(character.id))!.gameState.campaignApprovals).toBeUndefined()
})

it('paginação mantém ordenação recente e resume as últimas compras independentemente dos filtros', async () => {
  const { campaign, character } = await setup()
  await purchase(character.id)
  for (let index = 0; index < 31; index++) await grantCharacterXp('xp-master', character.id, 1, 'Sessão teste', randomUUID())
  const first = await getCampaignXpHistory('xp-master', campaign.id, filters())
  const second = await getCampaignXpHistory('xp-master', campaign.id, filters('page=2'))
  expect(first.entries).toHaveLength(30)
  expect(second.entries).toHaveLength(2)
  expect(first.total).toBe(32)
  expect(new Set([...first.entries, ...second.entries].map(entry => entry.id)).size).toBe(32)
  expect(first.characters[0]).toMatchObject({ totalXp: 81, spentXp: 3, availableXp: 78, recentPurchases: [{ traitName: 'Agarrar', xpAmount: 3 }] })
  expect(first.entries[0].createdAt >= second.entries[0].createdAt).toBe(true)
})

it('falha na gravação do ledger reverte também a compra e o saldo', async () => {
  const { campaign, character } = await setup()
  await expect(runCharacterCommand('xp-player', character.id, { type: null as unknown as string, key: randomUUID(), payload: {} }, () => true, current => { current.spentXp += 3; return { ok: true } })).rejects.toThrow()
  expect(await getCommandCharacter(character.id)).toMatchObject({ spentXp: 0, revision: 0, status: 'APPROVED' })
  expect((await getCampaignXpHistory('xp-master', campaign.id, filters())).total).toBe(0)
})

it('compras concorrentes não excedem o saldo nem duplicam a mesma requisição', async () => {
  const { campaign, character } = await setup(3)
  const key = randomUUID()
  await Promise.all([purchase(character.id, 'Agarrar', 0, key), purchase(character.id, 'Agarrar', 0, key)])
  await expect(purchase(character.id, 'Soco', 1)).rejects.toMatchObject({ status: 422 })
  expect(await getCommandCharacter(character.id)).toMatchObject({ spentXp: 3, totalXp: 3 })
  expect((await getCampaignXpHistory('xp-master', campaign.id, filters())).total).toBe(1)
})

it('concessão é auditável, não conta como nova compra e filtra por personagem/categoria/período', async () => {
  const { campaign, character } = await setup()
  await grantCharacterXp('xp-master', character.id, 5, 'Sessão', randomUUID(), campaign.id)
  const history = await getCampaignXpHistory('xp-master', campaign.id, filters(`characterId=${character.id}&category=XP&from=2020-01-01&to=2099-12-31`))
  expect(history).toMatchObject({ total: 1, unread: 0, characters: [{ totalXp: 55, spentXp: 0, availableXp: 55 }] })
  expect(history.entries[0]).toMatchObject({ type: 'XP_GRANTED', xpAmount: 5 })
  expect((await getCampaignXpHistory('xp-master', campaign.id, filters('to=2000-01-01'))).total).toBe(0)
})

it('ajustes e estornos adicionam eventos sem apagar a compra original', async () => {
  const { campaign, character } = await setup()
  await purchase(character.id)
  await runCharacterCommand('xp-master', character.id, { key: randomUUID(), type: 'XP_CORRECTION', payload: { reason: 'Correção' } }, current => current.masterId === 'xp-master', current => { current.spentXp -= 3; return { ok: true } })
  const history = await getCampaignXpHistory('xp-master', campaign.id, filters())
  expect(history.entries.map(entry => entry.type)).toEqual(['XP_REFUNDED', 'XP_SPENT'])
  expect(history.characters[0].availableXp).toBe(50)
})

it('nega acesso não autenticado, jogador, terceiro e outro Narrador', async () => {
  const { campaign, character } = await setup()
  await purchase(character.id)
  for (const [actor, expected] of [['', 401], ['xp-player', 403], ['intruso', 403], ['outro-narrador', 403]] as const) {
    auth.actor = actor
    expect((await GET(new Request(`http://localhost/api/campaigns/${campaign.id}/xp-history`), context(campaign.id))).status).toBe(expected)
    expect((await PATCH(request(campaign.id, { eventIds: [randomUUID()] }), context(campaign.id))).status).toBe(expected)
  }
})

it('impede IDs cruzados e origem hostil sem gravar recibos', async () => {
  const first = await setup(), second = await setup()
  await purchase(first.character.id)
  const event = (await getCampaignXpHistory('xp-master', first.campaign.id, filters())).entries[0]
  expect((await PATCH(request(second.campaign.id, { eventIds: [event.id] }), context(second.campaign.id))).status).toBe(403)
  expect((await PATCH(request(first.campaign.id, { eventIds: [event.id] }, 'https://hostil.example'), context(first.campaign.id))).status).toBe(403)
  expect((await GET(new Request(`http://localhost/api/campaigns/${second.campaign.id}/xp-history?characterId=${first.character.id}`), context(second.campaign.id))).status).toBe(403)
  expect((await getCampaignXpHistory('xp-master', first.campaign.id, filters())).unread).toBe(1)
})

it('revalida troca de Narrador e impede vazamento de compras para outra campanha', async () => {
  const { campaign, character } = await setup()
  await purchase(character.id)
  await db.execute(sql`UPDATE campaigns SET master_user_id = 'novo-master' WHERE id = ${campaign.id}::uuid`)
  await expect(getCampaignXpHistory('xp-master', campaign.id, filters())).rejects.toMatchObject({ status: 403 })
  const other = await createTestCampaign('xp-master')
  await db.execute(sql`UPDATE characters SET campaign_id = ${other.id}::uuid, status = 'DRAFT' WHERE id = ${character.id}::uuid`)
  expect((await getCampaignXpHistory('xp-master', other.id, filters())).entries).toEqual([])
  await runCharacterCommand('xp-player', character.id, { key: randomUUID(), type: 'CHARACTER_EDITED', payload: {} }, current => current.ownerId === 'xp-player', () => ({ ok: true }))
  expect(await getCommandCharacter(character.id)).toMatchObject({ status: 'DRAFT' })
})

it.each(['page=-1', 'page=abc', 'page=100001', 'from=2026-02-30', 'from=2026-02-02&to=2026-01-01', 'category=ADMIN', 'viewed=sim', 'characterId=%27%20OR%201%3D1', 'page=1&page=2', 'unknown=x'])('rejeita filtro inválido %s', query => {
  expect(() => filters(query)).toThrow()
})

it('valida IDs de campanha, lote, campos forjados e JSON inválido', async () => {
  const { campaign } = await setup()
  expect((await GET(new Request('http://localhost/api/campaigns/invalido/xp-history'), context('invalido'))).status).toBe(400)
  for (const body of [{ eventIds: [] }, { eventIds: Array(31).fill(randomUUID()) }, { eventIds: ['malicioso'] }, { eventIds: [randomUUID()], actorId: 'intruso' }]) expect((await PATCH(request(campaign.id, body), context(campaign.id))).status).toBe(400)
})
