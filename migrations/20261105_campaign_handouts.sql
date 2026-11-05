CREATE TABLE IF NOT EXISTS campaign_handouts (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
 storage_key TEXT NOT NULL UNIQUE,
 name TEXT NOT NULL,
 mime_type TEXT NOT NULL,
 byte_size INTEGER NOT NULL,
 visibility TEXT NOT NULL DEFAULT 'NARRATOR' CHECK (visibility IN ('NARRATOR','ALL','SELECTED')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS campaign_handouts_campaign_idx ON campaign_handouts(campaign_id,created_at DESC);
CREATE TABLE IF NOT EXISTS campaign_handout_recipients (
 handout_id UUID NOT NULL REFERENCES campaign_handouts(id) ON DELETE CASCADE,
 character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
 PRIMARY KEY(handout_id,character_id)
);
