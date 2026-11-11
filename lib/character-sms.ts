import { pool, ensureAllTables } from '@/lib/db'
import { CharacterCommandError } from '@/lib/character-commands'
import type { PoolClient } from 'pg'
import { SMS_NPC_SCHEMA } from './character-sms-npc-schema'

type Role = 'player' | 'narrator'
type Access = { role: Role; enabled: boolean }
type Character = { id: string; name: string; character_type: string; user_id: string; status: string; visibility: string }
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i
function fail(status: number, message: string): never { throw new CharacterCommandError(status, message) }
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
        coterie_name TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK (kind <> 'DIRECT' OR (character_a_id IS NOT NULL AND character_b_id IS NOT NULL AND character_a_id <> character_b_id)),
        CHECK (kind <> 'COTERIE' OR coterie_id IS NOT NULL)
      )`)
      await pool.query('ALTER TABLE character_message_threads ADD COLUMN IF NOT EXISTS coterie_name TEXT')
      await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS sms_coterie_unique ON character_message_threads (campaign_id,coterie_id) WHERE kind='COTERIE'`)
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
      await pool.query(SMS_NPC_SCHEMA)
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

type CoterieContact = { id: string; name: string; ownedCharacterIds: string[] }

async function smsCoteriesReady(client: PoolClient) {
  const result = await client.query<{ ready:boolean }>(
    "SELECT to_regclass('coteries') IS NOT NULL AND to_regclass('coterie_members') IS NOT NULL AS ready")
  return result.rows[0]?.ready === true
}

async function smsAvailableCoteries(client:PoolClient,campaignId:string,actorId:string,role:Role):Promise<CoterieContact[]> {
  if(!await smsCoteriesReady(client))return []
  const result=await client.query<CoterieContact>(`
    SELECT co.id,co.name,
      ARRAY(SELECT cm2.character_id::text FROM coterie_members cm2
        JOIN characters ch2 ON ch2.id=cm2.character_id
        WHERE cm2.coterie_id=co.id AND ch2.user_id=$2
          AND ch2.character_type='PLAYER_VAMPIRE' AND ch2.status='APPROVED'
          AND cm2.joined_at<=now() AND (cm2.left_at IS NULL OR cm2.left_at>now())) AS "ownedCharacterIds"
    FROM coteries co
    WHERE co.campaign_id=$1::uuid AND ($3::boolean OR EXISTS (
      SELECT 1 FROM coterie_members cm
      JOIN characters ch ON ch.id=cm.character_id
      WHERE cm.coterie_id=co.id AND ch.user_id=$2 AND ch.campaign_id=co.campaign_id
        AND ch.character_type='PLAYER_VAMPIRE' AND ch.status='APPROVED'
        AND cm.joined_at<=now() AND (cm.left_at IS NULL OR cm.left_at>now())))
    ORDER BY co.name`,[campaignId,actorId,role==='narrator'])
  return result.rows
}

async function smsMember(client:PoolClient,campaignId:string,coterieId:string,characterId:string){
  if(!smsUuid(coterieId)||!await smsCoteriesReady(client))return false
  const result=await client.query(`
    SELECT 1 FROM coterie_members cm JOIN coteries co ON co.id=cm.coterie_id
    JOIN characters ch ON ch.id=cm.character_id
    WHERE co.campaign_id=$1::uuid AND co.id=$2::uuid AND cm.character_id=$3::uuid
      AND ch.campaign_id=co.campaign_id AND ch.status='APPROVED'
      AND cm.joined_at<=now() AND (cm.left_at IS NULL OR cm.left_at>now()) LIMIT 1`,
      [campaignId,coterieId,characterId])
  return Boolean(result.rowCount)
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
    const npcContacts = (await client.query<{id:string;name:string;campaignNpcId:string;sheetType:string}>(`
      SELECT n.id,n.name,cn.id AS "campaignNpcId",n.sheet_type AS "sheetType"
      FROM campaign_npcs cn JOIN npc_definitions n ON n.id=cn.npc_id
      WHERE cn.campaign_id=$1::uuid AND n.status='ACTIVE' AND NOT n.is_template
        AND ($2::boolean OR cn.revealed_fields ? 'name' OR cn.revealed_fields ? 'identity')
      ORDER BY n.name,n.id`,[campaignId,a.role==='narrator'])).rows.map(npc=>({...npc,canMessage:true as const}))
    return { ...a, isNarrator: a.role === 'narrator', characters:characters.rows, npcContacts, coteries: await smsAvailableCoteries(client,campaignId,actorId,a.role) }
  } finally { client.release() }
}

