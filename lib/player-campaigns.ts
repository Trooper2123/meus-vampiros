import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

export type PlayerCampaign = {
  id: string
  name: string
  theme: string | null
  principios: string | null
  status: string
  masterName: string | null
  characterCount: number
}

export const isInactiveCampaign = (status: string) => ['Arquivada', 'Encerrada', 'Pausada'].includes(status)

export async function getPlayerCampaigns(actorId: string): Promise<PlayerCampaign[]> {
  const result = await db.execute<{
    id: string; name: string; theme: string | null; principios: string | null
    status: string; master_name: string | null; character_count: number
  }>(sql`
    SELECT c.id, c.name, c.theme, c.principios, c.status,
           u.name AS master_name,
           COUNT(DISTINCT ch.id)::int AS character_count
    FROM campaigns c
    JOIN characters ch ON ch.campaign_id = c.id
      AND ch.user_id = ${actorId}
      AND ch.character_type = 'PLAYER_VAMPIRE'
      AND ch.status <> 'DELETED'
    LEFT JOIN users u ON u.auth0_id = c.master_user_id
    GROUP BY c.id, c.name, c.theme, c.principios, c.status, u.name
    ORDER BY c.name
  `)
  return result.rows.map(row => ({
    id: row.id, name: row.name, theme: row.theme, principios: row.principios,
    status: row.status, masterName: row.master_name, characterCount: row.character_count,
  }))
}

export async function getPlayerCampaign(actorId: string, campaignId: string) {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(campaignId)) return null
  return (await getPlayerCampaigns(actorId)).find(campaign => campaign.id === campaignId) ?? null
}
