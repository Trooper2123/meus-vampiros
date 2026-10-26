-- Additive migration. Apply explicitly to the selected schema; never reset data.
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS allow_player_narrative_edits BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS npc_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), owner_id TEXT NOT NULL,
  name TEXT NOT NULL, sheet_type TEXT NOT NULL CHECK (sheet_type IN ('SIMPLE','INTERMEDIATE','FULL')),
  creature_type TEXT NOT NULL, role TEXT NOT NULL,
  threat_level INTEGER CHECK (threat_level BETWEEN 1 AND 7),
  payload JSONB NOT NULL, character_id UUID REFERENCES characters(id) ON DELETE RESTRICT,
  template_id TEXT, is_template BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ARCHIVED')),
  revision INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (sheet_type = 'FULL' OR threat_level IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS npc_owner_idx ON npc_definitions(owner_id, status);
CREATE TABLE IF NOT EXISTS campaign_npcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  npc_id UUID NOT NULL REFERENCES npc_definitions(id) ON DELETE RESTRICT,
  role_override TEXT, location TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
  revealed_fields JSONB NOT NULL DEFAULT '[]', state JSONB NOT NULL DEFAULT '{}', revision INTEGER NOT NULL DEFAULT 0,
  UNIQUE (campaign_id,npc_id)
);
CREATE TABLE IF NOT EXISTS npc_session_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  campaign_npc_id UUID NOT NULL REFERENCES campaign_npcs(id) ON DELETE RESTRICT,
  instance_key TEXT NOT NULL, snapshot JSONB NOT NULL, state JSONB NOT NULL,
  revealed_fields JSONB NOT NULL DEFAULT '[]', active BOOLEAN NOT NULL DEFAULT true,
  revision INTEGER NOT NULL DEFAULT 0, UNIQUE(session_id,instance_key)
);
CREATE TABLE IF NOT EXISTS npc_operations (
  id UUID PRIMARY KEY, actor_id TEXT NOT NULL, request_hash TEXT NOT NULL,
  npc_id UUID REFERENCES npc_definitions(id) ON DELETE SET NULL,
  instance_id UUID REFERENCES npc_session_instances(id) ON DELETE SET NULL,
  operation TEXT NOT NULL, result JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS npc_instance_session_idx ON npc_session_instances(session_id);

CREATE TABLE IF NOT EXISTS sheet_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  subject_type TEXT NOT NULL CHECK(subject_type IN ('CHARACTER','NPC','ORGANIZATION','PLACE')),
  subject_id UUID NOT NULL, name TEXT NOT NULL DEFAULT '', created_by TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'GM_ONLY', UNIQUE(campaign_id,subject_type,subject_id)
);
CREATE TABLE IF NOT EXISTS sheet_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), context_id UUID NOT NULL REFERENCES sheet_contexts(id) ON DELETE CASCADE,
  section TEXT NOT NULL CHECK(section IN ('GENERAL','PROFILE','ORGANIZATIONS','ABILITIES','INVENTORY','PROPERTIES','REMINDERS')),
  title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '', fields JSONB NOT NULL DEFAULT '{}',
  author_id TEXT NOT NULL, visibility TEXT NOT NULL CHECK(visibility IN ('GM_ONLY','OWNER_ONLY','SHARED_WITH_OWNER','CAMPAIGN_VISIBLE')),
  archived BOOLEAN NOT NULL DEFAULT false, revision INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sheet_record_context_idx ON sheet_records(context_id,section,updated_at);
CREATE TABLE IF NOT EXISTS sheet_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), source_id UUID NOT NULL REFERENCES sheet_contexts(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES sheet_contexts(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL, reciprocal BOOLEAN NOT NULL DEFAULT false, description TEXT NOT NULL DEFAULT '',
  intensity INTEGER CHECK(intensity BETWEEN 0 AND 5), author_id TEXT NOT NULL,
  visibility TEXT NOT NULL CHECK(visibility IN ('GM_ONLY','OWNER_ONLY','SHARED_WITH_OWNER','CAMPAIGN_VISIBLE')),
  revision INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK(source_id <> target_id), UNIQUE(source_id,target_id,relation_type)
);
CREATE TABLE IF NOT EXISTS sheet_media (
  id UUID PRIMARY KEY, context_id UUID REFERENCES sheet_contexts(id) ON DELETE CASCADE,
  subject_type TEXT NOT NULL CHECK(subject_type IN ('CHARACTER','NPC')), subject_id UUID NOT NULL,
  storage_key TEXT NOT NULL UNIQUE, mime_type TEXT NOT NULL, size_bytes INTEGER NOT NULL,
  width INTEGER NOT NULL, height INTEGER NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '', is_portrait BOOLEAN NOT NULL DEFAULT false,
  position_x INTEGER NOT NULL DEFAULT 50 CHECK(position_x BETWEEN 0 AND 100),
  position_y INTEGER NOT NULL DEFAULT 50 CHECK(position_y BETWEEN 0 AND 100),
  visibility TEXT NOT NULL CHECK(visibility IN ('GM_ONLY','OWNER_ONLY','SHARED_WITH_OWNER','CAMPAIGN_VISIBLE')),
  author_id TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0, deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sheet_media_context_idx ON sheet_media(context_id,subject_type,subject_id);
CREATE UNIQUE INDEX IF NOT EXISTS sheet_media_portrait_unique ON sheet_media(subject_type,subject_id,COALESCE(context_id,'00000000-0000-0000-0000-000000000000'::uuid)) WHERE is_portrait AND deleted_at IS NULL;
CREATE TABLE IF NOT EXISTS sheet_upload_requests (
  id UUID PRIMARY KEY, author_id TEXT NOT NULL, context_id UUID REFERENCES sheet_contexts(id) ON DELETE CASCADE,
  subject_type TEXT NOT NULL, subject_id UUID NOT NULL, metadata JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS sheet_upload_actor_idx ON sheet_upload_requests(author_id,created_at);
CREATE TABLE IF NOT EXISTS sheet_reveals (
  id UUID PRIMARY KEY, session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('RECORD','MEDIA')), target_id UUID NOT NULL,
  snapshot JSONB NOT NULL, revealed_by TEXT NOT NULL, revealed_at TIMESTAMPTZ NOT NULL DEFAULT now(), revoked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS sheet_reveal_session_idx ON sheet_reveals(session_id,target_id);
