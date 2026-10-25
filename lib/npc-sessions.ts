import { sql } from 'drizzle-orm'
import { db } from './db'
import { getGameSession } from './game-sessions'
import { npcFail,npcInteger,npcKeys,npcObject,npcPool,npcText,type NpcData } from './npc-domain'
import { npcId,npcOperation,type NpcTx } from './npc-store'
import { validateDamage,readSessionState, type DamageTrack } from './vtm-v5/session-state'
import { calculateSecondaryAttributes } from './vtm-v5/secondary-attributes'
import { normalizeCharacterRulesInput } from './vtm-v5/normalize'
import { rollV5Pool } from './vtm-v5/dice-roll-service'
import { serverDiceProvider,type DiceProvider } from './vtm-v5/dice-provider'
import { resolveBasicContest } from './vtm-v5/dice-evaluator'
import { SPECIALTY_SKILL_NAMES } from './vtm-v5/skills'

type Snapshot={npcId:string;name:string;data:NpcData;characterId:string|null;fullData:Record<string,unknown>|null}
type InstanceState={healthDamage:DamageTrack;willpowerDamage:DamageTrack;hunger:number;conditions:string[]}
type Instance={id:string;session_id:string;campaign_npc_id:string;instance_key:string;snapshot:Snapshot;state:InstanceState;revealed_fields:string[];active:boolean;revision:number;campaign_revision:number}
const revealFields=new Set(['name','description','identity','portrait','resources'])
function fields(value:unknown):string[]{if(!Array.isArray(value)||value.length>revealFields.size||new Set(value).size!==value.length||value.some(v=>typeof v!=='string'||!revealFields.has(v))){ return npcFail(422,'Campos de revelação inválidos.'); }return value as string[]}
function maxima(snapshot:Snapshot){if(snapshot.data.sheetType==='FULL'&&snapshot.fullData){const result=calculateSecondaryAttributes(snapshot.fullData);return {healthMax:result.healthMax,willpowerMax:result.willpowerMax}}return {healthMax:snapshot.data.healthMax,willpowerMax:snapshot.data.willpowerMax}}
async function instance(tx:Pick<typeof db,'execute'>,sessionId:string,id:string,lock=false){const rows=await tx.execute<Instance>(sql`SELECT i.*,cn.revision AS campaign_revision FROM npc_session_instances i JOIN campaign_npcs cn ON cn.id=i.campaign_npc_id WHERE i.id=${npcId(id)}::uuid AND i.session_id=${sessionId}::uuid ${lock?sql`FOR UPDATE OF i`:sql``}`);if(!rows.rows[0]){ return npcFail(404,'Instância de NPC não encontrada.'); }return rows.rows[0]}
function poolFor(row:Instance,value:Record<string,unknown>,opponent=false){
  const data=row.snapshot.data,prefix=opponent?'opponent':'',category=npcText(value.category??'physical',20,true)
  if(!['physical','social','mental'].includes(category)){ return npcFail(422,'Categoria de pool inválida.') }
  const exceptionalId=value[opponent?'opponentExceptionalId':'exceptionalId']
  if(data.sheetType!=='FULL'){ return npcPool(data,category as 'physical'|'social'|'mental',typeof exceptionalId==='string'?exceptionalId:undefined) }
  if(!row.snapshot.fullData){ return npcFail(422,'Complete a ficha mecânica antes de rolar.') }
  const input=normalizeCharacterRulesInput(row.snapshot.fullData),attribute=npcText(value[opponent?prefix+'Attribute':'attribute']??'',120),skill=npcText(value[opponent?prefix+'SkillId':'skillId']??'',120)
  const a=input.attributes[attribute],s=input.skills[skill]??0
  if(!Object.hasOwn(SPECIALTY_SKILL_NAMES,skill)||!Number.isSafeInteger(a)||a<1||a>10||!Number.isSafeInteger(s)||s<0||s>10){ return npcFail(422,'Selecione atributo e habilidade válidos na ficha completa.') }
  return {pool:a+s,origin:'Atributo + habilidade da ficha completa'}
}
async function checkSession(tx:NpcTx,actorId:string,sessionId:string,allowClosed=false){const rows=await tx.execute<{master_user_id:string;status:string}>(sql`SELECT c.master_user_id,s.status FROM game_sessions s JOIN campaigns c ON c.id=s.campaign_id WHERE s.id=${sessionId}::uuid FOR SHARE OF c,s`);if(rows.rows[0]?.master_user_id!==actorId||!allowClosed&&rows.rows[0].status!=='ACTIVE'){ npcFail(403,'A sessão não está autorizada para esta operação.') }}
export async function getSessionNpcs(actorId:string,sessionId:string){
  const {session,canManage}=await getGameSession(actorId,npcId(sessionId))
  const rows=await db.execute<Instance>(sql`SELECT i.*,cn.revision AS campaign_revision FROM npc_session_instances i JOIN campaign_npcs cn ON cn.id=i.campaign_npc_id WHERE i.session_id=${sessionId}::uuid ORDER BY i.instance_key LIMIT 200`)
  const instances=rows.rows.filter(row=>canManage||row.revealed_fields.length>0).map(row=>{
    if(canManage){ return {...row,maxima:maxima(row.snapshot)} }
    const revealed=row.revealed_fields,snapshot=row.snapshot
    return {id:row.id,active:row.active,...(revealed.includes('name')?{name:snapshot.name}:{}),...(revealed.includes('description')?{description:snapshot.data.description}:{}),...(revealed.includes('identity')?{creatureType:snapshot.data.creatureType}:{}),...(revealed.includes('resources')?{state:row.state,maxima:maxima(snapshot)}:{})}
  })
  const history=await db.execute<{id:string;result:Record<string,unknown>;created_at:Date}>(sql`SELECT o.id,o.result,o.created_at FROM npc_operations o JOIN npc_session_instances i ON i.id=o.instance_id WHERE i.session_id=${sessionId}::uuid AND o.operation='NPC_ROLL' ORDER BY o.created_at DESC LIMIT 50`)
  const rolls=history.rows.filter(row=>canManage||row.result.visibility==='PUBLIC').map(row=>canManage?row:{id:row.id,result:{roll:row.result.roll,opposition:row.result.opposition,contest:row.result.contest,reason:row.result.reason},created_at:row.created_at})
  const available=canManage?await db.execute(sql`SELECT cn.id,n.name,n.sheet_type,n.threat_level FROM campaign_npcs cn JOIN npc_definitions n ON n.id=cn.npc_id WHERE cn.campaign_id=${session.campaignId}::uuid AND n.status='ACTIVE' ORDER BY n.name`):{rows:[]}
  return {session,canManage,instances,rolls,available:available.rows}
}
export async function sessionNpcCommand(actorId:string,sessionId:string,input:unknown,provider:DiceProvider=serverDiceProvider){
  const session=await getGameSession(actorId,npcId(sessionId)),value=npcObject(input)
  npcKeys(value,['action','id','campaignNpcId','instanceKey','expectedRevision','idempotencyKey','state','revealedFields','active','category','exceptionalId','attribute','skillId','modifier','difficulty','visibility','reason','opponentInstanceId','opponentExceptionalId','opponentAttribute','opponentSkillId','powerId','expectedCampaignRevision'])
  if(!session.canManage||session.session.status!=='ACTIVE'&&value.action!=='RECONCILE'){ npcFail(403,'Somente o Narrador pode operar NPCs nesta sessão.') }
  const action=String(value.action),key=npcId(value.idempotencyKey)
  if(action==='ADD'){ return npcOperation(actorId,key,'NPC_INSTANCE_ADDED',{sessionId,...value},async tx=>{
    await checkSession(tx,actorId,sessionId)
    const rows=await tx.execute<{id:string;npc_id:string;payload:NpcData;name:string;character_id:string|null;data:Record<string,unknown>|null;game_state:Record<string,unknown>|null;state:Partial<InstanceState>|null;revealed_fields:string[]}>(sql`SELECT cn.id,cn.npc_id,n.payload,COALESCE(ch.name,n.name) AS name,n.character_id,ch.data,ch.game_state,cn.state,cn.revealed_fields FROM campaign_npcs cn JOIN npc_definitions n ON n.id=cn.npc_id LEFT JOIN characters ch ON ch.id=n.character_id WHERE cn.id=${npcId(value.campaignNpcId)}::uuid AND cn.campaign_id=${session.session.campaignId}::uuid AND n.status='ACTIVE' FOR SHARE OF cn,n`)
    const row=rows.rows[0];if(!row){ npcFail(403,'NPC não pertence a esta mesa.') }
    const snapshot:Snapshot={npcId:row.npc_id,name:row.name,data:row.payload,characterId:row.character_id,fullData:row.data}
    const fullState=row.data?readSessionState(row.data,row.game_state??{}):null
    const state:InstanceState={healthDamage:fullState?.healthDamage??{superficial:0,aggravated:0},willpowerDamage:fullState?.willpowerDamage??{superficial:0,aggravated:0},hunger:fullState?.hunger??row.payload.hunger,conditions:[],...(row.state??{})}
    const max=maxima(snapshot)
    if(max.healthMax!==null&&!validateDamage(state.healthDamage,max.healthMax)||max.willpowerMax!==null&&!validateDamage(state.willpowerDamage,max.willpowerMax)){ npcFail(422,'Revise o estado persistente da campanha antes de adicionar à sessão.') }
    const inserted=await tx.execute(sql`INSERT INTO npc_session_instances(session_id,campaign_npc_id,instance_key,snapshot,state,revealed_fields) VALUES(${sessionId}::uuid,${row.id}::uuid,${npcText(value.instanceKey,120,true)},${JSON.stringify(snapshot)}::jsonb,${JSON.stringify(state)}::jsonb,${JSON.stringify(row.revealed_fields)}::jsonb) ON CONFLICT(session_id,instance_key) DO NOTHING RETURNING id`)
    if(!inserted.rows.length){ npcFail(409,'Já existe uma instância com essa identificação na sessão.') }
    return {id:inserted.rows[0].id}
  }) }
  const id=npcId(value.id)
  return npcOperation(actorId,key,action==='ROLL'?'NPC_ROLL':'NPC_'+action,{sessionId,...value},async tx=>{
    await checkSession(tx,actorId,sessionId,action==='RECONCILE')
    const row=await instance(tx,sessionId,id,true),revision=npcInteger(value.expectedRevision,0,2147483647)
    if(row.revision!==revision){ npcFail(409,'A instância foi alterada. Recarregue antes de tentar novamente.') }
    if(!row.active&&action!=='RECONCILE'&&action!=='UPDATE'){ npcFail(409,'A participação deste NPC foi encerrada.') }
    if(action==='ROLL'){
      return await rollSessionNpc(value,row,provider,tx,sessionId,id)
    }
    if(action==='USE_POWER'){
      const power=row.snapshot.data.specialAbilities.find(power=>power.id===value.powerId)
      if(!power){ npcFail(422,'Poder especial não registrado nesta instância.') }
      return {id,power:power.name,reason:npcText(value.reason,500,true),message:'Uso registrado; custos e efeitos narrativos devem ser conduzidos nos controles autorizados.'}
    }
    if(action==='RECONCILE'){
      const changed=await tx.execute(sql`UPDATE campaign_npcs SET state=${JSON.stringify(row.state)}::jsonb,revision=revision+1 WHERE id=${row.campaign_npc_id}::uuid AND revision=${npcInteger(value.expectedCampaignRevision,0,2147483647)} RETURNING id`)
      if(!changed.rows.length){ npcFail(409,'O estado da campanha mudou. Revise antes de reconciliar.') }
      return {id,ok:true}
    }
    if(action!=='UPDATE'){ npcFail(400,'Operação de sessão inválida.') }
    const state=updateNpcInstanceState(row,value)
    const revealed=value.revealedFields===undefined?row.revealed_fields:fields(value.revealedFields)
    await tx.execute(sql`UPDATE npc_session_instances SET state=${JSON.stringify(state)}::jsonb,revealed_fields=${JSON.stringify(revealed)}::jsonb,active=${value.active??row.active},revision=revision+1 WHERE id=${id}::uuid`)
    return {id,ok:true,revision:revision+1}
  },{instanceId:id})
}

