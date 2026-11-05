import { pool } from '@/lib/db'
import { CharacterCommandError } from '@/lib/character-commands'

export const MISSION_STATES = ['DRAFT','ACTIVE','COMPLETED','FAILED','CANCELLED'] as const
export const MISSION_VISIBILITIES = ['NARRATOR_ONLY','ASSIGNED','CAMPAIGN'] as const
type Status = typeof MISSION_STATES[number]
type Visibility = typeof MISSION_VISIBILITIES[number]
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const validUuid=(value:unknown):value is string=>typeof value==='string'&&uuid.test(value)
const fail=(code:number,message:string):never=>{throw new CharacterCommandError(code,message)}
const allowedTransitions:Record<Status,Status[]>={DRAFT:['ACTIVE','CANCELLED'],ACTIVE:['COMPLETED','FAILED','CANCELLED'],COMPLETED:[],FAILED:[],CANCELLED:[]}
function connection(){if(!pool)fail(503,'Banco não configurado.');return pool!}
async function role(actorId:string,campaignId:string){
 if(!validUuid(campaignId))fail(400,'Mesa inválida.')
 const result=await connection().query<{master:boolean;member:boolean}>(`SELECT master_user_id=$2 AS master, (master_user_id=$2 OR EXISTS(SELECT 1 FROM characters WHERE campaign_id=c.id AND user_id=$2 AND character_type='PLAYER_VAMPIRE' AND status<>'DELETED')) AS member FROM campaigns c WHERE c.id=$1::uuid`,[campaignId,actorId])
 if(!result.rows[0]?.member)fail(403,'Acesso negado.')
 return result.rows[0]
}
function text(value:unknown,max:number,required=false){
 if(typeof value!=='string'||value.length>max||(required&&!value.trim()))fail(422,'Texto inválido.')
 return (value as string).trim()
}
function ids(value:unknown){
 if(!Array.isArray(value)||value.length>100||value.some(v=>!validUuid(v))||new Set(value).size!==value.length)fail(422,'Participantes inválidos.')
 return value as string[]
}
function input(value:unknown,keys:string[]){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!keys.includes(k)))fail(400,'Campos inválidos.')
 return value as Record<string,unknown>
}
export async function listMissions(actorId:string,campaignId:string){
 const access=await role(actorId,campaignId)
 const result=await connection().query(`
 SELECT m.id,m.title,m.description,m.status,m.visibility,m.revision,m.created_at AS "createdAt",m.updated_at AS "updatedAt",
 CASE WHEN $2::boolean THEN m.narrator_notes ELSE NULL END AS "narratorNotes",
 COALESCE((SELECT jsonb_agg(mc.character_id) FROM campaign_mission_characters mc WHERE mc.mission_id=m.id),'[]'::jsonb) AS "characterIds",
 CASE WHEN $2::boolean THEN COALESCE((SELECT jsonb_agg(mn.campaign_npc_id) FROM campaign_mission_npcs mn WHERE mn.mission_id=m.id),'[]'::jsonb) ELSE '[]'::jsonb END AS "npcIds"
 FROM campaign_missions m WHERE m.campaign_id=$1::uuid AND (
 $2::boolean OR (m.status<>'DRAFT' AND (m.visibility='CAMPAIGN' OR
 (m.visibility='ASSIGNED' AND EXISTS(
 SELECT 1 FROM campaign_mission_characters mc JOIN characters ch ON ch.id=mc.character_id
 WHERE mc.mission_id=m.id AND ch.user_id=$3 AND ch.campaign_id=m.campaign_id AND ch.status<>'DELETED'
 ))))) ORDER BY m.updated_at DESC,m.id`,[campaignId,access.master,actorId])
 return {missions:result.rows,canManage:access.master}
}
export async function commandMission(actorId:string,campaignId:string,value:unknown){
 const access=await role(actorId,campaignId)
 if(!access.master)fail(403,'Somente o Narrador pode alterar missões.')
 const data=input(value,['action','missionId','title','description','narratorNotes','visibility','status','expectedRevision','characterIds','npcIds'])
 const action=data.action
 if(action!=='CREATE'&&action!=='UPDATE'&&action!=='TRANSITION')fail(400,'Ação inválida.')
 const client=await connection().connect()
 try{
  await client.query('BEGIN')
  let missionId:string
  if(action==='CREATE'){
   const title=text(data.title,180,true),description=text(data.description??'',10000),notes=text(data.narratorNotes??'',10000)
   const visibility=data.visibility??'NARRATOR_ONLY'
   if(!MISSION_VISIBILITIES.includes(visibility as Visibility))fail(422,'Visibilidade inválida.')
   const inserted=await client.query<{id:string}>(`INSERT INTO campaign_missions(campaign_id,title,description,narrator_notes,visibility,created_by) VALUES($1::uuid,$2,$3,$4,$5,$6) RETURNING id`,[campaignId,title,description,notes,visibility,actorId])
   missionId=inserted.rows[0].id
  }else{
   if(!validUuid(data.missionId)||!Number.isSafeInteger(data.expectedRevision)||Number(data.expectedRevision)<0)fail(422,'Missão ou revisão inválida.')
   missionId=data.missionId as string
   const current=await client.query<{status:Status;revision:number}>(`SELECT status,revision FROM campaign_missions WHERE id=$1::uuid AND campaign_id=$2::uuid FOR UPDATE`,[missionId,campaignId])
   if(!current.rows[0])fail(404,'Missão não encontrada.')
   if(current.rows[0].revision!==data.expectedRevision)fail(409,'Missão alterada por outra operação.')
   if(action==='TRANSITION'){
    if(!MISSION_STATES.includes(data.status as Status)||!allowedTransitions[current.rows[0].status].includes(data.status as Status))fail(422,'Transição inválida.')
    await client.query(`UPDATE campaign_missions SET status=$2,revision=revision+1,updated_at=now() WHERE id=$1::uuid`,[missionId,data.status])
   }else{
    if(current.rows[0].status!=='DRAFT'&&current.rows[0].status!=='ACTIVE')fail(409,'Missão encerrada não pode ser editada.')
    const title=data.title===undefined?null:text(data.title,180,true)
    const description=data.description===undefined?null:text(data.description,10000)
    const notes=data.narratorNotes===undefined?null:text(data.narratorNotes,10000)
    const visibility=data.visibility===undefined?null:data.visibility
    if(visibility!==null&&!MISSION_VISIBILITIES.includes(visibility as Visibility))fail(422,'Visibilidade inválida.')
    await client.query(`UPDATE campaign_missions SET title=COALESCE($2,title),description=COALESCE($3,description),narrator_notes=COALESCE($4,narrator_notes),visibility=COALESCE($5,visibility),revision=revision+1,updated_at=now() WHERE id=$1::uuid`,[missionId,title,description,notes,visibility])
   }
  }
  if(action!=='TRANSITION'){
   if(data.characterIds!==undefined){
    const characterIds=ids(data.characterIds)
    const checked=await client.query<{id:string}>(`SELECT id FROM characters WHERE campaign_id=$1::uuid AND id=ANY($2::uuid[]) AND character_type='PLAYER_VAMPIRE' AND status<>'DELETED'`,[campaignId,characterIds])
    if(checked.rowCount!==characterIds.length)fail(422,'Personagem não pertence à mesa.')
    await client.query('DELETE FROM campaign_mission_characters WHERE mission_id=$1::uuid',[missionId])
    for(const id of characterIds)await client.query('INSERT INTO campaign_mission_characters(mission_id,character_id) VALUES($1::uuid,$2::uuid)',[missionId,id])
   }
   if(data.npcIds!==undefined){
    const npcIds=ids(data.npcIds)
    const checked=await client.query<{id:string}>(`SELECT cn.id FROM campaign_npcs cn JOIN npc_definitions n ON n.id=cn.npc_id WHERE cn.campaign_id=$1::uuid AND cn.id=ANY($2::uuid[]) AND n.status='ACTIVE'`,[campaignId,npcIds])
    if(checked.rowCount!==npcIds.length)fail(422,'NPC não pertence à mesa.')
    await client.query('DELETE FROM campaign_mission_npcs WHERE mission_id=$1::uuid',[missionId])
    for(const id of npcIds)await client.query('INSERT INTO campaign_mission_npcs(mission_id,campaign_npc_id) VALUES($1::uuid,$2::uuid)',[missionId,id])
   }
  }
  await client.query(`INSERT INTO campaign_mission_events(mission_id,actor_id,event_type,details) VALUES($1::uuid,$2,$3,$4::jsonb)`,[missionId,actorId,action,JSON.stringify(action==='TRANSITION'?{status:data.status}:{})])
  await client.query('COMMIT')
  return {missionId}
 }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
}
