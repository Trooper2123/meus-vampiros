import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

export type AvailabilityStatus = 'disponível' | 'talvez' | 'indisponível'
export type AvailabilityEntry = { id: string; campaignId: string; userId: string; name: string; date: string; status: AvailabilityStatus; suggested: boolean }
export type CampaignSchedule = { startTime: string | null; endTime: string | null }

export async function getAvailability(campaignId: string): Promise<AvailabilityEntry[]> {
  const result = await db.execute<any>(sql`
    SELECT a.id, a.campaign_id, a.user_id, COALESCE(u.name, u.email, 'Jogador') AS name,
      a.date::text, a.status, a.suggested
    FROM campaign_availability a LEFT JOIN users u ON u.auth0_id = a.user_id
    WHERE a.campaign_id = ${campaignId}::uuid ORDER BY a.date ASC, name ASC
  `)
  return result.rows.map((row) => ({ id: row.id, campaignId: row.campaign_id, userId: row.user_id, name: row.name, date: row.date, status: row.status, suggested: row.suggested }))
}

export async function saveAvailability(campaignId: string, userId: string, name: string, date: string, status: AvailabilityStatus, suggested = false) {
  const result = await db.execute<any>(sql`
    INSERT INTO campaign_availability (campaign_id, user_id, date, status, suggested)
    VALUES (${campaignId}::uuid, ${userId}, ${date}::date, ${status}, ${suggested})
    ON CONFLICT (campaign_id, user_id, date) DO UPDATE SET status = EXCLUDED.status, suggested = campaign_availability.suggested OR EXCLUDED.suggested, updated_at = now()
    RETURNING id, campaign_id, user_id, date::text, status, suggested
  `)
  const row = result.rows[0]
  return { id: row.id, campaignId: row.campaign_id, userId: row.user_id, name, date: row.date, status: row.status, suggested: row.suggested }
}

export async function suggestAvailability(campaignId: string, userId: string, date: string) {
  await db.execute(sql`
    INSERT INTO campaign_availability (campaign_id, user_id, date, status, suggested)
    VALUES (${campaignId}::uuid, ${userId}, ${date}::date, 'indisponível', true)
    ON CONFLICT (campaign_id, user_id, date) DO UPDATE SET suggested = NOT campaign_availability.suggested, updated_at = now()
  `)
}

export async function getCampaignSchedule(campaignId: string): Promise<CampaignSchedule> {
  const result = await db.execute<{ session_start_time: string | null; session_end_time: string | null }>(sql`
    SELECT session_start_time::text, session_end_time::text FROM campaigns WHERE id = ${campaignId}::uuid
  `)
  const row = result.rows[0]
  return { startTime: row?.session_start_time?.slice(0, 5) ?? null, endTime: row?.session_end_time?.slice(0, 5) ?? null }
}

export async function saveCampaignSchedule(campaignId: string, startTime: string | null, endTime: string | null) {
  await db.execute(sql`UPDATE campaigns SET session_start_time = ${startTime}::time, session_end_time = ${endTime}::time, updated_at = now() WHERE id = ${campaignId}::uuid`)
  return { startTime, endTime }
}

export function getAvailabilitySummary(entries: AvailabilityEntry[]) {
  return entries.reduce<Record<string, { available: number; maybe: number; suggested: boolean }>>((summary, entry) => {
    const current = summary[entry.date] ?? { available: 0, maybe: 0, suggested: false }
    if (entry.status === 'disponível') current.available += 1
    if (entry.status === 'talvez') current.maybe += 1
    current.suggested ||= entry.suggested
    summary[entry.date] = current
    return summary
  }, {})
}

export function isCampaignMember(entries: AvailabilityEntry[], userId: string) { return entries.some((entry) => entry.userId === userId) }

export async function isUserInCampaign(campaignId: string, userId: string) {
  const result = await db.execute<{ exists: boolean }>(sql`SELECT EXISTS (SELECT 1 FROM campaigns WHERE id = ${campaignId}::uuid AND master_user_id = ${userId} UNION SELECT 1 FROM characters WHERE campaign_id = ${campaignId}::uuid AND user_id = ${userId}) AS exists`)
  return result.rows[0]?.exists === true
}

export async function getCampaignOwner(campaignId: string) {
  const result = await db.execute<{ master_user_id: string }>(sql`SELECT master_user_id FROM campaigns WHERE id = ${campaignId}::uuid`)
  return result.rows[0]?.master_user_id ?? null
}

export function isMasterEntry(entries: AvailabilityEntry[], userId: string, ownerId: string | null) { return userId === ownerId || entries.some((entry) => entry.userId === userId && entry.name === 'Mestre') }
