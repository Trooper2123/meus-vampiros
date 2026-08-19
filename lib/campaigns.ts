import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  devGetCampaignsForMaster,
  devGetCampaignById,
  devCreateCampaign,
} from '@/lib/dev-db'

const ROLES_CLAIM = 'https://meus-vampiros.app/roles'
const isDev = process.env.NODE_ENV !== 'production' && !process.env.DATABASE_URL

export function isMaster(user: any): boolean {
  if (!user) return false
  const roles = user[ROLES_CLAIM]
  if (!Array.isArray(roles)) return false
  return roles.includes('mestre')
}

export async function hasMasterAccess(user: any): Promise<boolean> {
  if (!user?.sub) return false
  if (isMaster(user)) return true
  return (await getCampaignsForMaster(user.sub)).length > 0
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
  if (isDev) return devGetCampaignsForMaster(masterUserId)

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
    lastSessionAt: row.last_session_at ? row.last_session_at.toISOString() : null,
    playerCount: row.player_count,
  }))
}

export async function createCampaign(
  masterUserId: string,
  input: { name: string; theme: string | null; principios: string | null; averageXp: number | null; status: string; lastSessionAt: string | null }
): Promise<CampaignSummary> {
  if (isDev) return devCreateCampaign(masterUserId, input)

  const result = await db.execute<{
    id: string
    name: string
    theme: string | null
    principios: string | null
    average_xp: number | null
    status: string
    last_session_at: Date | null
  }>(sql`
    INSERT INTO campaigns (master_user_id, name, theme, principios, average_xp, status, last_session_at)
    VALUES (${masterUserId}, ${input.name}, ${input.theme}, ${input.principios}, ${input.averageXp}, ${input.status}, ${input.lastSessionAt})
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
    lastSessionAt: row.last_session_at ? row.last_session_at.toISOString() : null,
    playerCount: 0,
  }
}

export async function getCampaignById(id: string): Promise<{ id: string; name: string; theme: string | null; principios: string | null; averageXp: number | null } | null> {
  if (isDev) return devGetCampaignById(id)

  const result = await db.execute<{ id: string; name: string; theme: string | null; principios: string | null; average_xp: number | null }>(sql`
    SELECT id, name, theme, principios, average_xp FROM campaigns WHERE id = ${id}::uuid
  `)
  const row = result.rows[0]
  if (!row) return null
  return { id: row.id, name: row.name, theme: row.theme, principios: row.principios, averageXp: row.average_xp }
}
