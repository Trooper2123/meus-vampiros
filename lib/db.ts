import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { sql } from 'drizzle-orm'
import { DISCIPLINE_RESEARCH, SKILL_CATALOG } from './vtm-v5/research-catalog'
import { CLAN_DISCIPLINES, DISCIPLINES } from './vtm-v5/disciplines'
import { sortCampaignEventsChronologically, type CampaignCalendarConfig, type CampaignCalendarMode, type CampaignEvent, type CampaignEventVisibility } from './types/campaign-event'

declare global {

  var __postgresPool: Pool | undefined
}

const connectionString = process.env.DATABASE_URL
const pool = (() => {
  if (!connectionString) return undefined
  if (global.__postgresPool) return global.__postgresPool
  const p = new Pool({ connectionString })
  global.__postgresPool = p
  return p
})()

export async function ensureUsersTable() {
  await ensureAllTables()
}

export async function ensurePossessionsTable() {
  await ensureAllTables()
}

export async function ensureAllTables() {
  if (!pool) throw new Error('DATABASE_URL não configurada.')
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
      blood_policy JSONB,
      status TEXT NOT NULL DEFAULT 'Ativa',
      average_xp INT DEFAULT 0,
      enabled_clan_codes JSONB,
      creation_policy JSONB,
      call_active BOOLEAN NOT NULL DEFAULT false,
      last_session_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS principios TEXT;
    ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS session_start_time TIME;
    ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS session_end_time TIME;
    ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS enabled_clan_codes JSONB;
    ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS creation_policy JSONB;
    ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS call_active BOOLEAN NOT NULL DEFAULT false;

    CREATE TABLE IF NOT EXISTS characters (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      campaign_id UUID REFERENCES campaigns(id),
      name TEXT NOT NULL,
      concept TEXT,
      clan TEXT,
      generation TEXT,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      created_by_user_id TEXT,
      character_type TEXT NOT NULL DEFAULT 'PLAYER_VAMPIRE',
      visibility TEXT NOT NULL DEFAULT 'PLAYER_VISIBLE',
      validation_report JSONB,
      validated_at TIMESTAMPTZ,
      spent_xp INT DEFAULT 0,
      total_xp INT DEFAULT 0,
      data JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    ALTER TABLE characters ADD COLUMN IF NOT EXISTS spent_xp INT DEFAULT 0;
    ALTER TABLE characters ADD COLUMN IF NOT EXISTS total_xp INT DEFAULT 0;
    ALTER TABLE characters ADD COLUMN IF NOT EXISTS created_by_user_id TEXT;
    ALTER TABLE characters ADD COLUMN IF NOT EXISTS character_type TEXT NOT NULL DEFAULT 'PLAYER_VAMPIRE';
    ALTER TABLE characters ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'PLAYER_VISIBLE';
    ALTER TABLE characters ADD COLUMN IF NOT EXISTS validation_report JSONB;
    ALTER TABLE characters ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;
    ALTER TABLE characters ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE characters ADD COLUMN IF NOT EXISTS game_state JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE characters ALTER COLUMN status SET DEFAULT 'DRAFT';
    UPDATE characters SET created_by_user_id = user_id WHERE created_by_user_id IS NULL;
    UPDATE characters SET status = 'DRAFT' WHERE status = 'Ativo';

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

  CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_user_id TEXT NOT NULL,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    visibility TEXT NOT NULL CHECK (visibility IN ('PRIVATE', 'NARRATOR_ONLY', 'SHARED')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    recipient_user_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    links JSONB NOT NULL DEFAULT '[]'::jsonb,
    revision INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS notes_author_updated_idx ON notes (author_user_id, updated_at DESC);
  CREATE INDEX IF NOT EXISTS notes_campaign_updated_idx ON notes (campaign_id, updated_at DESC);
  CREATE TABLE IF NOT EXISTS note_requests (
    author_user_id TEXT NOT NULL,
    idempotency_key UUID NOT NULL,
    request_hash TEXT NOT NULL,
    note_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (author_user_id, idempotency_key)
  );

  CREATE TABLE IF NOT EXISTS character_ledger_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    origin TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by_user_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS character_ledger_events_character_created_idx
    ON character_ledger_events (character_id, created_at DESC);

  CREATE TABLE IF NOT EXISTS character_commands (
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    command_key TEXT NOT NULL,
    actor_user_id TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    result JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (character_id, command_key)
  );

  CREATE TABLE IF NOT EXISTS chronicle_nights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id),
    night_number INTEGER NOT NULL,
    in_game_date DATE NOT NULL,
    status TEXT NOT NULL,
    started_by_user_id TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    idempotency_key TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    ruleset_version TEXT NOT NULL,
    result JSONB,
    UNIQUE(campaign_id, night_number),
    UNIQUE(campaign_id, idempotency_key)
  );
  CREATE UNIQUE INDEX IF NOT EXISTS chronicle_nights_processing_idx ON chronicle_nights(campaign_id) WHERE status = 'PROCESSING';
  CREATE TABLE IF NOT EXISTS night_awakenings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    night_id UUID NOT NULL REFERENCES chronicle_nights(id),
    character_id UUID NOT NULL REFERENCES characters(id),
    status TEXT NOT NULL,
    roll INTEGER CHECK(roll BETWEEN 1 AND 10),
    before_state JSONB NOT NULL,
    after_state JSONB NOT NULL,
    outcome TEXT NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(night_id, character_id)
  );

  CREATE TABLE IF NOT EXISTS campaign_predator_type_settings (
    campaign_id UUID PRIMARY KEY REFERENCES campaigns(id) ON DELETE CASCADE,
    enabled_sources JSONB NOT NULL DEFAULT '["COREBOOK"]'::jsonb,
    enabled_codes JSONB,
    disabled_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_by_user_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
    mode TEXT NOT NULL DEFAULT 'real',
    weekdays JSONB NOT NULL DEFAULT '[]'::jsonb,
    months JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );

  -- Eventos da campanha
  CREATE TABLE IF NOT EXISTS campaign_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    event_date DATE,
    event_time TIME,
    fictional_year INTEGER,
    fictional_month TEXT,
    fictional_month_index INTEGER,
    fictional_weekday TEXT,
    fictional_weekday_index INTEGER,
    visibility TEXT NOT NULL CHECK (visibility IN ('master', 'everyone')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS campaign_events_campaign_date_idx
    ON campaign_events (campaign_id, event_date);

  ALTER TABLE campaign_event_calendars ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'real';
  ALTER TABLE campaign_event_calendars ADD COLUMN IF NOT EXISTS weekdays JSONB NOT NULL DEFAULT '[]'::jsonb;
  ALTER TABLE campaign_event_calendars ADD COLUMN IF NOT EXISTS months JSONB NOT NULL DEFAULT '[]'::jsonb;
  ALTER TABLE campaign_events ALTER COLUMN event_date DROP NOT NULL;
  ALTER TABLE campaign_events ADD COLUMN IF NOT EXISTS fictional_year INTEGER;
  ALTER TABLE campaign_events ADD COLUMN IF NOT EXISTS fictional_month TEXT;
  ALTER TABLE campaign_events ADD COLUMN IF NOT EXISTS fictional_month_index INTEGER;
  ALTER TABLE campaign_events ADD COLUMN IF NOT EXISTS fictional_weekday TEXT;
  ALTER TABLE campaign_events ADD COLUMN IF NOT EXISTS fictional_weekday_index INTEGER;

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

  CREATE TABLE IF NOT EXISTS discipline_catalog (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    aliases JSONB NOT NULL DEFAULT '[]'::jsonb
  );
  CREATE TABLE IF NOT EXISTS clan_disciplines (
    clan_code TEXT NOT NULL,
    discipline_id TEXT NOT NULL REFERENCES discipline_catalog(id),
    PRIMARY KEY (clan_code, discipline_id)
  );
  CREATE TABLE IF NOT EXISTS skill_catalog (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
  CREATE TABLE IF NOT EXISTS discipline_research_catalog (
      id TEXT PRIMARY KEY,
      discipline_id TEXT NOT NULL,
      entry_type TEXT NOT NULL,
      level INTEGER NOT NULL,
      skill_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      payload JSONB NOT NULL
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

const unavailableDatabase = () => { throw new Error('DATABASE_URL não configurada.') }
export const db = pool ? drizzle(pool) : { execute: unavailableDatabase, transaction: unavailableDatabase } as unknown as ReturnType<typeof drizzle>

export async function getMasterResearchCatalog() {
  if (!pool) throw new Error('DATABASE_URL não configurada.')
  await ensureAllTables()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `INSERT INTO discipline_catalog (id, name, aliases)
       SELECT id, name, aliases FROM jsonb_to_recordset($1::jsonb) AS item(id text, name text, aliases jsonb)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, aliases = EXCLUDED.aliases`,
      [JSON.stringify(DISCIPLINES)],
    )
    await client.query('DELETE FROM clan_disciplines WHERE clan_code = ANY($1::text[])', [Object.keys(CLAN_DISCIPLINES)])
    await client.query(
      `INSERT INTO clan_disciplines (clan_code, discipline_id)
       SELECT clan_code, discipline_id FROM jsonb_to_recordset($1::jsonb) AS item(clan_code text, discipline_id text)`,
      [JSON.stringify(Object.entries(CLAN_DISCIPLINES).flatMap(([clan_code, disciplineIds]) => disciplineIds.map(discipline_id => ({ clan_code, discipline_id }))))],
    )
    await client.query(
      `INSERT INTO skill_catalog (id, name)
       SELECT id, name FROM jsonb_to_recordset($1::jsonb) AS row(id text, name text)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
      [JSON.stringify(SKILL_CATALOG)],
    )
    await client.query(
      `INSERT INTO discipline_research_catalog (id, discipline_id, entry_type, level, skill_ids, payload)
       SELECT row->>'id', row->>'disciplineId', row->>'type', (row->>'level')::integer,
         coalesce(row->'skillIds', '[]'::jsonb), row - 'skillIds'
       FROM jsonb_array_elements($1::jsonb) AS item(row)
       ON CONFLICT (id) DO UPDATE SET discipline_id = EXCLUDED.discipline_id,
         entry_type = EXCLUDED.entry_type, level = EXCLUDED.level,
         skill_ids = EXCLUDED.skill_ids, payload = EXCLUDED.payload`,
      [JSON.stringify(DISCIPLINE_RESEARCH)],
    )
    const entries = await client.query('SELECT payload, skill_ids AS "skillIds" FROM discipline_research_catalog ORDER BY discipline_id, level, id')
    const skills = await client.query('SELECT id, name FROM skill_catalog ORDER BY name')
    const disciplines = await client.query('SELECT id, name FROM discipline_catalog ORDER BY id')
    await client.query('COMMIT')
    return { entries: entries.rows.map(row => ({ ...row.payload, skillIds: row.skillIds })), skills: skills.rows, disciplines: disciplines.rows }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// ─── Helper Functions for New Tables ─────────────────────────────────────────

export async function getCampaignEventCalendarStatus(campaignId: string): Promise<({ enabled: boolean } & CampaignCalendarConfig) | null> {
  const result = await db.execute<{ enabled: boolean; mode: CampaignCalendarMode; weekdays: string[]; months: string[] }>(sql`
    SELECT enabled, mode, weekdays, months FROM campaign_event_calendars WHERE campaign_id = ${campaignId}::uuid
  `)

  const row = result.rows[0]
  if (!row) return null
  return { enabled: row.enabled, mode: row.mode, weekdays: row.weekdays, months: row.months }
}

export async function updateCampaignEventCalendarConfig(campaignId: string, config: CampaignCalendarConfig): Promise<CampaignCalendarConfig> {
  const result = await db.execute<{ mode: CampaignCalendarMode; weekdays: string[]; months: string[] }>(sql`
    INSERT INTO campaign_event_calendars (campaign_id, mode, weekdays, months)
    VALUES (${campaignId}::uuid, ${config.mode}, ${JSON.stringify(config.weekdays)}::jsonb, ${JSON.stringify(config.months)}::jsonb)
    ON CONFLICT (campaign_id) DO UPDATE SET mode = EXCLUDED.mode, weekdays = EXCLUDED.weekdays, months = EXCLUDED.months, updated_at = now()
    RETURNING mode, weekdays, months
  `)
  return result.rows[0]
}

export async function toggleCampaignEventCalendar(campaignId: string, enabled: boolean): Promise<{ enabled: boolean }> {
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
  const result = await db.execute<{ enabled: boolean }>(sql`
    SELECT enabled FROM campaign_scheduling_calendars WHERE campaign_id = ${campaignId}::uuid
  `)

  const row = result.rows[0]
  if (!row) return null
  return { enabled: row.enabled }
}

export async function toggleCampaignSchedulingCalendar(campaignId: string, enabled: boolean): Promise<{ enabled: boolean }> {
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
  eventDate: string | null,
  eventTime: string | null,
  visibility: CampaignEventVisibility,
  fictionalDate?: Pick<CampaignEvent, 'fictionalYear' | 'fictionalMonth' | 'fictionalMonthIndex' | 'fictionalWeekday' | 'fictionalWeekdayIndex'>
): Promise<{ id: string }> {
  const result = await db.execute<{ id: string }>(sql`
    INSERT INTO campaign_events (campaign_id, title, description, event_date, event_time, visibility, fictional_year, fictional_month, fictional_month_index, fictional_weekday, fictional_weekday_index)
    VALUES (${campaignId}::uuid, ${title}, ${description}, ${eventDate}::date, ${eventTime}::time, ${visibility}, ${fictionalDate?.fictionalYear ?? null}, ${fictionalDate?.fictionalMonth ?? null}, ${fictionalDate?.fictionalMonthIndex ?? null}, ${fictionalDate?.fictionalWeekday ?? null}, ${fictionalDate?.fictionalWeekdayIndex ?? null})
    RETURNING id
  `)

  const row = result.rows[0]
  if (!row) throw new Error('Failed to create campaign event')
  return { id: row.id }
}

export async function getCampaignEventsByYear(campaignId: string, year?: number): Promise<CampaignEvent[]> {
  const result = await db.execute<{ id: string; campaign_id: string; title: string; description: string | null; event_date: string | null; event_time: string | null; visibility: string; fictional_year: number | null; fictional_month: string | null; fictional_month_index: number | null; fictional_weekday: string | null; fictional_weekday_index: number | null; created_at: string }>(sql`
    SELECT id, campaign_id, title, description, event_date::text AS event_date, event_time::text AS event_time, visibility, fictional_year, fictional_month, fictional_month_index, fictional_weekday, fictional_weekday_index, created_at::text AS created_at
    FROM campaign_events
    WHERE campaign_id = ${campaignId}::uuid
    AND (${year ?? null}::integer IS NULL OR COALESCE(EXTRACT(YEAR FROM event_date)::integer, fictional_year) = ${year ?? null})
    ORDER BY COALESCE(EXTRACT(YEAR FROM event_date)::integer, fictional_year), COALESCE(EXTRACT(MONTH FROM event_date)::integer, fictional_month_index), COALESCE(EXTRACT(DAY FROM event_date)::integer, fictional_weekday_index), event_time ASC NULLS LAST
  `)

  return sortCampaignEventsChronologically(result.rows.map((row) => ({
    id: row.id,
    campaignId: row.campaign_id,
    title: row.title,
    description: row.description,
    eventDate: row.event_date,
    eventTime: row.event_time,
    fictionalYear: row.fictional_year,
    fictionalMonth: row.fictional_month,
    fictionalMonthIndex: row.fictional_month_index,
    fictionalWeekday: row.fictional_weekday,
    fictionalWeekdayIndex: row.fictional_weekday_index,
    visibility: row.visibility as 'master' | 'everyone',
    createdAt: new Date(row.created_at),
  })))
}

export async function getCampaignEventById(eventId: string): Promise<CampaignEvent | null> {
  const result = await db.execute<{ id: string; campaign_id: string; title: string; description: string | null; event_date: string | null; event_time: string | null; visibility: CampaignEventVisibility; fictional_year: number | null; fictional_month: string | null; fictional_month_index: number | null; fictional_weekday: string | null; fictional_weekday_index: number | null; created_at: string }>(sql`
    SELECT id, campaign_id, title, description, event_date::text AS event_date,
      event_time::text AS event_time, visibility, fictional_year, fictional_month, fictional_month_index, fictional_weekday, fictional_weekday_index, created_at::text AS created_at
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
    fictionalYear: row.fictional_year,
    fictionalMonth: row.fictional_month,
    fictionalMonthIndex: row.fictional_month_index,
    fictionalWeekday: row.fictional_weekday,
    fictionalWeekdayIndex: row.fictional_weekday_index,
    visibility: row.visibility,
    createdAt: new Date(row.created_at),
  }
}

export async function updateCampaignEvent(
  eventId: string,
  data: Partial<Omit<CampaignEvent, 'id' | 'campaignId' | 'createdAt'>>
): Promise<void> {

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
  const fictionalColumns = {
    fictionalYear: 'fictional_year', fictionalMonth: 'fictional_month', fictionalMonthIndex: 'fictional_month_index',
    fictionalWeekday: 'fictional_weekday', fictionalWeekdayIndex: 'fictional_weekday_index',
  } as const
  for (const [key, column] of Object.entries(fictionalColumns) as Array<[keyof typeof fictionalColumns, string]>) {
    if (data[key] !== undefined) {
      updates.push(`${column} = $${params.length + 1}`)
      params.push(data[key] === null ? null : String(data[key]))
    }
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

  if (!pool) throw new Error('DATABASE_URL não configurada.')
  await pool.query(
    `UPDATE campaign_events SET ${updates.join(', ')}, updated_at = now() WHERE id = $1::uuid`,
    params
  )
}

export async function deleteCampaignEvent(eventId: string): Promise<void> {
  await db.execute(sql`
    DELETE FROM campaign_events WHERE id = ${eventId}::uuid
  `)
}

export async function getLiveKitRoom(campaignId: string): Promise<LiveKitRoom | null> {
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
  await db.execute(sql`
    INSERT INTO livekit_rooms (campaign_id, room_name, room_url, host_user_id)
    VALUES (${campaignId}::uuid, ${roomName}, ${roomUrl}, ${hostUserId})
    ON CONFLICT (campaign_id) DO NOTHING
  `)
}


export { pool }
