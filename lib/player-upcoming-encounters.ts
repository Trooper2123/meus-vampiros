import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

export type PlayerUpcomingEncounter = {
  campaignId: string
  campaignName: string
  date: string
  startTime: string | null
  endTime: string | null
}

/**
 * Dates proposed by the Narrator in the scheduling calendar, across every
 * distinct campaign to which the authenticated player has a non-deleted sheet.
 * A proposal is not a confirmed session.
 */
export async function getPlayerUpcomingEncounters(userId: string): Promise<PlayerUpcomingEncounter[]> {
  const result = await db.execute<{
    campaign_id: string
    campaign_name: string
    encounter_date: string
    start_time: string | null
    end_time: string | null
  }>(sql`
    SELECT c.id AS campaign_id, c.name AS campaign_name,
           a.date::text AS encounter_date,
           c.session_start_time::text AS start_time,
           c.session_end_time::text AS end_time
    FROM campaign_availability a
    INNER JOIN campaigns c ON c.id = a.campaign_id
    INNER JOIN campaign_scheduling_calendars calendar ON calendar.campaign_id = c.id AND calendar.enabled = true
    WHERE a.suggested = true
      AND a.date >= CURRENT_DATE
      AND c.status NOT IN ('Arquivada', 'Encerrada')
      AND EXISTS (
        SELECT 1 FROM characters ch
        WHERE ch.campaign_id = c.id
          AND ch.user_id = ${userId}
          AND ch.status <> 'DELETED'
      )
    GROUP BY c.id, c.name, a.date, c.session_start_time, c.session_end_time
    ORDER BY a.date ASC, c.name ASC
    LIMIT 8
  `)
  return result.rows.map(row => ({
    campaignId: row.campaign_id,
    campaignName: row.campaign_name,
    date: row.encounter_date,
    startTime: row.start_time?.slice(0, 5) ?? null,
    endTime: row.end_time?.slice(0, 5) ?? null,
  }))
}
