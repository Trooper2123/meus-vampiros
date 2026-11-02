-- Agrupamento de anotações por marcador.
ALTER TABLE notes ADD COLUMN IF NOT EXISTS marker VARCHAR(80);
CREATE INDEX IF NOT EXISTS idx_notes_campaign_marker ON notes(campaign_id, marker);
CREATE INDEX IF NOT EXISTS idx_notes_search_lower_title ON notes((lower(title)));
