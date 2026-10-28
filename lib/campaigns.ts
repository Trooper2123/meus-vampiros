import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

type Auth0User = {
  sub: string
  name?: string | null
  email?: string | null
  picture?: string | null
}

export async function hasMasterAccess(user: Auth0User | null): Promise<boolean> {
  // O perfil é único; a gestão de cada recurso continua condicionada ao proprietário.
  return typeof user?.sub === 'string' && user.sub.trim().length > 0
}

export type CampaignSummary = {
  id: string
  name: string
  theme: string | null
  principios: string | null
  averageXp: number | null
  status: string
  lastSessionAt: string | null
  playerCount: number
}

export async function getCampaignsForMaster(masterUserId: string): Promise<CampaignSummary[]> {
  const result = await db.execute<{
    id: string
    name: string
    theme: string | null
    principios: string | null
    average_xp: number | null
    status: string
    last_session_at: Date | null
    player_count: number
  }>(sql`
    SELECT c.id, c.name, c.theme, c.principios, c.average_xp, c.status, c.last_session_at,
      (SELECT COUNT(*) FROM characters ch WHERE ch.campaign_id = c.id)::int AS player_count
    FROM campaigns c
    WHERE c.master_user_id = ${masterUserId}
    ORDER BY c.updated_at DESC
  `)

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    theme: row.theme,
    principios: row.principios,
    averageXp: row.average_xp,
    status: row.status,
    lastSessionAt: row.last_session_at ? new Date(row.last_session_at).toISOString() : null,
    playerCount: row.player_count,
  }))
}

export async function createCampaign(
  masterUserId: string,
  input: { name: string; theme: string | null; principios: string | null; averageXp: number | null; status: string; lastSessionAt: string | null; enabledClanCodes?: string[] }
): Promise<CampaignSummary> {
  const result = await db.execute<{
    id: string
    name: string
    theme: string | null
    principios: string | null
    average_xp: number | null
    status: string
    last_session_at: Date | null
  }>(sql`
    INSERT INTO campaigns (master_user_id, name, theme, principios, average_xp, status, last_session_at, enabled_clan_codes)
    VALUES (${masterUserId}, ${input.name}, ${input.theme}, ${input.principios}, ${input.averageXp}, ${input.status}, ${input.lastSessionAt}, ${input.enabledClanCodes ? JSON.stringify(input.enabledClanCodes) : null}::jsonb)
    RETURNING id, name, theme, principios, average_xp, status, last_session_at
  `)

  const row = result.rows[0]
  return {
    id: row.id,
    name: row.name,
    theme: row.theme,
    principios: row.principios,
    averageXp: row.average_xp,
    status: row.status,
    lastSessionAt: row.last_session_at ? new Date(row.last_session_at).toISOString() : null,
    playerCount: 0,
  }
}

export async function getCampaignById(id: string): Promise<{ id: string; name: string; theme: string | null; principios: string | null; averageXp: number | null } | null> {
  const result = await db.execute<{ id: string; name: string; theme: string | null; principios: string | null; average_xp: number | null }>(sql`
    SELECT id, name, theme, principios, average_xp FROM campaigns WHERE id = ${id}::uuid
  `)
  const row = result.rows[0]
  if (!row) return null
  return { id: row.id, name: row.name, theme: row.theme, principios: row.principios, averageXp: row.average_xp }
}

export async function toggleCampaignEventCalendar(campaignId: string, enabled: boolean): Promise<{ enabled: boolean }> {
  const result = await db.execute<{ enabled: boolean }>(sql`
    INSERT INTO campaign_event_calendars (campaign_id, enabled)
    VALUES (${campaignId}, ${enabled})
    ON CONFLICT (campaign_id) DO UPDATE SET enabled = EXCLUDED.enabled
    RETURNING enabled
  `)
  const row = result.rows[0]
  return { enabled: row.enabled }
}