type Thread = {npc_a_id:string|null;npc_b_id:string|null;id:string;kind:'DIRECT'|'COTERIE';character_a_id:string|null;character_b_id:string|null;coterie_id:string|null;coterie_name:string|null;updated_at:Date;name_a:string;name_b:string}
async function threadAndAccess(client:PoolClient,campaignId:string,actorId:string,threadId:string,allowEmptyParticipant=false,view?:'player') {
  if (!smsUuid(threadId)) fail(404,'Conversa não encontrada.')
  const a=await access(client,campaignId,actorId,view)
  const record=await client.query<Thread>(`SELECT t.*,COALESCE(ca.name,CASE WHEN t.npc_a_id IS NOT NULL THEN CASE WHEN $3::boolean OR cna.revealed_fields ? 'name' OR cna.revealed_fields ? 'identity' THEN na.name ELSE 'NPC não revelado' END END,t.coterie_name) AS name_a,COALESCE(cb.name,CASE WHEN t.npc_b_id IS NOT NULL THEN CASE WHEN $3::boolean OR cnb.revealed_fields ? 'name' OR cnb.revealed_fields ? 'identity' THEN nb.name ELSE 'NPC não revelado' END END,'Grupo') AS name_b
    FROM character_message_threads t LEFT JOIN characters ca ON ca.id=t.character_a_id
    LEFT JOIN characters cb ON cb.id=t.character_b_id
    LEFT JOIN campaign_npcs cna ON cna.npc_id=t.npc_a_id AND cna.campaign_id=t.campaign_id
    LEFT JOIN npc_definitions na ON na.id=cna.npc_id
    LEFT JOIN campaign_npcs cnb ON cnb.npc_id=t.npc_b_id AND cnb.campaign_id=t.campaign_id
    LEFT JOIN npc_definitions nb ON nb.id=cnb.npc_id
    WHERE t.id=$1::uuid AND t.campaign_id=$2::uuid`,[threadId,campaignId,a.role==='narrator'])
  const thread=record.rows[0]
  if (!thread) fail(404,'Conversa não encontrada.')
  if(a.role!=='narrator'){
    const delivered=await client.query(`SELECT 1 FROM character_messages m
      JOIN character_message_deliveries d ON d.message_id=m.id
      JOIN characters ch ON ch.id=d.recipient_character_id
      WHERE m.thread_id=$1::uuid AND ch.user_id=$2 AND ch.character_type='PLAYER_VAMPIRE' AND ch.status<>'DELETED' LIMIT 1`,[threadId,actorId])
    if(!delivered.rowCount){
      let owner=false
      if(allowEmptyParticipant && thread.kind==='DIRECT'){
        owner=Boolean((await client.query("SELECT 1 FROM characters WHERE id=ANY($1::uuid[]) AND user_id=$2 AND status='APPROVED' AND character_type='PLAYER_VAMPIRE' LIMIT 1",[[thread.character_a_id,thread.character_b_id],actorId])).rowCount)
      } else if(allowEmptyParticipant && thread.kind==='COTERIE' && thread.coterie_id){
        owner=(await smsAvailableCoteries(client,campaignId,actorId,'player')).some(item=>item.id===thread.coterie_id)
      }
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
    const coteries=await smsAvailableCoteries(client,campaignId,actorId,a.role)
    const results=await client.query(`SELECT t.id,t.kind,t.updated_at AS "updatedAt",
      COALESCE(ca.name,CASE WHEN t.npc_a_id IS NOT NULL THEN CASE WHEN $3::boolean OR cna.revealed_fields ? 'name' OR cna.revealed_fields ? 'identity' THEN na.name ELSE 'NPC não revelado' END END,t.coterie_name) AS "characterA",COALESCE(cb.name,CASE WHEN t.npc_b_id IS NOT NULL THEN CASE WHEN $3::boolean OR cnb.revealed_fields ? 'name' OR cnb.revealed_fields ? 'identity' THEN nb.name ELSE 'NPC não revelado' END END,'Grupo') AS "characterB",
      CASE WHEN $3::boolean THEN 0 ELSE
        (SELECT count(*)::int FROM character_messages m JOIN character_message_deliveries d ON d.message_id=m.id
          JOIN characters ch ON ch.id=d.recipient_character_id
          WHERE m.thread_id=t.id AND d.read_at IS NULL AND ch.user_id=$2 AND ch.character_type='PLAYER_VAMPIRE' AND ch.status<>'DELETED')
      END AS "unreadCount"
      FROM character_message_threads t
      LEFT JOIN characters ca ON ca.id=t.character_a_id LEFT JOIN characters cb ON cb.id=t.character_b_id
      LEFT JOIN campaign_npcs cna ON cna.npc_id=t.npc_a_id AND cna.campaign_id=t.campaign_id
      LEFT JOIN npc_definitions na ON na.id=cna.npc_id
      LEFT JOIN campaign_npcs cnb ON cnb.npc_id=t.npc_b_id AND cnb.campaign_id=t.campaign_id
      LEFT JOIN npc_definitions nb ON nb.id=cnb.npc_id
      WHERE t.campaign_id=$1::uuid AND ($3::boolean OR t.coterie_id=ANY($4::uuid[]) OR EXISTS (
        SELECT 1 FROM character_messages m JOIN character_message_deliveries d ON d.message_id=m.id
        JOIN characters ch ON ch.id=d.recipient_character_id
        WHERE m.thread_id=t.id AND ch.user_id=$2 AND ch.character_type='PLAYER_VAMPIRE' AND ch.status<>'DELETED'))
      ORDER BY t.updated_at DESC LIMIT 100`,[campaignId,actorId,a.role==='narrator',coteries.map(c=>c.id)])
    return {...a,isNarrator:a.role==='narrator',threads:results.rows}
  } finally {client.release()}
}

export async function smsMessages(campaignId:string,actorId:string,threadId:string,cursor?:string,view?:'player') {
  await ensureSmsSchema()
  const client=await pool!.connect()
  try{
    const {a,thread}=await threadAndAccess(client,campaignId,actorId,threadId,true,view)
    if(cursor && !smsUuid(cursor)) fail(400,'Cursor inválido.')
    const rows=await client.query(`SELECT m.id,m.body,m.sender_character_id AS "senderCharacterId",
      CASE WHEN $3::boolean OR cn.revealed_fields ? 'name' OR cn.revealed_fields ? 'identity' THEN m.sender_npc_id ELSE NULL END AS "senderNpcId",
      COALESCE(c.name,CASE WHEN $3::boolean OR cn.revealed_fields ? 'name' OR cn.revealed_fields ? 'identity' THEN n.name ELSE 'NPC não revelado' END) AS "senderName",m.created_at AS "createdAt",
      CASE WHEN $3::boolean THEN m.impersonated_by_narrator ELSE NULL END AS "narratorOperated"
      FROM character_messages m LEFT JOIN characters c ON c.id=m.sender_character_id
      LEFT JOIN campaign_npcs cn ON cn.npc_id=m.sender_npc_id AND cn.campaign_id=m.campaign_id
      LEFT JOIN npc_definitions n ON n.id=cn.npc_id
      WHERE m.thread_id=$1::uuid
        AND ($3::boolean OR EXISTS(
          SELECT 1 FROM character_message_deliveries d
          JOIN characters ch ON ch.id=d.recipient_character_id
          WHERE d.message_id=m.id AND ch.user_id=$2 AND ch.character_type='PLAYER_VAMPIRE' AND ch.status<>'DELETED'))
        AND ($4::uuid IS NULL OR (m.created_at,m.id)<(SELECT created_at,id FROM character_messages WHERE id=$4::uuid AND thread_id=$1::uuid))
      ORDER BY m.created_at DESC,m.id DESC LIMIT 50`,[threadId,actorId,a.role==='narrator',cursor??null])
    return { ...a, isNarrator:a.role==='narrator', thread:{id:thread.id,kind:thread.kind,coterieId:thread.coterie_id,characterA:thread.name_a,characterB:thread.name_b,characterAId:thread.character_a_id,characterBId:thread.character_b_id,...(a.role==='narrator'?{npcAId:thread.npc_a_id,npcBId:thread.npc_b_id}:{})},
      messages:rows.rows.reverse() }
  } finally {client.release()}
}

type Participant = { kind: 'CHARACTER' | 'NPC'; id: string }
function participant(input:Record<string,unknown>,prefix:'sender'|'recipient'):Participant {
  const characterId=input[`${prefix}CharacterId`],npcId=input[`${prefix}NpcId`]
  if(characterId!==undefined && npcId!==undefined)fail(422,'Escolha uma única identidade por participante.')
  const id=characterId??npcId
  if(!smsUuid(id))fail(422,'Participante inválido.')
  return {kind:npcId!==undefined?'NPC':'CHARACTER',id:id.toLowerCase()}
}
function participantKey(value:Participant){return `${value.kind}:${value.id}`}
async function resolveParticipant(client:PoolClient,campaignId:string,value:Participant,role:Role,actorId:string,sending:boolean) {
  if(value.kind==='CHARACTER'){
    const ch=await character(client,campaignId,value.id)
    if(sending?!canActAs(ch,role,actorId):!validRecipient(ch,role))fail(sending?403:404,'Personagem indisponível para esta operação.')
    return { ...value, userId:ch.user_id }
  }
  if(sending && role!=='narrator')fail(403,'Somente o Narrador pode falar como um NPC.')
  const found=await client.query(`SELECT n.id FROM campaign_npcs cn
    JOIN npc_definitions n ON n.id=cn.npc_id
    WHERE cn.campaign_id=$1::uuid AND n.id=$2::uuid AND n.status='ACTIVE' AND NOT n.is_template
      AND ($3::boolean OR cn.revealed_fields ? 'name' OR cn.revealed_fields ? 'identity')
    FOR SHARE OF n,cn`,[campaignId,value.id,role==='narrator'])
  if(!found.rowCount)fail(404,'NPC indisponível nesta mesa.')
  return {...value,userId:null}
}

export async function smsStart(campaignId:string,actorId:string,input:Record<string,unknown>,view?:'player'){
  const sender=participant(input,'sender')
  if(input.kind!==undefined && input.kind!=='DIRECT' && input.kind!=='COTERIE')fail(422,'Tipo de conversa inválido.')
  const kind=input.kind==='COTERIE'?'COTERIE':'DIRECT'
  const recipient=kind==='DIRECT'?participant(input,'recipient'):null
  if(recipient && participantKey(sender)===participantKey(recipient))fail(422,'Destinatário inválido.')
  const selectedCoterieId=input.coterieId
  if(kind==='COTERIE'&&!smsUuid(selectedCoterieId))fail(422,'Coterie inválida.')
  await ensureSmsSchema()
  const client=await pool!.connect()
  try{
    await client.query('BEGIN')
    await client.query('SELECT id FROM campaigns WHERE id=$1::uuid FOR UPDATE',[campaignId])
    const a=await access(client,campaignId,actorId,view)
    if(!a.enabled)fail(409,'SMS_DISABLED')
    await resolveParticipant(client,campaignId,sender,a.role,actorId,true)
    let threadId:string
    if(kind==='COTERIE'){
      if(!await smsCoteriesReady(client))fail(409,'COTERIE_UNAVAILABLE')
      const co=(await smsAvailableCoteries(client,campaignId,actorId,a.role)).find(row=>row.id===selectedCoterieId)
      if(!co)fail(404,'Coterie indisponível.')
      if(a.role==='player'&&!await smsMember(client,campaignId,co.id,sender.id))fail(403,'Seu personagem não pertence a essa Coterie.')
      const thread=await client.query<{id:string}>(`INSERT INTO character_message_threads
        (campaign_id,kind,coterie_id,coterie_name)
        VALUES($1::uuid,'COTERIE',$2::uuid,$3)
        ON CONFLICT(campaign_id,coterie_id) WHERE kind='COTERIE'
        DO UPDATE SET coterie_name=EXCLUDED.coterie_name RETURNING id`,
        [campaignId,co.id,co.name])
      threadId=thread.rows[0].id
    }else{
      await resolveParticipant(client,campaignId,recipient!,a.role,actorId,false)
      const [left,right]=[sender,recipient!].sort((a,b)=>participantKey(a)<participantKey(b)?-1:1)
      const values=[campaignId,left.kind==='CHARACTER'?left.id:null,right.kind==='CHARACTER'?right.id:null,left.kind==='NPC'?left.id:null,right.kind==='NPC'?right.id:null]
      const thread=await client.query<{id:string}>(`INSERT INTO character_message_threads
        (campaign_id,kind,character_a_id,character_b_id,npc_a_id,npc_b_id)
        VALUES($1::uuid,'DIRECT',$2::uuid,$3::uuid,$4::uuid,$5::uuid)
        ON CONFLICT DO NOTHING RETURNING id`,values)
      const existing=thread.rows[0]??(await client.query<{id:string}>(`SELECT id FROM character_message_threads
        WHERE campaign_id=$1::uuid AND kind='DIRECT' AND character_a_id IS NOT DISTINCT FROM $2::uuid
          AND character_b_id IS NOT DISTINCT FROM $3::uuid AND npc_a_id IS NOT DISTINCT FROM $4::uuid AND npc_b_id IS NOT DISTINCT FROM $5::uuid`,values)).rows[0]
      if(!existing)fail(409,'Não foi possível confirmar a conversa.')
      threadId=existing.id
    }
    await client.query('COMMIT')
    return {id:threadId}
  }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
}

export async function smsSend(campaignId:string,actorId:string,threadId:string,input:Record<string,unknown>,view?:'player'){
  const identity=participant(input,'sender')
  const key=input.idempotencyKey,body=input.body
  if(!smsUuid(key)||typeof body!=='string'||body.trim().length<1||body.length>2000) fail(422,'Mensagem inválida.')
  const idempotencyKey=key,messageBody=body
  await ensureSmsSchema()
  const client=await pool!.connect()
  try {
    await client.query('BEGIN')
    // Lock the campaign row so disable and send cannot race each other.
    const locked=await client.query('SELECT id FROM campaigns WHERE id=$1::uuid FOR UPDATE',[campaignId])
    if(!locked.rowCount) fail(404,'Mesa não encontrada.')
    const {a,thread}=await threadAndAccess(client,campaignId,actorId,threadId,true,view)
    if(!a.enabled) fail(409,'SMS_DISABLED')
    const sender=await resolveParticipant(client,campaignId,identity,a.role,actorId,true)
    if(thread.kind==='DIRECT'){
      for(const endpoint of [{kind:thread.npc_a_id?'NPC':'CHARACTER',id:thread.npc_a_id??thread.character_a_id},{kind:thread.npc_b_id?'NPC':'CHARACTER',id:thread.npc_b_id??thread.character_b_id}] as Participant[]) {
        await resolveParticipant(client,campaignId,endpoint,a.role,actorId,false)
      }
    }
    if(a.role==='player' && thread.kind==='DIRECT' && sender.id!==thread.character_a_id && sender.id!==thread.character_b_id) fail(403,'O personagem não participa desta conversa.')
    if(a.role==='player' && thread.kind==='COTERIE' && (!thread.coterie_id || !await smsMember(client,campaignId,thread.coterie_id,sender.id))) fail(403,'O personagem não pertence a essa Coterie.')
    // A narrator may speak as an NPC or third character; only the two original thread
    // participants and the character whose voice was used receive this specific message.
    const exists=await client.query<{id:string;body:string;thread_id:string;sender_character_id:string|null;sender_npc_id:string|null}>(
      'SELECT id,body,thread_id,sender_character_id,sender_npc_id FROM character_messages WHERE campaign_id=$1::uuid AND created_by_actor_id=$2 AND idempotency_key=$3::uuid',
      [campaignId,actorId,idempotencyKey])
    if(exists.rows[0]){
      const old=exists.rows[0]
      if(old.body!==messageBody.trim()||old.thread_id!==threadId||(identity.kind==='CHARACTER'?old.sender_character_id!==identity.id||!!old.sender_npc_id:old.sender_npc_id!==identity.id||!!old.sender_character_id)) fail(409,'Chave já utilizada com outra mensagem.')
      await client.query('COMMIT')
      return {id:old.id,replayed:true}
    }
    const quota=await client.query<{count:number}>(`SELECT count(*)::int AS count FROM character_messages
      WHERE campaign_id=$1::uuid AND created_by_actor_id=$2
        AND created_at>now()-interval '1 minute'`,[campaignId,actorId])
    if((quota.rows[0]?.count??0)>=30)fail(429,'Limite de 30 mensagens por minuto atingido.')
    const insert=await client.query<{id:string}>(`INSERT INTO character_messages
      (campaign_id,thread_id,sender_character_id,created_by_actor_id,impersonated_by_narrator,body,idempotency_key,sender_npc_id)
      VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7::uuid,$8::uuid) RETURNING id`,
      [campaignId,threadId,sender.kind==='CHARACTER'?sender.id:null,actorId,a.role==='narrator',messageBody.trim(),idempotencyKey,sender.kind==='NPC'?sender.id:null])
    const id=insert.rows[0].id
    let receivers:Participant[]
    if(thread.kind==='COTERIE'){
      if(!thread.coterie_id || !await smsCoteriesReady(client))fail(409,'COTERIE_UNAVAILABLE')
      const members=await client.query<{id:string}>(`
        SELECT DISTINCT ch.id FROM coterie_members cm
        JOIN coteries co ON co.id=cm.coterie_id
        JOIN characters ch ON ch.id=cm.character_id
        WHERE co.id=$1::uuid AND co.campaign_id=$2::uuid
          AND ch.campaign_id=co.campaign_id AND ch.character_type='PLAYER_VAMPIRE' AND ch.status='APPROVED'
          AND cm.joined_at<=now() AND (cm.left_at IS NULL OR cm.left_at>now())`,
        [thread.coterie_id,campaignId])
      receivers=members.rows.map(member=>({kind:'CHARACTER',id:member.id}))
    }else{
      receivers=[{kind:thread.npc_a_id?'NPC':'CHARACTER',id:thread.npc_a_id??thread.character_a_id},{kind:thread.npc_b_id?'NPC':'CHARACTER',id:thread.npc_b_id??thread.character_b_id}] as Participant[]
    }
    if(!receivers.some(receiver=>participantKey(receiver)===participantKey(sender)))receivers.push(sender)
    for(const receiver of new Map(receivers.map(value=>[participantKey(value),value])).values()){
      const self=participantKey(receiver)===participantKey(sender)
      const reason=self ? (a.role==='narrator'&&sender.userId!==actorId?'NARRATOR_AS_CHARACTER':'SENDER_COPY') : (thread.kind==='COTERIE'?'COTERIE_MEMBER':'DIRECT_RECIPIENT')
      await client.query(`INSERT INTO character_message_deliveries(message_id,recipient_character_id,reason,read_at,recipient_npc_id)
        VALUES($1::uuid,$2::uuid,$3,CASE WHEN $4::boolean THEN now() ELSE NULL END,$5::uuid)`,
        [id,receiver.kind==='CHARACTER'?receiver.id:null,reason,self&&a.role==='player',receiver.kind==='NPC'?receiver.id:null])
    }
    await client.query('UPDATE character_message_threads SET updated_at=now() WHERE id=$1::uuid',[threadId])
    await client.query("INSERT INTO character_message_audit(campaign_id,message_id,actor_id,action,details) VALUES($1::uuid,$2::uuid,$3,'SENT',$4::jsonb)",
      [campaignId,id,actorId,JSON.stringify({participant:identity,...(identity.kind==='CHARACTER'?{asCharacter:identity.id}:{}),narrator:a.role==='narrator'})])
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