function updateNpcInstanceState(row: Instance,value: Record<string,unknown>) {
  const state={ ...row.state },changes=npcObject(value.state??{}),max=maxima(row.snapshot)
  npcKeys(changes,['healthDamage','willpowerDamage','hunger','conditions'])
  if(changes.healthDamage!==undefined) { if(max.healthMax===null||!validateDamage(changes.healthDamage,max.healthMax)) { npcFail(422,'Dano de Vitalidade inválido ou máximo não definido.')}  state.healthDamage=changes.healthDamage as DamageTrack} 
  if(changes.willpowerDamage!==undefined) { if(max.willpowerMax===null||!validateDamage(changes.willpowerDamage,max.willpowerMax)) { npcFail(422,'Dano de Vontade inválido ou máximo não definido.')}  state.willpowerDamage=changes.willpowerDamage as DamageTrack} 
  if(changes.hunger!==undefined) { if(row.snapshot.data.creatureType!=='VAMPIRE') { npcFail(422,'Esta criatura não usa Fome vampírica.')}  state.hunger=npcInteger(changes.hunger,0,5)} 
  if(changes.conditions!==undefined) { state.conditions=instanceConditions(changes.conditions) } 
  if(value.active!==undefined&&typeof value.active!=='boolean') { npcFail(422,'Participação inválida.')} 
  return state
}

