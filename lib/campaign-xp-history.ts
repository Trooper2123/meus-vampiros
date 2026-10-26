import { sql } from 'drizzle-orm'
import { db } from './db'
import { CharacterCommandError } from './character-commands'
import type { XpTransaction } from './xp-transactions'

export type XpHistoryFilters = { characterId?: string; category?: string; from?: string; to?: string; viewed?: string; page: number }
export type XpHistoryEntry = XpTransaction & { id: string; characterId: string; characterName: string; player: string; createdAt: string; viewed: boolean }
export type XpHistory = {
  entries: XpHistoryEntry[]; total: number; unread: number; page: number
  characters: { id: string; name: string; totalXp: number; spentXp: number; availableXp: number; recentPurchases: { traitName: string; xpAmount: number }[] }[]
}
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i
export function xpHistoryFilters(params: URLSearchParams): XpHistoryFilters {
  if ([...params.keys()].some(key => !['characterId', 'category', 'from', 'to', 'viewed', 'page'].includes(key))) throw new CharacterCommandError(400, 'Filtro inválido.')
  for (const key of params.keys()) if (params.getAll(key).length !== 1) throw new CharacterCommandError(400, 'Filtro repetido.')
  const characterId = params.get('characterId') || undefined
  const category = params.get('category') || undefined
  const from = params.get('from') || undefined
  const to = params.get('to') || undefined
  const viewed = params.get('viewed') || undefined
  const page = Number(params.get('page') ?? 1)
  const validDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date
  if ((characterId && !uuid.test(characterId)) || (category && !['DISCIPLINE', 'SPECIALTY', 'XP'].includes(category)) || (viewed && !['true', 'false'].includes(viewed)) || (from && !validDate(from)) || (to && !validDate(to)) || (from && to && from > to) || !Number.isSafeInteger(page) || page < 1 || page > 100000) throw new CharacterCommandError(400, 'Filtros de evolução inválidos.')
  return { characterId, category, from, to, viewed, page }
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]
async function authorize(transaction: Transaction, campaignId: string, actorId: string) {
  const campaign = await transaction.execute<{ master_user_id: string }>(sql`SELECT master_user_id FROM campaigns WHERE id = ${campaignId}::uuid FOR SHARE`)
  if (campaign.rows[0]?.master_user_id !== actorId) throw new CharacterCommandError(403, 'Somente o Narrador desta mesa pode consultar a evolução.')
}

const viewedExpression = (actorId: string, campaignId: string) => sql`EXISTS (
  SELECT 1 FROM character_ledger_events receipt
  WHERE receipt.character_id = e.character_id AND receipt.event_type = 'XP_HISTORY_VIEWED'
    AND receipt.created_by_user_id = ${actorId}
    AND receipt.payload->'input'->>'campaignId' = ${campaignId}
    AND receipt.payload->'input'->'eventIds' ? e.id::text
)`

