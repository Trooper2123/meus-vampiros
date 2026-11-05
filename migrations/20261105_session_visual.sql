-- One shared visual per campaign, backed by an existing private handout.
CREATE TABLE IF NOT EXISTS campaign_visual_state (
 campaign_id UUID PRIMARY KEY REFERENCES campaigns(id) ON DELETE CASCADE,
 handout_id UUID REFERENCES campaign_handouts(id) ON DELETE SET NULL,
 revision BIGINT NOT NULL DEFAULT 0,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
