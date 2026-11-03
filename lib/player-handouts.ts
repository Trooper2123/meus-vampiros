import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { getPlayerCampaign } from '@/lib/player-campaigns'

export type PlayerHandout = {
  id: string
  title: string
  fileName: string
  contentType: string | null
  sizeBytes: number | null
  createdAt: string
}

export async function playerHandouts(actorId: string, campaignId: string): Promise<PlayerHandout[] | null> {
  if (!await getPlayerCampaign(actorId, campaignId)) return null
  const rows = await db.execute<{
    id: string; title: string; file_name: string
    content_type: string | null; size_bytes: string | number | null; created_at: Date | string
  }>(sql`
    SELECT h.id, h.title, h.file_name, h.content_type, h.size_bytes, h.created_at
    FROM campaign_handouts h
    WHERE h.campaign_id = ${campaignId}::uuid
      AND h.deleted_at IS NULL
      AND h.upload_completed_at IS NOT NULL
      AND (
        h.share_mode = 'ALL'
        OR (h.share_mode = 'SELECTED' AND EXISTS (
          SELECT 1 FROM campaign_handout_recipients r
          WHERE r.handout_id = h.id AND r.actor_id = ${actorId}
        ))
      )
    ORDER BY h.created_at DESC
    LIMIT 100
  `)
  return rows.rows.map(row => ({
    id: row.id, title: row.title, fileName: row.file_name,
    contentType: row.content_type, sizeBytes: row.size_bytes == null ? null : Number(row.size_bytes),
    createdAt: new Date(row.created_at).toISOString(),
  }))
}

export async function playerHandoutPath(actorId: string, campaignId: string, handoutId: string) {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(handoutId)) return null
  if (!await getPlayerCampaign(actorId, campaignId)) return null
  const result = await db.execute<{ pathname: string; file_name: string; content_type: string | null }>(sql`
    SELECT h.blob_pathname AS pathname, h.file_name, h.content_type
    FROM campaign_handouts h
    WHERE h.id = ${handoutId}::uuid
      AND h.campaign_id = ${campaignId}::uuid
      AND h.deleted_at IS NULL
      AND h.upload_completed_at IS NOT NULL
      AND (
        h.share_mode = 'ALL'
        OR (h.share_mode = 'SELECTED' AND EXISTS (
          SELECT 1 FROM campaign_handout_recipients r
          WHERE r.handout_id = h.id AND r.actor_id = ${actorId}
        ))
      )
    LIMIT 1
  `)
  return result.rows[0] ?? null
}
