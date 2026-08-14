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
  averageXp: number | null
  status: string
  lastSessionAt: string | null
  playerCount: number
}

export async function getCampaignsForMaster(masterUserId: string): Promise<CampaignSummary[]> {
  const result = await db.execute<{
    id: string
    name: string
    average_xp: number | null
    status: string
    last_session_at: Date | null
    player_count: number
  }>(sql`
    SELECT c.id, c.name, c.average_xp, c.status, c.last_session_at,
      (SELECT COUNT(*) FROM characters ch WHERE ch.campaign_id = c.id)::int AS player_count
    FROM campaigns c
    WHERE c.master_user_id = ${masterUserId}
    ORDER BY c.updated_at DESC
  `)

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    averageXp: row.average_xp,
    status: row.status,
    lastSessionAt: row.last_session_at ? row.last_session_at.toISOString() : null,
    playerCount: row.player_count,
  }))
}

export async function createCampaign(
  masterUserId: string,
  input: { name: string; averageXp: number | null; status: string; lastSessionAt: string | null }
): Promise<CampaignSummary> {
  const result = await db.execute<{
    id: string
    name: string
    average_xp: number | null
    status: string
    last_session_at: Date | null
  }>(sql`
    INSERT INTO campaigns (master_user_id, name, average_xp, status, last_session_at)
    VALUES (${masterUserId}, ${input.name}, ${input.averageXp}, ${input.status}, ${input.lastSessionAt})
    RETURNING id, name, average_xp, status, last_session_at
  `)

  const row = result.rows[0]
  return {
    id: row.id,
    name: row.name,
    averageXp: row.average_xp,
    status: row.status,
    lastSessionAt: row.last_session_at ? row.last_session_at.toISOString() : null,
    playerCount: 0,
  }
}

export async function getCampaignById(id: string): Promise<{ id: string; name: string; averageXp: number | null } | null> {
  const result = await db.execute<{ id: string; name: string; average_xp: number | null }>(sql`
    SELECT id, name, average_xp FROM campaigns WHERE id = ${id}::uuid
  `)
  const row = result.rows[0]
  if (!row) return null
  return { id: row.id, name: row.name, averageXp: row.average_xp }
}
