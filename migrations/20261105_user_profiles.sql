-- Personal identity is scoped to the authenticated user, never to a character.
ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname VARCHAR(80);
ALTER TABLE users ADD COLUMN IF NOT EXISTS pronouns VARCHAR(80);
CREATE INDEX IF NOT EXISTS idx_characters_campaign_player ON characters(campaign_id, user_id) WHERE character_type = 'PLAYER_VAMPIRE' AND status = 'APPROVED';
