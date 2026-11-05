-- Optional mission scheduling: real-world date or an existing campaign event.
-- A campaign event may use the real, fictional, or custom calendar.
ALTER TABLE campaign_missions ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE campaign_missions ADD COLUMN IF NOT EXISTS campaign_event_id UUID REFERENCES campaign_events(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_campaign_missions_event ON campaign_missions(campaign_event_id) WHERE campaign_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaign_missions_due_date ON campaign_missions(campaign_id,due_date) WHERE due_date IS NOT NULL;