async function rollSessionNpc(value: Record<string,unknown>,row: Instance,provider: DiceProvider,tx: NpcTx,sessionId: string,id: string) {
  const modifier=npcInteger(value.modifier??0,-30,30),difficulty=npcInteger(value.difficulty,1,50),selected=poolFor(row,value),pool=Math.max(0,Math.min(50,selected.pool+modifier))
  if(!['PUBLIC','SECRET'].includes(String(value.visibility))) { npcFail(422,'Visibilidade da rolagem inválida.')} 
  const hunger=row.snapshot.data.creatureType==='VAMPIRE'? Math.min(pool,row.state.hunger):0
  const roll=rollV5Pool(provider,pool,hunger,difficulty)
  let opposition: ReturnType<typeof rollV5Pool>|null=null,contest: ReturnType<typeof resolveBasicContest>|null=null
  if(value.opponentInstanceId) { const opponent=await instance(tx,sessionId,npcId(value.opponentInstanceId)); if(!opponent.active||opponent.id===id) { npcFail(422,'Oponente inválido.')}  const p=poolFor(opponent,value,true); opposition=rollV5Pool(provider,p.pool,opponent.snapshot.data.creatureType==='VAMPIRE'? Math.min(p.pool,opponent.state.hunger):0,difficulty); contest=resolveBasicContest(roll.successes,opposition.successes)} 
  return { id,pool,origin: selected.origin,roll,opposition,contest,visibility: value.visibility,reason: npcText(value.reason,500,true) }
}

function instanceConditions(value:unknown){
 if(!Array.isArray(value)||value.length>20){ npcFail(422,'Condições inválidas.') }
 return value.map(condition=>npcText(condition,120,true))
}
