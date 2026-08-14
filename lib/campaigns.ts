import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

const ROLES_CLAIM = 'https://meus-vampiros.app/roles'

export function isMaster(user: any): boolean {
  if (!user) return false
  const roles = user[ROLES_CLAIM]
  if (!Array.isArray(roles)) return false
  return roles.includes('mestre')
}

export type CampaignSummary = {
  id: string
  name: string
  theme: string | null
  status: string
  lastSessionAt: string | null
  playerCount: number
}

export async function getCampaignsForMaster(masterUserId: string): Promise<CampaignSummary[]> {
  const result = await db.execute<{
    id: string
    name: string
    theme: string | null
    status: string
    last_session_at: Date | null
    player_count: number
  }>(sql`
    SELECT c.id, c.name, c.theme, c.status, c.last_session_at,
      (SELECT COUNT(*) FROM characters ch WHERE ch.campaign_id = c.id)::int AS player_count
    FROM campaigns c
    WHERE c.master_user_id = ${masterUserId}
    ORDER BY c.updated_at DESC
  `)

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    theme: row.theme,
    status: row.status,
    lastSessionAt: row.last_session_at ? row.last_session_at.toISOString() : null,
    playerCount: row.player_count,
  }))
}

export async function createCampaign(
  masterUserId: string,
  input: { name: string; theme: string | null; status: string; lastSessionAt: string | null }
): Promise<CampaignSummary> {
  const result = await db.execute<{
    id: string
    name: string
    theme: string | null
    status: string
    last_session_at: Date | null
  }>(sql`
    INSERT INTO campaigns (master_user_id, name, theme, status, last_session_at)
    VALUES (${masterUserId}, ${input.name}, ${input.theme}, ${input.status}, ${input.lastSessionAt})
    RETURNING id, name, theme, status, last_session_at
  `)

  const row = result.rows[0]
  return {
    id: row.id,
    name: row.name,
    theme: row.theme,
    status: row.status,
    lastSessionAt: row.last_session_at ? row.last_session_at.toISOString() : null,
    playerCount: 0,
  }
}

export async function getCampaignById(id: string): Promise<{ id: string; name: string; theme: string | null } | null> {
  const result = await db.execute<{ id: string; name: string; theme: string | null }>(sql`
    SELECT id, name, theme FROM campaigns WHERE id = ${id}::uuid
  `)
  return result.rows[0] ?? null
}