export async function getCampaignXpHistory(actorId: string, campaignId: string, filters: XpHistoryFilters): Promise<XpHistory> {
  return db.transaction(async transaction => {
    await authorize(transaction, campaignId, actorId)
    const characters = await transaction.execute<{ id: string; name: string; total_xp: number; spent_xp: number; recent_purchases: { traitName: string; xpAmount: number }[] }>(sql`SELECT ch.id, ch.name, ch.total_xp, ch.spent_xp,
      COALESCE((SELECT jsonb_agg(recent.purchase ORDER BY recent.created_at DESC, recent.id DESC) FROM (
        SELECT e.id, e.created_at, jsonb_build_object('traitName', e.payload->'xpTransaction'->>'traitName', 'xpAmount', e.payload->'xpTransaction'->'xpAmount') AS purchase
        FROM character_ledger_events e WHERE e.character_id = ch.id AND e.payload->'xpTransaction'->>'campaignId' = ${campaignId} AND e.payload->'xpTransaction'->>'type' = 'XP_SPENT'
        ORDER BY e.created_at DESC, e.id DESC LIMIT 3
      ) recent), '[]'::jsonb) AS recent_purchases
      FROM characters ch WHERE ch.campaign_id = ${campaignId}::uuid AND ch.character_type = 'PLAYER_VAMPIRE' AND ch.status <> 'DELETED' ORDER BY ch.name, ch.id`)
    if (filters.characterId && !characters.rows.some(character => character.id === filters.characterId)) throw new CharacterCommandError(403, 'Personagem indisponível nesta mesa.')
    const viewed = viewedExpression(actorId, campaignId)
    const scope = sql`ch.campaign_id = ${campaignId}::uuid AND ch.character_type = 'PLAYER_VAMPIRE' AND ch.status <> 'DELETED'
      AND e.payload->'xpTransaction'->>'campaignId' = ${campaignId}`
    const where = sql`${scope}
      ${filters.characterId ? sql`AND ch.id = ${filters.characterId}::uuid` : sql``}
      ${filters.category ? sql`AND e.payload->'xpTransaction'->>'category' = ${filters.category}` : sql``}
      ${filters.from ? sql`AND e.created_at >= ${filters.from}::date AT TIME ZONE 'America/Sao_Paulo'` : sql``}
      ${filters.to ? sql`AND e.created_at < (${filters.to}::date + 1) AT TIME ZONE 'America/Sao_Paulo'` : sql``}
      ${filters.viewed ? sql`AND ${viewed} = ${filters.viewed === 'true'}` : sql``}`
    const counts = await transaction.execute<{ total: number; unread: number }>(sql`SELECT
      (SELECT count(*)::int FROM character_ledger_events e JOIN characters ch ON ch.id = e.character_id WHERE ${where}) AS total,
      (SELECT count(*)::int FROM character_ledger_events e JOIN characters ch ON ch.id = e.character_id WHERE ${scope} AND e.payload->'xpTransaction'->>'type' = 'XP_SPENT' AND NOT ${viewed}) AS unread`)
    const entries = await transaction.execute<{ id: string; character_id: string; name: string; player: string; created_at: Date; viewed: boolean; xp: XpTransaction }>(sql`SELECT e.id, e.character_id, ch.name, COALESCE(u.name, 'Jogador sem nome cadastrado') AS player, e.created_at, ${viewed} AS viewed, e.payload->'xpTransaction' AS xp
      FROM character_ledger_events e JOIN characters ch ON ch.id = e.character_id LEFT JOIN users u ON u.auth0_id = ch.user_id
      WHERE ${where} ORDER BY e.created_at DESC, e.id DESC LIMIT 30 OFFSET ${(filters.page - 1) * 30}`)
    return {
      entries: entries.rows.map(row => ({ ...row.xp, id: row.id, characterId: row.character_id, characterName: row.name, player: row.player, createdAt: new Date(row.created_at).toISOString(), viewed: row.viewed })),
      total: counts.rows[0].total, unread: counts.rows[0].unread, page: filters.page,
      characters: characters.rows.map(row => ({ id: row.id, name: row.name, totalXp: Number(row.total_xp), spentXp: Number(row.spent_xp), availableXp: Number(row.total_xp) - Number(row.spent_xp), recentPurchases: row.recent_purchases })),
    }
  })
}

export async function markCampaignXpViewed(actorId: string, campaignId: string, eventIds: unknown) {
  if (!Array.isArray(eventIds) || !eventIds.length || eventIds.length > 30 || eventIds.some(id => typeof id !== 'string' || !uuid.test(id)) || new Set(eventIds).size !== eventIds.length) throw new CharacterCommandError(400, 'Selecione até 30 registros válidos.')
  return db.transaction(async transaction => {
    await authorize(transaction, campaignId, actorId)
    const events = await transaction.execute<{ id: string; character_id: string; viewed: boolean }>(sql`SELECT e.id, e.character_id, ${viewedExpression(actorId, campaignId)} AS viewed FROM character_ledger_events e JOIN characters ch ON ch.id = e.character_id
      WHERE e.id IN (${sql.join(eventIds.map(id => sql`${id}::uuid`), sql`, `)}) AND ch.campaign_id = ${campaignId}::uuid AND ch.status <> 'DELETED' AND ch.character_type = 'PLAYER_VAMPIRE' AND e.payload->'xpTransaction'->>'campaignId' = ${campaignId}
      ORDER BY ch.id, e.id FOR UPDATE OF ch`)
    if (events.rows.length !== eventIds.length) throw new CharacterCommandError(403, 'Registro indisponível nesta mesa.')
    // Reconsultar após o lock evita recibos repetidos em leituras concorrentes.
    for (const characterId of new Set(events.rows.map(event => event.character_id))) {
      const ids = events.rows.filter(event => event.character_id === characterId).map(event => event.id)
      const unread = await transaction.execute<{ id: string }>(sql`SELECT e.id FROM character_ledger_events e WHERE e.id IN (${sql.join(ids.map(id => sql`${id}::uuid`), sql`, `)}) AND NOT ${viewedExpression(actorId, campaignId)}`)
      if (unread.rows.length) await transaction.execute(sql`INSERT INTO character_ledger_events (character_id, event_type, origin, payload, created_by_user_id) VALUES (${characterId}::uuid, 'XP_HISTORY_VIEWED', 'MASTER_ACTION', ${JSON.stringify({ input: { campaignId, eventIds: unread.rows.map(event => event.id) } })}::jsonb, ${actorId})`)
    }
    return { ok: true }
  })
}
