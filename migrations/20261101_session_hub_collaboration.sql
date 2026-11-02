BEGIN;

CREATE TABLE IF NOT EXISTS session_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000),
  idempotency_key UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, actor_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS session_chat_messages_feed_idx
  ON session_chat_messages (session_id, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS campaign_handouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  session_id UUID REFERENCES game_sessions(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  blob_url TEXT,
  blob_pathname TEXT NOT NULL UNIQUE,
  content_type TEXT,
  size_bytes BIGINT CHECK (size_bytes IS NULL OR size_bytes > 0),
  uploaded_by_actor_id TEXT NOT NULL,
  share_mode TEXT NOT NULL DEFAULT 'PRIVATE' CHECK (share_mode IN ('PRIVATE', 'ALL', 'SELECTED')),
  idempotency_key UUID NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  upload_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (campaign_id, uploaded_by_actor_id, idempotency_key),
  CHECK ((upload_completed_at IS NULL AND blob_url IS NULL AND content_type IS NULL AND size_bytes IS NULL)
      OR (upload_completed_at IS NOT NULL AND blob_url IS NOT NULL AND content_type IS NOT NULL AND size_bytes IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS campaign_handouts_campaign_created_idx
  ON campaign_handouts (campaign_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS campaign_handouts_session_idx
  ON campaign_handouts (session_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS campaign_handout_recipients (
  handout_id UUID NOT NULL REFERENCES campaign_handouts(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (handout_id, actor_id)
);
CREATE INDEX IF NOT EXISTS campaign_handout_recipients_actor_idx
  ON campaign_handout_recipients (actor_id, handout_id);

CREATE TABLE IF NOT EXISTS session_shared_visuals (
  session_id UUID PRIMARY KEY REFERENCES game_sessions(id) ON DELETE CASCADE,
  handout_id UUID REFERENCES campaign_handouts(id) ON DELETE SET NULL,
  updated_by_actor_id TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
