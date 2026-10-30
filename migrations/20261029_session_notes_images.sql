-- Apply explicitly in one transaction to the approved schema; preserve existing data.
ALTER TABLE sheet_media DROP CONSTRAINT IF EXISTS sheet_media_subject_type_check;
ALTER TABLE sheet_media ADD CONSTRAINT sheet_media_subject_type_check
  CHECK (subject_type IN ('CHARACTER','NPC','NOTE'));
ALTER TABLE sheet_reveals DROP CONSTRAINT IF EXISTS sheet_reveals_kind_check;
ALTER TABLE sheet_reveals ADD CONSTRAINT sheet_reveals_kind_check
  CHECK (kind IN ('RECORD','MEDIA','NOTE'));

-- The reveal UUID identifies its saved note; revocation is checked on every read.
INSERT INTO notes(id,author_user_id,campaign_id,visibility,title,body,links)
SELECT r.id,r.revealed_by,s.campaign_id,'PRIVATE',
  left(COALESCE(NULLIF(r.snapshot->>'title',''),'Revelação da sessão'),120),
  COALESCE(r.snapshot->>'body',r.snapshot->>'description',''),
  jsonb_build_array(jsonb_build_object('targetType','SESSION','targetId',r.session_id::text))
FROM sheet_reveals r JOIN game_sessions s ON s.id=r.session_id
ON CONFLICT(id) DO NOTHING;
CREATE INDEX IF NOT EXISTS sheet_reveals_session_visibility_idx ON sheet_reveals(session_id,revoked_at);
CREATE INDEX IF NOT EXISTS sheet_media_note_idx ON sheet_media(subject_id) WHERE subject_type='NOTE' AND deleted_at IS NULL;
