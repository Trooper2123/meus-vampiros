export const SMS_NPC_SCHEMA = `
SELECT pg_advisory_xact_lock(hashtextextended('sms_npc_schema',0));
-- Preserve all character messages; add separate NPC references, never copy NPCs to characters.
ALTER TABLE character_message_threads ADD COLUMN IF NOT EXISTS npc_a_id UUID REFERENCES npc_definitions(id) ON DELETE RESTRICT;
ALTER TABLE character_message_threads ADD COLUMN IF NOT EXISTS npc_b_id UUID REFERENCES npc_definitions(id) ON DELETE RESTRICT;
ALTER TABLE character_messages ALTER COLUMN sender_character_id DROP NOT NULL;
ALTER TABLE character_messages ADD COLUMN IF NOT EXISTS sender_npc_id UUID REFERENCES npc_definitions(id) ON DELETE RESTRICT;
ALTER TABLE character_message_deliveries DROP CONSTRAINT IF EXISTS character_message_deliveries_pkey;
ALTER TABLE character_message_deliveries ALTER COLUMN recipient_character_id DROP NOT NULL;
ALTER TABLE character_message_deliveries ADD COLUMN IF NOT EXISTS recipient_npc_id UUID REFERENCES npc_definitions(id) ON DELETE RESTRICT;
DO $migration$
DECLARE old_check RECORD;
BEGIN
  FOR old_check IN SELECT conname FROM pg_constraint
    WHERE conrelid='character_message_threads'::regclass AND contype='c'
      AND pg_get_constraintdef(oid) LIKE '%character_a_id%'
      AND conname <> 'sms_direct_participants_typed'
  LOOP EXECUTE format('ALTER TABLE character_message_threads DROP CONSTRAINT %I', old_check.conname); END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='character_message_threads'::regclass AND conname='sms_direct_participants_typed') THEN
    ALTER TABLE character_message_threads ADD CONSTRAINT sms_direct_participants_typed CHECK (
      (kind='COTERIE' AND character_a_id IS NULL AND character_b_id IS NULL AND npc_a_id IS NULL AND npc_b_id IS NULL)
      OR (kind='DIRECT' AND num_nonnulls(character_a_id,npc_a_id)=1 AND num_nonnulls(character_b_id,npc_b_id)=1
        AND COALESCE('CHARACTER:'||character_a_id::text,'NPC:'||npc_a_id::text) <> COALESCE('CHARACTER:'||character_b_id::text,'NPC:'||npc_b_id::text)));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='character_messages'::regclass AND conname='sms_sender_typed') THEN
    ALTER TABLE character_messages ADD CONSTRAINT sms_sender_typed CHECK (num_nonnulls(sender_character_id,sender_npc_id)=1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='character_message_deliveries'::regclass AND conname='sms_delivery_typed') THEN
    ALTER TABLE character_message_deliveries ADD CONSTRAINT sms_delivery_typed CHECK (num_nonnulls(recipient_character_id,recipient_npc_id)=1);
  END IF;
END $migration$;
CREATE UNIQUE INDEX IF NOT EXISTS sms_direct_typed_unique ON character_message_threads
  (campaign_id,(COALESCE('CHARACTER:'||character_a_id::text,'NPC:'||npc_a_id::text)),(COALESCE('CHARACTER:'||character_b_id::text,'NPC:'||npc_b_id::text))) WHERE kind='DIRECT';
CREATE UNIQUE INDEX IF NOT EXISTS sms_delivery_character_unique ON character_message_deliveries(message_id,recipient_character_id) WHERE recipient_character_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS sms_delivery_npc_unique ON character_message_deliveries(message_id,recipient_npc_id) WHERE recipient_npc_id IS NOT NULL;
`
