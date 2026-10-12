import { drizzle } from 'drizzle-orm/neon-serverless'
import { Pool } from '@neondatabase/serverless'
import { sql } from 'drizzle-orm'
import type { CampaignEvent, CampaignEventVisibility } from '@/lib/types/campaign-event'

declare global {
  // eslint-disable-next-line no-var
  var __neonPool: Pool | undefined
}

const connectionString = process.env.DATABASE_URL

const isDev = process.env.NODE_ENV !== 'production' && !connectionString

if (!connectionString) {
  // Do not throw here to keep serverless builds from failing during static analysis.
  // API routes that need the DB will log an error if missing.
  // throw new Error('DATABASE_URL is not set')
}

const pool = (() => {
  if (!connectionString) return undefined
  if (global.__neonPool) return global.__neonPool
  const p = new Pool({ connectionString })
  global.__neonPool = p
  return p
})()

export async function ensureUsersTable() {
  if (!pool) return
  await ensureAllTables()
}

export async function ensurePossessionsTable() {
  if (!pool) return
  await ensureAllTables()
}

export async function ensureAllTables() {
  if (!pool) return
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      auth0_id TEXT UNIQUE NOT NULL,
      email TEXT,
      name TEXT,
      picture TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      master_user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      theme TEXT,
      principios TEXT,
      status TEXT NOT NULL DEFAULT 'Ativa',
      average_xp INT DEFAULT 0,
      last_session_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS principios TEXT;
    ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS session_start_time TIME;
    ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS session_end_time TIME;

    CREATE TABLE IF NOT EXISTS characters (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      campaign_id UUID REFERENCES campaigns(id),
      name TEXT NOT NULL,
      concept TEXT,
      clan TEXT,
      generation TEXT,
      status TEXT NOT NULL DEFAULT 'Ativo',
      spent_xp INT DEFAULT 0,
      total_xp INT DEFAULT 0,
      data JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    ALTER TABLE characters ADD COLUMN IF NOT EXISTS spent_xp INT DEFAULT 0;
    ALTER TABLE characters ADD COLUMN IF NOT EXISTS total_xp INT DEFAULT 0;

  CREATE TABLE IF NOT EXISTS character_possessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id),
  label TEXT NOT NULL,
  description TEXT,
  origin TEXT NOT NULL DEFAULT 'player',
  status TEXT NOT NULL DEFAULT 'pendente',
  master_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS campaign_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('disponível', 'talvez', 'indisponível')),
    suggested BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (campaign_id, user_id, date)
  );

  -- Calendário de eventos (toggle)
  CREATE TABLE IF NOT EXISTS campaign_event_calendars (
    campaign_id UUID PRIMARY KEY REFERENCES campaigns(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );

  -- Eventos da campanha
  CREATE TABLE IF NOT EXISTS campaign_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    event_time TIME,
    visibility TEXT NOT NULL CHECK (visibility IN ('master', 'everyone')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS campaign_events_campaign_date_idx
    ON campaign_events (campaign_id, event_date);

  -- Calendário de marcação (toggle)
  CREATE TABLE IF NOT EXISTS campaign_scheduling_calendars (
    campaign_id UUID PRIMARY KEY REFERENCES campaigns(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );

  -- Salas LiveKit
  CREATE TABLE IF NOT EXISTS livekit_rooms (
    campaign_id UUID PRIMARY KEY REFERENCES campaigns(id) ON DELETE CASCADE,
    room_name TEXT NOT NULL,
    room_url TEXT NOT NULL,
    host_user_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );
  `)
}

// ─── Tipos para as novas tabelas ─────────────────────────────────────────────

export type CampaignEventCalendar = {
  campaignId: string
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

export type CampaignSchedulingCalendar = {
  campaignId: string
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

export type LiveKitRoom = {
  campaignId: string
  roomName: string
  roomUrl: string
  hostUserId: string
  createdAt: Date
  updatedAt: Date
}

export async function upsertUserFromAuth0(user: { sub: string; email?: string | null; name?: string | null; picture?: string | null }) {
  if (!pool) return null
  const auth0Id = user.sub
  const email = user.email ?? null
  const name = user.name ?? null
  const picture = user.picture ?? null

  const res = await pool.query(
    `INSERT INTO users (auth0_id, email, name, picture)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (auth0_id) DO UPDATE SET
       email = EXCLUDED.email,
       name = EXCLUDED.name,
       picture = EXCLUDED.picture,
       updated_at = now()
     RETURNING *;
    `,
    [auth0Id, email, name, picture]
  )

  return res.rows[0] ?? null
}

// When DATABASE_URL is absent (local dev without a real DB), `pool` is undefined.
// The dev-db layer intercepts calls before they reach `db`, so this cast is safe.
export const db = pool ? drizzle(pool) : (null as unknown as ReturnType<typeof drizzle>)

// ─── Helper Functions for New Tables ─────────────────────────────────────────

export async function getCampaignEventCalendarStatus(campaignId: string): Promise<{ enabled: boolean } | null> {
  if (isDev) return devGetCampaignEventCalendarStatus(campaignId)

  const result = await db.execute<{ enabled: boolean }>(sql`
    SELECT enabled FROM campaign_event_calendars WHERE campaign_id = ${campaignId}::uuid
  `)

  const row = result.rows[0]
  if (!row) return null
  return { enabled: row.enabled }
}

export async function toggleCampaignEventCalendar(campaignId: string, enabled: boolean): Promise<{ enabled: boolean }> {
  if (isDev) return devToggleCampaignEventCalendar(campaignId, enabled)

  const result = await db.execute<{ enabled: boolean }>(sql`
    INSERT INTO campaign_event_calendars (campaign_id, enabled)
    VALUES (${campaignId}::uuid, ${enabled})
    ON CONFLICT (campaign_id) DO UPDATE SET
      enabled = EXCLUDED.enabled,
      updated_at = now()
    RETURNING enabled
  `)

  const row = result.rows[0]
  if (!row) throw new Error('Failed to update campaign event calendar')
  return { enabled: row.enabled }
}

export async function getCampaignSchedulingCalendarStatus(campaignId: string): Promise<{ enabled: boolean } | null> {
  if (isDev) return devGetCampaignSchedulingCalendarStatus(campaignId)

  const result = await db.execute<{ enabled: boolean }>(sql`
    SELECT enabled FROM campaign_scheduling_calendars WHERE campaign_id = ${campaignId}::uuid
  `)

  const row = result.rows[0]
  if (!row) return null
  return { enabled: row.enabled }
}

export async function toggleCampaignSchedulingCalendar(campaignId: string, enabled: boolean): Promise<{ enabled: boolean }> {
  if (isDev) return devToggleCampaignSchedulingCalendar(campaignId, enabled)

  const result = await db.execute<{ enabled: boolean }>(sql`
    INSERT INTO campaign_scheduling_calendars (campaign_id, enabled)
    VALUES (${campaignId}::uuid, ${enabled})
    ON CONFLICT (campaign_id) DO UPDATE SET
      enabled = EXCLUDED.enabled,
      updated_at = now()
    RETURNING enabled
  `)

  const row = result.rows[0]
  if (!row) throw new Error('Failed to update campaign scheduling calendar')
  return { enabled: row.enabled }
}

export async function createCampaignEvent(
  campaignId: string,
  title: string,
  description: string | null,
  eventDate: string,
  eventTime: string | null,
  visibility: CampaignEventVisibility
): Promise<{ id: string }> {
  if (isDev) return devCreateCampaignEvent(campaignId, title, description, eventDate, eventTime, visibility)

  const result = await db.execute<{ id: string }>(sql`
    INSERT INTO campaign_events (campaign_id, title, description, event_date, event_time, visibility)
    VALUES (${campaignId}::uuid, ${title}, ${description}, ${eventDate}::date, ${eventTime}::time, ${visibility})
    RETURNING id
  `)

  const row = result.rows[0]
  if (!row) throw new Error('Failed to create campaign event')
  return { id: row.id }
}

export async function getCampaignEventsByYear(campaignId: string, year: number): Promise<CampaignEvent[]> {
  if (isDev) return devGetCampaignEventsByYear(campaignId, year)

  const result = await db.execute<{ id: string; campaign_id: string; title: string; description: string | null; event_date: string; event_time: string | null; visibility: string; created_at: string }>(sql`
    SELECT id, campaign_id, title, description, event_date::text AS event_date, event_time::text AS event_time, visibility, created_at::text AS created_at
    FROM campaign_events
    WHERE campaign_id = ${campaignId}::uuid
    AND EXTRACT(YEAR FROM event_date) = ${year}
    ORDER BY event_date ASC, event_time ASC
  `)

  return result.rows.map((row) => ({
    id: row.id,
    campaignId: row.campaign_id,
    title: row.title,
    description: row.description,
    eventDate: row.event_date,
    eventTime: row.event_time,
    visibility: row.visibility as 'master' | 'everyone',
    createdAt: new Date(row.created_at),
  }))
}

export async function getCampaignEventById(eventId: string): Promise<CampaignEvent | null> {
  if (isDev) {
    const event = getCalendarStore().events.find((item) => item.id === eventId)
    return event ? { ...event, createdAt: new Date(event.createdAt) } : null
  }

  const result = await db.execute<{ id: string; campaign_id: string; title: string; description: string | null; event_date: string; event_time: string | null; visibility: CampaignEventVisibility; created_at: string }>(sql`
    SELECT id, campaign_id, title, description, event_date::text AS event_date,
      event_time::text AS event_time, visibility, created_at::text AS created_at
    FROM campaign_events
    WHERE id = ${eventId}::uuid
  `)
  const row = result.rows[0]
  if (!row) return null
  return {
    id: row.id,
    campaignId: row.campaign_id,
    title: row.title,
    description: row.description,
    eventDate: row.event_date,
    eventTime: row.event_time,
    visibility: row.visibility,
    createdAt: new Date(row.created_at),
  }
}

export async function updateCampaignEvent(
  eventId: string,
  data: Partial<{ title: string; description: string | null; eventDate: string; eventTime: string | null; visibility: CampaignEventVisibility }>
): Promise<void> {
  if (isDev) return devUpdateCampaignEvent(eventId, data)
  if (!pool) throw new Error('Banco de dados indisponível')

  const updates: string[] = []
  const params: Array<string | null> = [eventId]

  if (data.title !== undefined) {
    updates.push(`title = $${params.length + 1}`)
    params.push(data.title)
  }
  if (data.description !== undefined) {
    updates.push(`description = $${params.length + 1}`)
    params.push(data.description)
  }
  if (data.eventDate !== undefined) {
    updates.push(`event_date = $${params.length + 1}::date`)
    params.push(data.eventDate)
  }
  if (data.eventTime !== undefined) {
    updates.push(`event_time = $${params.length + 1}::time`)
    params.push(data.eventTime)
  }
  if (data.visibility !== undefined) {
    updates.push(`visibility = $${params.length + 1}`)
    params.push(data.visibility)
  }

  if (updates.length === 0) return

  await pool.query(
    `UPDATE campaign_events SET ${updates.join(', ')}, updated_at = now() WHERE id = $1::uuid`,
    params
  )
}

export async function deleteCampaignEvent(eventId: string): Promise<void> {
  if (isDev) return devDeleteCampaignEvent(eventId)

  await db.execute(sql`
    DELETE FROM campaign_events WHERE id = ${eventId}::uuid
  `)
}

export async function getLiveKitRoom(campaignId: string): Promise<LiveKitRoom | null> {
  if (isDev) return devGetLiveKitRoom(campaignId)

  const result = await db.execute<{ campaign_id: string; room_name: string; room_url: string; host_user_id: string; created_at: string; updated_at: string }>(sql`
    SELECT campaign_id, room_name, room_url, host_user_id, created_at::text AS created_at, updated_at::text AS updated_at
    FROM livekit_rooms
    WHERE campaign_id = ${campaignId}::uuid
  `)

  const row = result.rows[0]
  if (!row) return null
  return {
    campaignId: row.campaign_id,
    roomName: row.room_name,
    roomUrl: row.room_url,
    hostUserId: row.host_user_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

export async function createLiveKitRoom(
  campaignId: string,
  roomName: string,
  roomUrl: string,
  hostUserId: string
): Promise<void> {
  if (isDev) return devCreateLiveKitRoom(campaignId, roomName, roomUrl, hostUserId)

  await db.execute(sql`
    INSERT INTO livekit_rooms (campaign_id, room_name, room_url, host_user_id)
    VALUES (${campaignId}::uuid, ${roomName}, ${roomUrl}, ${hostUserId})
    ON CONFLICT (campaign_id) DO NOTHING
  `)
}

// ─── Development Mode Helpers ────────────────────────────────────────────────

import { randomUUID } from 'crypto'

declare global {
  var __devDbCampaignCalendar: {
    eventCalendars: Record<string, boolean>
    schedulingCalendars: Record<string, boolean>
    events: Array<{
      id: string
      campaignId: string
      title: string
      description: string | null
      eventDate: string
      eventTime: string | null
      visibility: 'master' | 'everyone'
      createdAt: string
    }>
    liveKitRooms: Record<string, {
      roomName: string
      roomUrl: string
      hostUserId: string
    }>
  } | undefined
}

function getCalendarStore() {
  if (!global.__devDbCampaignCalendar) {
    global.__devDbCampaignCalendar = {
      eventCalendars: {},
      schedulingCalendars: {},
      events: [],
      liveKitRooms: {},
    }
  }
  return global.__devDbCampaignCalendar
}

export function devGetCampaignEventCalendarStatus(campaignId: string): { enabled: boolean } | null {
  const store = getCalendarStore()
  const enabled = store.eventCalendars[campaignId]
  if (enabled === undefined) return null
  return { enabled }
}

export function devToggleCampaignEventCalendar(campaignId: string, enabled: boolean): { enabled: boolean } {
  const store = getCalendarStore()
  store.eventCalendars[campaignId] = enabled
  return { enabled }
}

export function devGetCampaignSchedulingCalendarStatus(campaignId: string): { enabled: boolean } | null {
  const store = getCalendarStore()
  const enabled = store.schedulingCalendars[campaignId]
  if (enabled === undefined) return null
  return { enabled }
}

export function devToggleCampaignSchedulingCalendar(campaignId: string, enabled: boolean): { enabled: boolean } {
  const store = getCalendarStore()
  store.schedulingCalendars[campaignId] = enabled
  return { enabled }
}

export function devCreateCampaignEvent(
  campaignId: string,
  title: string,
  description: string | null,
  eventDate: string,
  eventTime: string | null,
  visibility: 'master' | 'everyone'
): { id: string } {
  const store = getCalendarStore()
  const id = randomUUID()
  const now = new Date().toISOString()
  
  store.events.push({
    id,
    campaignId,
    title,
    description,
    eventDate,
    eventTime,
    visibility,
    createdAt: now,
  })
  
  return { id }
}

export function devGetCampaignEventsByYear(campaignId: string, year: number): CampaignEvent[] {
  const store = getCalendarStore()
  return store.events
    .filter((e) => e.campaignId === campaignId)
    .filter((e) => {
      const eventYear = new Date(e.eventDate).getFullYear()
      return eventYear === year
    })
    .map((e) => ({
      id: e.id,
      campaignId: e.campaignId,
      title: e.title,
      description: e.description,
      eventDate: e.eventDate,
      eventTime: e.eventTime,
      visibility: e.visibility,
      createdAt: new Date(e.createdAt),
    }))
}

export function devUpdateCampaignEvent(
  eventId: string,
  data: Partial<{ title: string; description: string | null; eventDate: string; eventTime: string | null; visibility: 'master' | 'everyone' }>
): void {
  const store = getCalendarStore()
  const event = store.events.find((e) => e.id === eventId)
  if (!event) return

  if (data.title !== undefined) event.title = data.title
  if (data.description !== undefined) event.description = data.description
  if (data.eventDate !== undefined) event.eventDate = data.eventDate
  if (data.eventTime !== undefined) event.eventTime = data.eventTime
  if (data.visibility !== undefined) event.visibility = data.visibility
}

export function devDeleteCampaignEvent(eventId: string): void {
  const store = getCalendarStore()
  const index = store.events.findIndex((e) => e.id === eventId)
  if (index === -1) return
  store.events.splice(index, 1)
}

export function devGetLiveKitRoom(campaignId: string): LiveKitRoom | null {
  const store = getCalendarStore()
  const room = store.liveKitRooms[campaignId]
  if (!room) return null

  const now = new Date()
  return {
    campaignId,
    roomName: room.roomName,
    roomUrl: room.roomUrl,
    hostUserId: room.hostUserId,
    createdAt: now,
    updatedAt: now,
  }
}

export function devCreateLiveKitRoom(
  campaignId: string,
  roomName: string,
  roomUrl: string,
  hostUserId: string
): void {
  const store = getCalendarStore()
  store.liveKitRooms[campaignId] = { roomName, roomUrl, hostUserId }
}

export { pool }
