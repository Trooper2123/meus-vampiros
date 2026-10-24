import { createHash, randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { db } from './db'
import { noteUuid } from './notes'
import { createCharacter } from './characters'
import { NPC_TEMPLATES, npcFail, npcInteger, npcKeys, npcObject, npcText, npcWarnings, validateNpc, type NpcData } from './npc-domain'
import { NPC_ROLES } from './npc-options'

export type NpcRow = { id: string; owner_id: string; name: string; sheet_type: NpcData['sheetType']; creature_type: NpcData['creatureType']; role: NpcData['role']; threat_level: number | null; payload: NpcData; character_id: string | null; template_id: string | null; is_template: boolean; status: 'ACTIVE' | 'ARCHIVED'; revision: number; created_at: Date; updated_at: Date }
export type NpcTx = Parameters<Parameters<typeof db.transaction>[0]>[0]
export function npcId(value: unknown): string { if (!noteUuid(value)) return npcFail(400, 'Identificador inválido.'); return value }
function canonical(value: unknown): unknown { return Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => [k,canonical(v)])) : value }
export async function npcOperation(actorId: string, key: string, operation: string, input: unknown, apply: (tx: NpcTx) => Promise<Record<string, unknown>>, refs: { npcId?: string; instanceId?: string } = {}) {
  npcId(key)
  const hash = createHash('sha256').update(JSON.stringify(canonical({ operation,input }))).digest('hex')
  return db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${key},0))`)
    const saved = await tx.execute<{ actor_id:string; request_hash:string; result:Record<string,unknown> }>(sql`SELECT actor_id,request_hash,result FROM npc_operations WHERE id = ${key}::uuid`)
    if (saved.rows[0]) { if (saved.rows[0].actor_id !== actorId || saved.rows[0].request_hash !== hash) npcFail(409,'Chave já usada por outra operação.'); return saved.rows[0].result }
    const result = await apply(tx)
    await tx.execute(sql`INSERT INTO npc_operations(id,actor_id,request_hash,npc_id,instance_id,operation,result) VALUES(${key}::uuid,${actorId},${hash},${refs.npcId ?? null}::uuid,${refs.instanceId ?? null}::uuid,${operation},${JSON.stringify(result)}::jsonb)`)
    return result
  })
}
export async function ownNpc(actorId: string, id: string, executor: Pick<typeof db,'execute'> = db, lock = false): Promise<NpcRow> {
  npcId(id)
  const rows = await executor.execute<NpcRow>(sql`SELECT * FROM npc_definitions WHERE id = ${id}::uuid ${lock ? sql`FOR UPDATE` : sql``}`)
  if (!rows.rows[0]) return npcFail(404,'NPC não encontrado.')
  if (rows.rows[0].owner_id !== actorId) return npcFail(403,'Somente o proprietário pode gerenciar este NPC.')
  return rows.rows[0]
}
export async function requireNpcCampaign(actorId: string, campaignId: string, executor: Pick<typeof db,'execute'> = db) {
  npcId(campaignId)
  const rows = await executor.execute<{ master_user_id:string }>(sql`SELECT master_user_id FROM campaigns WHERE id = ${campaignId}::uuid FOR SHARE`)
  if (rows.rows[0]?.master_user_id !== actorId) npcFail(403,'Somente o Narrador desta mesa pode gerenciar NPCs.')
}
async function validateDomitor(actorId: string, data: NpcData, executor: Pick<typeof db,'execute'>, campaignId?: string) {
  if (!data.domitorCharacterId) return
  npcId(data.domitorCharacterId)
  const row = await executor.execute(sql`SELECT ch.id FROM characters ch LEFT JOIN campaigns c ON c.id=ch.campaign_id WHERE ch.id=${data.domitorCharacterId}::uuid AND ch.status<>'DELETED' AND ch.character_type IN ('PLAYER_VAMPIRE','VAMPIRE_NPC') AND (ch.user_id=${actorId} OR c.master_user_id=${actorId}) AND (${campaignId ?? null}::uuid IS NULL OR ch.campaign_id=${campaignId ?? null}::uuid)`)
  if (!row.rows.length || data.creatureType !== 'GHOUL') npcFail(422,'Domitor indisponível ou de outra mesa.')
}
async function fullCharacter(actorId: string, data: NpcData, tx: NpcTx, originalId?: string | null) {
  let previous: Record<string,unknown> = {}
  if (originalId) { const rows = await tx.execute<{ data:Record<string,unknown> }>(sql`SELECT data FROM characters WHERE id=${originalId}::uuid AND user_id=${actorId}`); previous = rows.rows[0]?.data ?? {} }
  const characterType = data.creatureType === 'VAMPIRE' ? 'VAMPIRE_NPC' : data.creatureType === 'GHOUL' ? 'RETAINER' : 'HUMAN_NPC'
  const created = await createCharacter(actorId, {name:data.name,visibility:'ST_ONLY',campaignId:null,data:{...previous,nome:data.name,characterType, ...(data.creatureType === 'GHOUL' ? {retainer:{isGhoul:true,domitorCharacterId:data.domitorCharacterId,bondStrength:data.bondStrength}} : {})}},undefined,undefined,undefined,tx)
  return created.id
}
async function insertNpc(tx: NpcTx, actorId: string, data: NpcData, options: { templateId?:string; isTemplate?:boolean; originalCharacterId?:string | null } = {}) {
  await validateDomitor(actorId,data,tx)
  const id = randomUUID()
  const characterId = data.sheetType === 'FULL' ? await fullCharacter(actorId,data,tx,options.originalCharacterId) : null
  await tx.execute(sql`INSERT INTO npc_definitions(id,owner_id,name,sheet_type,creature_type,role,threat_level,payload,character_id,template_id,is_template) VALUES(${id}::uuid,${actorId},${data.name},${data.sheetType},${data.creatureType},${data.role},${data.threatLevel},${JSON.stringify(data)}::jsonb,${characterId}::uuid,${options.templateId ?? null},${options.isTemplate ?? false})`)
  return id
}
export async function getNpc(actorId: string, id: string) {
  const row = await ownNpc(actorId,id)
  const character=row.character_id?await db.execute<{name:string;total_xp:number;spent_xp:number;revision:number}>(sql`SELECT name,total_xp,spent_xp,revision FROM characters WHERE id=${row.character_id}::uuid AND user_id=${actorId}`):{rows:[]}
  const full=character.rows[0]
  const history=await db.execute(sql`SELECT operation,created_at FROM npc_operations WHERE npc_id=${id}::uuid ORDER BY created_at DESC LIMIT 30`)
  const links = await db.execute<{id:string;campaign_id:string;name:string;role_override:string|null;location:string;notes:string;revision:number;revealed_fields:string[]}>(sql`SELECT cn.*,c.name FROM campaign_npcs cn JOIN campaigns c ON c.id=cn.campaign_id WHERE cn.npc_id=${id}::uuid AND c.master_user_id=${actorId}`)
  return {id:row.id,data:{...row.payload,name:full?.name??row.name},characterId:row.character_id,templateId:row.template_id,isTemplate:row.is_template,status:row.status,revision:row.revision,warnings:npcWarnings(row.payload),campaigns:links.rows,updatedAt:row.updated_at,history:history.rows,experience:full?{total:Number(full.total_xp),spent:Number(full.spent_xp),revision:full.revision}:null}
}
export async function npcDomitors(actorId:string){const rows=await db.execute<{id:string;name:string;campaign_id:string|null}>(sql`SELECT ch.id,ch.name,ch.campaign_id FROM characters ch LEFT JOIN campaigns c ON c.id=ch.campaign_id WHERE ch.status<>'DELETED' AND ch.character_type IN ('PLAYER_VAMPIRE','VAMPIRE_NPC') AND (ch.user_id=${actorId} OR c.master_user_id=${actorId}) ORDER BY ch.name LIMIT 200`);return rows.rows}
export async function listNpcs(actorId: string, options: Record<string,string> = {}) {
  npcKeys(options,['campaignId','query','creatureType','role','sheetType','threatLevel','status','page','sort'])
  const page = options.page === undefined ? 1 : npcInteger(Number(options.page),1,100000)
  if (options.campaignId) await requireNpcCampaign(actorId,options.campaignId)
  const query=npcText(options.query ?? '',120)
  const where = sql`n.owner_id=${actorId} AND NOT n.is_template AND (${query}='' OR n.name ILIKE ${'%'+query+'%'}) AND (${options.status ?? 'ACTIVE'}='ALL' OR n.status=${options.status ?? 'ACTIVE'}) AND (${options.creatureType ?? ''}='' OR n.creature_type=${options.creatureType ?? ''}) AND (${options.role ?? ''}='' OR n.role=${options.role ?? ''}) AND (${options.sheetType ?? ''}='' OR n.sheet_type=${options.sheetType ?? ''}) AND (${options.threatLevel ?? ''}='' OR n.threat_level::text=${options.threatLevel ?? ''}) AND (${options.campaignId ?? null}::uuid IS NULL OR EXISTS(SELECT 1 FROM campaign_npcs cn WHERE cn.npc_id=n.id AND cn.campaign_id=${options.campaignId ?? null}::uuid))`
  if(options.sort&&!['recent','name','threat'].includes(options.sort))npcFail(422,'Ordenação inválida.')
  const order=options.sort==='name'?sql`COALESCE(ch.name,n.name),n.id`:options.sort==='threat'?sql`n.threat_level DESC NULLS LAST,n.id`:sql`n.updated_at DESC,n.id`
  const rows=await db.execute<NpcRow & {total:string;in_session:boolean}>(sql`SELECT n.*,COALESCE(ch.name,n.name) AS name,count(*) OVER() AS total,EXISTS(SELECT 1 FROM npc_session_instances i JOIN campaign_npcs cn ON cn.id=i.campaign_npc_id JOIN game_sessions s ON s.id=i.session_id WHERE cn.npc_id=n.id AND i.active AND s.status='ACTIVE') AS in_session FROM npc_definitions n LEFT JOIN characters ch ON ch.id=n.character_id WHERE ${where} ORDER BY ${order} LIMIT 30 OFFSET ${(page-1)*30}`)
  return {npcs:rows.rows.map(row=>({id:row.id,name:row.name,sheetType:row.sheet_type,creatureType:row.creature_type,role:row.role,threatLevel:row.threat_level,status:row.status,revision:row.revision,characterId:row.character_id,inSession:row.in_session})),total:Number(rows.rows[0]?.total ?? 0),page}
}
export async function npcTemplates(actorId:string) {
  const rows=await db.execute<NpcRow>(sql`SELECT * FROM npc_definitions WHERE owner_id=${actorId} AND is_template ORDER BY name`)
  return {templates:[...NPC_TEMPLATES,...rows.rows.map(row=>({id:row.id,name:row.name,originalName:null,official:false,source:'Modelo personalizado do Narrador.',data:row.payload}))]}
}
export async function createNpc(actorId:string, input:unknown) {
  const value=npcObject(input); npcKeys(value,['data','campaignId','templateId','idempotencyKey'])
  const data=validateNpc(value.data),campaignId=value.campaignId == null ? null : npcId(value.campaignId)
  const templateId=value.templateId == null ? undefined : npcText(value.templateId,120)
  if (templateId && !NPC_TEMPLATES.some(t=>t.id===templateId)) await ownNpc(actorId,npcId(templateId))
  return npcOperation(actorId,npcId(value.idempotencyKey),'NPC_CREATED',value,async tx=>{
    if(campaignId) await requireNpcCampaign(actorId,campaignId,tx)
    const id=await insertNpc(tx,actorId,data,{templateId})
    if(campaignId){await validateDomitor(actorId,data,tx,campaignId);await tx.execute(sql`INSERT INTO campaign_npcs(campaign_id,npc_id) VALUES(${campaignId}::uuid,${id}::uuid)`)}
    return {id}
  })
}
export async function changeNpc(actorId:string,id:string,input:unknown) {
  const value=npcObject(input);npcKeys(value,['action','data','targetSheetType','confirmed','expectedRevision','idempotencyKey','campaignId','roleOverride','location','notes','revealedFields','experience','expectedCharacterRevision','reason'])
  const prior=await ownNpc(actorId,id)
  if(value.action==='CONVERT_PREVIEW') {
    if(!['SIMPLE','INTERMEDIATE','FULL'].includes(String(value.targetSheetType))) npcFail(422,'Modalidade inválida.')
    if(value.targetSheetType===prior.sheet_type)npcFail(422,'Escolha uma modalidade diferente da atual.')
    const data={...prior.payload,sheetType:value.targetSheetType,standardPools:prior.payload.standardPools ?? {physical:(prior.threat_level??1)*2,social:(prior.threat_level??1)*2,mental:(prior.threat_level??1)*2},healthMax:prior.payload.healthMax??5,willpowerMax:prior.payload.willpowerMax??4,threatLevel:prior.threat_level??3}
    return {preview:data,requiresConfirmation:true,keepsOriginal:prior.sheet_type==='FULL',message:'Revise todos os valores sugeridos antes de confirmar. A ficha completa original será preservada.'}
  }
  const revision=npcInteger(value.expectedRevision,0,2147483647)
  return npcOperation(actorId,npcId(value.idempotencyKey),String(value.action),{id,...value},async tx=>{
    const row=await ownNpc(actorId,id,tx,true)
    if(row.revision!==revision) npcFail(409,'O NPC foi alterado. Recarregue antes de salvar.')
    if(value.action==='DUPLICATE'||value.action==='SAVE_TEMPLATE') {
      const copyId=await insertNpc(tx,actorId,{...row.payload,name:row.name+' — cópia'},{templateId:row.template_id??undefined,isTemplate:value.action==='SAVE_TEMPLATE',originalCharacterId:row.character_id})
      return {id:copyId}
    }
    if(value.action==='LINK') {
      const campaignId=npcId(value.campaignId);await requireNpcCampaign(actorId,campaignId,tx);await validateDomitor(actorId,row.payload,tx,campaignId)
      const revealed=value.revealedFields??[]
      if(value.roleOverride!=null&&!Object.hasOwn(NPC_ROLES,String(value.roleOverride)))npcFail(422,'Papel de campanha inválido.')
      if(!Array.isArray(revealed)||revealed.some(field=>!['name','description','identity','portrait','resources'].includes(String(field)))) npcFail(422,'Campos de revelação inválidos.')
      await tx.execute(sql`INSERT INTO campaign_npcs(campaign_id,npc_id,role_override,location,notes,revealed_fields) VALUES(${campaignId}::uuid,${id}::uuid,${value.roleOverride??null},${npcText(value.location)},${npcText(value.notes,10000)},${JSON.stringify(revealed)}::jsonb) ON CONFLICT(campaign_id,npc_id) DO UPDATE SET role_override=EXCLUDED.role_override,location=EXCLUDED.location,notes=EXCLUDED.notes,revealed_fields=EXCLUDED.revealed_fields,revision=campaign_npcs.revision+1`)
    } else if(value.action==='UNLINK') {
      const campaignId=npcId(value.campaignId);await requireNpcCampaign(actorId,campaignId,tx)
      const refs=await tx.execute(sql`SELECT i.id FROM npc_session_instances i JOIN campaign_npcs cn ON cn.id=i.campaign_npc_id WHERE cn.npc_id=${id}::uuid AND cn.campaign_id=${campaignId}::uuid LIMIT 1`)
      if(refs.rows.length)npcFail(409,'Há histórico de sessão; arquive o NPC para preservar os vínculos.')
      await tx.execute(sql`DELETE FROM campaign_npcs WHERE campaign_id=${campaignId}::uuid AND npc_id=${id}::uuid`)
    } else if(value.action==='EDIT'||value.action==='CONVERT') {
      const data=validateNpc(value.data);await validateDomitor(actorId,data,tx)
      if(row.sheet_type==='FULL'&&value.action==='EDIT'&&data.creatureType!==row.creature_type)npcFail(422,'Duplique ou converta a ficha completa para alterar o tipo de criatura preservando o original.')
      if(value.action==='EDIT'&&data.sheetType!==row.sheet_type)npcFail(422,'Use a conversão com prévia para alterar a modalidade.')
      if(value.action==='CONVERT'&&value.confirmed!==true)npcFail(422,'Confirme a prévia revisada.')
      if(value.action==='CONVERT'&&row.sheet_type==='FULL')return {id:await insertNpc(tx,actorId,data,{originalCharacterId:row.character_id})}
      const characterId=data.sheetType==='FULL' ? row.character_id??await fullCharacter(actorId,data,tx) : row.character_id
      await tx.execute(sql`UPDATE npc_definitions SET name=${data.name},sheet_type=${data.sheetType},creature_type=${data.creatureType},role=${data.role},threat_level=${data.threatLevel},payload=${JSON.stringify(data)}::jsonb,character_id=${characterId}::uuid WHERE id=${id}::uuid`)
      if(characterId)await tx.execute(sql`UPDATE characters SET name=${data.name},data=jsonb_set(data,'{nome}',to_jsonb(${data.name}::text)),revision=revision+1 WHERE id=${characterId}::uuid AND user_id=${actorId}`)
    } else if(value.action==='ADJUST_XP'){
      if(!row.character_id||row.sheet_type!=='FULL')npcFail(422,'O controle opcional de XP exige ficha completa.')
      const experience=npcObject(value.experience);npcKeys(experience,['total','spent'])
      const total=npcInteger(experience.total,0,1000000),spent=npcInteger(experience.spent,0,total),reason=npcText(value.reason,500,true)
      const changed=await tx.execute(sql`UPDATE characters SET total_xp=${total},spent_xp=${spent},revision=revision+1 WHERE id=${row.character_id}::uuid AND user_id=${actorId} AND character_type<>'PLAYER_VAMPIRE' AND revision=${npcInteger(value.expectedCharacterRevision,0,2147483647)} RETURNING id`)
      if(!changed.rows.length)npcFail(409,'A ficha mecânica foi alterada. Recarregue antes de ajustar XP.')
      await tx.execute(sql`INSERT INTO character_ledger_events(character_id,event_type,origin,payload,created_by_user_id) VALUES(${row.character_id}::uuid,'NPC_XP_ADJUSTED','USER_ACTION',${JSON.stringify({total,spent,reason})}::jsonb,${actorId})`)
    } else if(value.action==='ARCHIVE'||value.action==='RESTORE') {
      await tx.execute(sql`UPDATE npc_definitions SET status=${value.action==='ARCHIVE'?'ARCHIVED':'ACTIVE'} WHERE id=${id}::uuid`)
    } else if(value.action==='DELETE') {
      const refs=await tx.execute(sql`SELECT id FROM campaign_npcs WHERE npc_id=${id}::uuid LIMIT 1`)
      if(refs.rows.length)npcFail(409,'Desvincule as campanhas ou arquive o NPC; seu histórico será preservado.')
      const narrative=await tx.execute(sql`SELECT id FROM sheet_contexts WHERE subject_type='NPC' AND subject_id=${id}::uuid UNION ALL SELECT id FROM sheet_media WHERE subject_type='NPC' AND subject_id=${id}::uuid AND deleted_at IS NULL LIMIT 1`)
      if(narrative.rows.length||row.character_id)npcFail(409,'Este NPC tem ficha completa ou conteúdo associado. Arquive para preservar os registros.')
      await tx.execute(sql`DELETE FROM npc_definitions WHERE id=${id}::uuid`)
      return {ok:true,id}
    } else npcFail(400,'Operação de NPC inválida.')
    await tx.execute(sql`UPDATE npc_definitions SET revision=revision+1,updated_at=now() WHERE id=${id}::uuid`)
    return {id,ok:true,revision:revision+1}
  },value.action==='DELETE'?{}:{npcId:id})
}
