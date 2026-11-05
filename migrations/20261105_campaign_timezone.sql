-- Persistent campaign-specific timezone for deadline and event reminders.
-- UTC is a neutral default; narrators can choose an IANA zone in the missions UI.
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';
