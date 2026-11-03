import { pool, ensureAllTables } from '@/lib/db'
import { CharacterCommandError } from '@/lib/character-commands'
import type { PoolClient } from 'pg'

type Role = 'player' | 'narrator'
type Access = { role: Role; enabled: boolean }
type Character = { id: string; name: string; character_type: string; user_id: string; status: string; visibility: string }
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i
const fail = (status: number, message: string): never => { throw new CharacterCommandError(status, message) }
export function smsUuid(value: unknown): value is string { return typeof value === 'string' && uuid.test(value) }

let schema: Promise<void> | undefined
export async function ensureSmsSchema() {
  await ensureAllTables()
  if (!pool) fail(503, 'O SMS da campanha requer PostgreSQL.')
  if (!schema) {
    schema = (async () => {
      if (!pool) return
      await pool.query("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS character_sms_enabled BOOLEAN NOT NULL DEFAULT true")
      await pool.query(`CREATE TABLE IF NOT EXISTS character_message_threads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        kind TEXT NOT NULL DEFAULT 'DIRECT' CHECK (kind IN ('DIRECT','COTERIE')),
        character_a_id UUID REFERENCES characters(id),
        character_b_id UUID REFERENCES characters(id),
        coterie_id UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK (kind <> 'DIRECT' OR (character_a_id IS NOT NULL AND character_b_id IS NOT NULL AND character_a_id <> character_b_id)),
        CHECK (kind <> 'COTERIE' OR coterie_id IS NOT NULL)
      )`)
      await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS sms_direct_unique ON character_message_threads
        (campaign_id, character_a_id, character_b_id) WHERE kind='DIRECT'`)
      await pool.query(`CREATE TABLE IF NOT EXISTS character_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        thread_id UUID NOT NULL REFERENCES character_message_threads(id) ON DELETE CASCADE,
        sender_character_id UUID NOT NULL REFERENCES characters(id),
        created_by_actor_id TEXT NOT NULL,
        impersonated_by_narrator BOOLEAN NOT NULL DEFAULT false,
        body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
        idempotency_key UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (campaign_id, created_by_actor_id, idempotency_key)
      )`)
      await pool.query(`CREATE TABLE IF NOT EXISTS character_message_deliveries (
        message_id UUID NOT NULL REFERENCES character_messages(id) ON DELETE CASCADE,
        recipient_character_id UUID NOT NULL REFERENCES characters(id),
        reason TEXT NOT NULL CHECK (reason IN ('DIRECT_RECIPIENT','SENDER_COPY','NARRATOR_AS_CHARACTER','COTERIE_MEMBER')),
        read_at TIMESTAMPTZ,
        PRIMARY KEY (message_id, recipient_character_id)
      )`)
      await pool.query(`CREATE TABLE IF NOT EXISTS character_message_audit (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        message_id UUID REFERENCES character_messages(id),
        actor_id TEXT NOT NULL,
        action TEXT NOT NULL,
        details JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`)
      await pool.query('CREATE INDEX IF NOT EXISTS sms_messages_timeline ON character_messages (thread_id, created_at DESC, id DESC)')
      await pool.query('CREATE INDEX IF NOT EXISTS sms_deliveries_inbox ON character_message_deliveries (recipient_character_id, read_at, message_id)')
      await pool.query('CREATE INDEX IF NOT EXISTS sms_threads_campaign ON character_message_threads (campaign_id, updated_at DESC)')
    })().catch(error => { schema = undefined; throw error })
  }
  await schema
}

async function access(db: PoolClient, campaignId: string, actorId: string, view?: 'player'): Promise<Access> {
  if (!smsUuid(campaignId)) fail(400, 'Mesa inválida.')
  const result = await db.query<{ master_user_id: string; character_sms_enabled: boolean; status: string }>(
    'SELECT master_user_id,character_sms_enabled,status FROM campaigns WHERE id=$1::uuid', [campaignId])
  const campaign = result.rows[0]
  if (!campaign) fail(404, 'Mesa não encontrada.')
  if (campaign.master_user_id === actorId && view !== 'player') return { role: 'narrator', enabled: campaign.character_sms_enabled }
  const member = await db.query('SELECT 1 FROM characters WHERE campaign_id=$1::uuid AND user_id=$2 AND character_type=$3 AND status<>$4 LIMIT 1',
    [campaignId,actorId,'PLAYER_VAMPIRE','DELETED'])
  if (!member.rowCount) fail(404, 'Mesa não disponível.')
  return { role: 'player', enabled: campaign.character_sms_enabled }
}

async function character(db: PoolClient, campaignId: string, id: string): Promise<Character> {
  if (!smsUuid(id)) fail(400, 'Personagem inválido.')
  const found = await db.query<Character>(
    'SELECT id,name,character_type,user_id,status,visibility FROM characters WHERE id=$1::uuid AND campaign_id=$2::uuid AND status<>$3',
    [id,campaignId,'DELETED'])
  if (!found.rows[0]) fail(404, 'Personagem indisponível.')
  return found.rows[0]
}
function canActAs(ch: Character, role: Role, actorId: string) {
  if (role === 'narrator') return true
  return ch.user_id === actorId && ch.character_type === 'PLAYER_VAMPIRE' && ch.status === 'APPROVED'
}
function validRecipient(ch: Character, role: Role) {
  return role === 'narrator' || ch.character_type === 'PLAYER_VAMPIRE' && ch.status === 'APPROVED' ||
    ch.visibility === 'PLAYER_VISIBLE' && ch.character_type !== 'PLAYER_VAMPIRE'
}

export async function smsSettings(campaignId: string, actorId: string) {
  await ensureSmsSchema()
  const client = await pool!.connect()
  try {
    const a = await access(client,campaignId,actorId)
    return { enabled: a.enabled, isNarrator: a.role === 'narrator' }
  } finally { client.release() }
}
export async function setSmsSettings(campaignId: string, actorId: string, enabled: unknown) {
  if (typeof enabled !== 'boolean') fail(422, 'Configuração inválida.')
  await ensureSmsSchema()
  const client = await pool!.connect()
  try {
    await client.query('BEGIN')
    const a = await access(client,campaignId,actorId)
    if (a.role !== 'narrator') fail(403,'Apenas o Narrador pode alterar o SMS.')
    const before = await client.query<{character_sms_enabled:boolean}>('SELECT character_sms_enabled FROM campaigns WHERE id=$1::uuid FOR UPDATE',[campaignId])
    await client.query('UPDATE campaigns SET character_sms_enabled=$2 WHERE id=$1::uuid',[campaignId,enabled])
    await client.query("INSERT INTO character_message_audit(campaign_id,actor_id,action,details) VALUES ($1::uuid,$2,'SETTINGS_CHANGED',$3::jsonb)",
      [campaignId,actorId,JSON.stringify({before:before.rows[0].character_sms_enabled,after:enabled})])
    await client.query('COMMIT')
    return {enabled}
  } catch(e) { await client.query('ROLLBACK'); throw e } finally { client.release() }
}

export async function smsContacts(campaignId: string, actorId: string, view?: 'player') {
  await ensureSmsSchema()
  const client=await pool!.connect()
  try {
    const a=await access(client,campaignId,actorId,view)
    const characters=await client.query<{id:string;name:string;characterType:string;owned:boolean}>(
      `SELECT id,name,character_type AS "characterType",user_id=$2 AS owned FROM characters
       WHERE campaign_id=$1::uuid AND status<>'DELETED'
         AND ($3::boolean OR (character_type='PLAYER_VAMPIRE' AND status='APPROVED')
           OR (character_type<>'PLAYER_VAMPIRE' AND visibility='PLAYER_VISIBLE'))
       ORDER BY name`,[campaignId,actorId,a.role==='narrator'])
    return { ...a, characters:characters.rows }
  } finally { client.release() }
}

type Thread = {id:string;kind:string;character_a_id:string;character_b_id:string;updated_at:Date;name_a:string;name_b:string}
async function threadAndAccess(client:PoolClient,campaignId:string,actorId:string,threadId:string,allowEmptyParticipant=false,view?:'player') {
  if (!smsUuid(threadId)) fail(404,'Conversa não encontrada.')
  const a=await access(client,campaignId,actorId,view)
  const record=await client.query<Thread>(`SELECT t.*,ca.name AS name_a,cb.name AS name_b
    FROM character_message_threads t JOIN characters ca ON ca.id=t.character_a_id
    JOIN characters cb ON cb.id=t.character_b_id
    WHERE t.id=$1::uuid AND t.campaign_id=$2::uuid`,[threadId,campaignId])
  const thread=record.rows[0]
  if (!thread) fail(404,'Conversa não encontrada.')
  if(a.role!=='narrator'){
    const delivered=await client.query(`SELECT 1 FROM character_messages m
      JOIN character_message_deliveries d ON d.message_id=m.id
      JOIN characters ch ON ch.id=d.recipient_character_id
      WHERE m.thread_id=$1::uuid AND ch.user_id=$2 AND ch.character_type='PLAYER_VAMPIRE' AND ch.status<>'DELETED' LIMIT 1`,[threadId,actorId])
    if(!delivered.rowCount){
      const owner=allowEmptyParticipant && (await client.query('SELECT 1 FROM characters WHERE id=ANY($1::uuid[]) AND user_id=$2 AND status=\'APPROVED\' LIMIT 1',[[thread.character_a_id,thread.character_b_id],actorId])).rowCount
      if(!owner) fail(404,'Conversa não encontrada.')
    }
  }
  return {a,thread}
}

export async function smsThreads(campaignId:string,actorId:string,view?:'player'){
  await ensureSmsSchema()
  const client=await pool!.connect()
  try {
    const a=await access(client,campaignId,actorId,view)
    const results=await client.query(`SELECT t.id,t.kind,t.updated_at AS "updatedAt",
      ca.name AS "characterA",cb.name AS "characterB",
      (SELECT count(*)::int FROM character_messages m JOIN character_message_deliveries d ON d.message_id=m.id
        JOIN characters ch ON ch.id=d.recipient_character_id
        WHERE m.thread_id=t.id AND d.read_at IS NULL AND ch.user_id=$2 AND ch.character_type='PLAYER_VAMPIRE' AND ch.status<>'DELETED') AS "unreadCount"
      FROM character_message_threads t
      JOIN characters ca ON ca.id=t.character_a_id JOIN characters cb ON cb.id=t.character_b_id
      WHERE t.campaign_id=$1::uuid AND ($3::boolean OR EXISTS (
        SELECT 1 FROM character_messages m JOIN character_message_deliveries d ON d.message_id=m.id
        JOIN characters ch ON ch.id=d.recipient_character_id
        WHERE m.thread_id=t.id AND ch.user_id=$2 AND ch.character_type='PLAYER_VAMPIRE' AND ch.status<>'DELETED'))
      ORDER BY t.updated_at DESC LIMIT 100`,[campaignId,actorId,a.role==='narrator'])
    return {...a,threads:results.rows}
  } finally {client.release()}
}

export async function smsMessages(campaignId:string,actorId:string,threadId:string,cursor?:string,view?:'player') {
  await ensureSmsSchema()
  const client=await pool!.connect()
  try{
    const {a,thread}=await threadAndAccess(client,campaignId,actorId,threadId,true,view)
    if(cursor && !smsUuid(cursor)) fail(400,'Cursor inválido.')
    const rows=await client.query(`SELECT m.id,m.body,m.sender_character_id AS "senderCharacterId",
      c.name AS "senderName",m.created_at AS "createdAt",
      CASE WHEN $3::boolean THEN m.impersonated_by_narrator ELSE NULL END AS "narratorOperated"
      FROM character_messages m JOIN characters c ON c.id=m.sender_character_id
      WHERE m.thread_id=$1::uuid
        AND ($3::boolean OR EXISTS(
          SELECT 1 FROM character_message_deliveries d
          JOIN characters ch ON ch.id=d.recipient_character_id
          WHERE d.message_id=m.id AND ch.user_id=$2 AND ch.character_type='PLAYER_VAMPIRE' AND ch.status<>'DELETED'))
        AND ($4::uuid IS NULL OR (m.created_at,m.id)<(SELECT created_at,id FROM character_messages WHERE id=$4::uuid AND thread_id=$1::uuid))
      ORDER BY m.created_at DESC,m.id DESC LIMIT 50`,[threadId,actorId,a.role==='narrator',cursor??null])
    return { ...a, thread:{id:thread.id,characterA:thread.name_a,characterB:thread.name_b,characterAId:thread.character_a_id,characterBId:thread.character_b_id},
      messages:rows.rows.reverse() }
  } finally {client.release()}
}

export async function smsStart(campaignId:string,actorId:string,input:Record<string,unknown>,view?:'player'){
  const senderId=input.senderCharacterId
  const recipientId=input.recipientCharacterId
  if(!smsUuid(senderId)||!smsUuid(recipientId)||senderId===recipientId) fail(422,'Remetente ou destinatário inválido.')
  await ensureSmsSchema()
  const client=await pool!.connect()
  try{
    await client.query('BEGIN')
    await client.query('SELECT id FROM campaigns WHERE id=$1::uuid FOR UPDATE',[campaignId])
    const a=await access(client,campaignId,actorId,view)
    if(!a.enabled) fail(409,'SMS_DISABLED')
    const sender=await character(client,campaignId,senderId)
    const recipient=await character(client,campaignId,recipientId)
    if(!canActAs(sender,a.role,actorId)) fail(403,'Não é possível enviar por este personagem.')
    if(!validRecipient(recipient,a.role)) fail(404,'Destinatário indisponível.')
    const [left,right]=[sender.id,recipient.id].sort()
    const t=await client.query<{id:string}>(`INSERT INTO character_message_threads(campaign_id,kind,character_a_id,character_b_id)
      VALUES($1::uuid,'DIRECT',$2::uuid,$3::uuid)
      ON CONFLICT (campaign_id,character_a_id,character_b_id) WHERE kind='DIRECT'
      DO UPDATE SET updated_at=character_message_threads.updated_at RETURNING id`,[campaignId,left,right])
    await client.query('COMMIT')
    return {id:t.rows[0].id}
  } catch(e){await client.query('ROLLBACK');throw e} finally{client.release()}
}

export async function smsSend(campaignId:string,actorId:string,threadId:string,input:Record<string,unknown>,view?:'player'){
  const senderId=input.senderCharacterId
  const key=input.idempotencyKey
  const body=input.body
  if(!smsUuid(senderId)||!smsUuid(key)||typeof body!=='string'||body.trim().length<1||body.length>2000) fail(422,'Mensagem inválida.')
  await ensureSmsSchema()
  const client=await pool!.connect()
  try {
    await client.query('BEGIN')
    // Lock the campaign row so disable and send cannot race each other.
    const locked=await client.query('SELECT id FROM campaigns WHERE id=$1::uuid FOR UPDATE',[campaignId])
    if(!locked.rowCount) fail(404,'Mesa não encontrada.')
    const {a,thread}=await threadAndAccess(client,campaignId,actorId,threadId,true,view)
    if(!a.enabled) fail(409,'SMS_DISABLED')
    const sender=await character(client,campaignId,senderId)
    if(!canActAs(sender,a.role,actorId)) fail(403,'Você não pode enviar como este personagem.')
    if(a.role==='player' && sender.id!==thread.character_a_id && sender.id!==thread.character_b_id) fail(403,'O personagem não participa desta conversa.')
    // A narrator may speak as an NPC or third character; only the two original thread
    // participants and the character whose voice was used receive this specific message.
    const exists=await client.query<{id:string;body:string;thread_id:string;sender_character_id:string}>(
      'SELECT id,body,thread_id,sender_character_id FROM character_messages WHERE campaign_id=$1::uuid AND created_by_actor_id=$2 AND idempotency_key=$3::uuid',
      [campaignId,actorId,key])
    if(exists.rows[0]){
      const old=exists.rows[0]
      if(old.body!==body.trim()||old.thread_id!==threadId||old.sender_character_id!==senderId) fail(409,'Chave já utilizada com outra mensagem.')
      await client.query('COMMIT')
      return {id:old.id,replayed:true}
    }
    const insert=await client.query<{id:string}>(`INSERT INTO character_messages
      (campaign_id,thread_id,sender_character_id,created_by_actor_id,impersonated_by_narrator,body,idempotency_key)
      VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7::uuid) RETURNING id`,
      [campaignId,threadId,senderId,actorId,a.role==='narrator'&&sender.user_id!==actorId,body.trim(),key])
    const id=insert.rows[0].id
    const receivers=[thread.character_a_id,thread.character_b_id]
    if(sender.id!==thread.character_a_id&&sender.id!==thread.character_b_id)receivers.push(sender.id)
    for(const receiver of new Set(receivers)){
      const reason=receiver===sender.id ? (a.role==='narrator'&&sender.user_id!==actorId?'NARRATOR_AS_CHARACTER':'SENDER_COPY') : 'DIRECT_RECIPIENT'
      await client.query(`INSERT INTO character_message_deliveries(message_id,recipient_character_id,reason,read_at)
        VALUES($1::uuid,$2::uuid,$3,CASE WHEN $4::boolean THEN now() ELSE NULL END)`,
        [id,receiver,reason,receiver===sender.id&&a.role==='player'])
    }
    await client.query('UPDATE character_message_threads SET updated_at=now() WHERE id=$1::uuid',[threadId])
    await client.query("INSERT INTO character_message_audit(campaign_id,message_id,actor_id,action,details) VALUES($1::uuid,$2::uuid,$3,'SENT',$4::jsonb)",
      [campaignId,id,actorId,JSON.stringify({asCharacter:senderId,narrator:a.role==='narrator'})])
    await client.query('COMMIT')
    return {id,replayed:false}
  }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
}

export async function smsRead(campaignId:string,actorId:string,threadId:string,view?:'player'){
  await ensureSmsSchema()
  const client=await pool!.connect()
  try{
    const {a}=await threadAndAccess(client,campaignId,actorId,threadId,false,view)
    if(a.role==='narrator')return {ok:true}
    await client.query(`UPDATE character_message_deliveries d SET read_at=now()
      FROM character_messages m,characters ch
      WHERE d.message_id=m.id AND ch.id=d.recipient_character_id
      AND m.thread_id=$1::uuid AND ch.user_id=$2 AND ch.character_type='PLAYER_VAMPIRE' AND d.read_at IS NULL`,[threadId,actorId])
    return {ok:true}
  }finally{client.release()}
}
