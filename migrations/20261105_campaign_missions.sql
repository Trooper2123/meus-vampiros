-- MESA-03 (#72). Migration additive; never truncate existing campaign data.
CREATE TABLE IF NOT EXISTS campaign_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  title VARCHAR(180) NOT NULL CHECK (length(btrim(title)) > 0),
  description TEXT NOT NULL DEFAULT '',
  narrator_notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ACTIVE','COMPLETED','FAILED','CANCELLED')),
  visibility TEXT NOT NULL DEFAULT 'NARRATOR_ONLY' CHECK (visibility IN ('NARRATOR_ONLY','ASSIGNED','CAMPAIGN')),
  revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_campaign_missions_campaign ON campaign_missions(campaign_id,status);
CREATE TABLE IF NOT EXISTS campaign_mission_characters (
  mission_id UUID NOT NULL REFERENCES campaign_missions(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  PRIMARY KEY (mission_id,character_id)
);
CREATE TABLE IF NOT EXISTS campaign_mission_npcs (
  mission_id UUID NOT NULL REFERENCES campaign_missions(id) ON DELETE CASCADE,
  campaign_npc_id UUID NOT NULL REFERENCES campaign_npcs(id) ON DELETE CASCADE,
  PRIMARY KEY (mission_id,campaign_npc_id)
);
CREATE TABLE IF NOT EXISTS campaign_mission_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES campaign_missions(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_campaign_mission_events ON campaign_mission_events(mission_id,created_at);
