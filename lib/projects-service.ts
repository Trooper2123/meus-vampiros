import { sql } from 'drizzle-orm'
import { db } from './db'
import { CharacterCommandError } from './character-commands'
import { campaignAccess,dots,optionalText,requireCharacterOfCampaign,requireText,requireUuid,runCampaignCommand,type Session11Tx,type CampaignAccess } from './session11-common'
import { advanceProjectDie,launchDifficulty,projectScope,resolveProjectGoal,resolveProjectLaunch } from './vtm-v5/projects'
import { serverDiceProvider,type DiceProvider } from './vtm-v5/dice-provider'

type ProjectStatus='DRAFT'|'AWAITING_APPROVAL'|'ACTIVE'|'SUCCESS'|'FAILED'|'ABANDONED'
type ProjectRow={
 id:string; campaign_id:string; owner_character_id:string|null; coterie_id:string|null; created_by_user_id:string;
 name:string; description:string; goal_description:string; project_type:'PERSONAL'|'COTERIE'; status:ProjectStatus;
 target_trait:string|null;target_current_dots:number|null;target_final_dots:number|null;scope:number|null;
 increment_unit:string|null;increment_value:number|null;project_die:number|null;
 launch_pool:number|null;launch_difficulty:number|null;launch_result:unknown;launch_failure_count:number;
 approved_at:Date|null; revision:number; goal_roll_requested:boolean;
}
type Stake={characterId?:string;coterieId?:string;trait:string;dots:number}
export type ProjectCommand={
 action:'CREATE'|'UPDATE_DRAFT'|'SET_PARTICIPANTS'|'SUBMIT'|'APPROVE'|'LAUNCH'|'COMMIT_STAKE'|'INCREMENT'|'REQUEST_GOAL'|'RESOLVE_GOAL'|'ABANDON';
 idempotencyKey:string; projectId?:string; ownerCharacterId?:string; coterieId?:string;
 name?:string;description?:string;goalDescription?:string;
 targetTrait?:string;currentDots?:number;finalDots?:number;incrementUnit?:string;incrementValue?:number;
 launchPool?:number;goalPool?:number;rollingCharacterId?:string;stakes?:Stake[];
 participantIds?:string[];expectedRevision?:number;reason?:string
}
async function assertOwner(tx:Session11Tx,project:ProjectRow,access:CampaignAccess,actorId:string){
 if(!(await participantAccess(tx,project,actorId,access)))throw new CharacterCommandError(403,'Somente o proprietário, integrantes autorizados ou o Narrador podem modificar este projeto.')
}
async function requireProject(tx:Session11Tx,campaignId:string,id:string){
 requireUuid(id,'Projeto inválido.')
 const result=await tx.execute<ProjectRow>(sql`SELECT id,campaign_id,owner_character_id,coterie_id,created_by_user_id,name,description,goal_description,project_type,status,target_trait,target_current_dots,target_final_dots,scope,increment_unit,increment_value,project_die,launch_pool,launch_difficulty,launch_result,launch_failure_count,approved_at,revision,goal_roll_requested FROM character_projects WHERE id=${id}::uuid AND campaign_id=${campaignId}::uuid FOR UPDATE`)
 if(!result.rows[0])throw new CharacterCommandError(404,'Projeto não encontrado nesta mesa.')
 return result.rows[0]
}
function expectRevision(project:ProjectRow,revision:unknown){
 if(!Number.isSafeInteger(revision)||Number(revision)!==project.revision)throw new CharacterCommandError(409,'Projeto alterado. Atualize antes de executar a operação.')
}
async function event(tx:Session11Tx,projectId:string,type:string,actorId:string,previous:number|null,next:number|null,description:string,mechanics:unknown={}){
 await tx.execute(sql`INSERT INTO project_events (project_id,type,previous_project_die,new_project_die,description,mechanical_data,actor_id) VALUES (${projectId}::uuid,${type},${previous},${next},${description},${JSON.stringify(mechanics)}::jsonb,${actorId})`)
}
async function changeRevision(tx:Session11Tx,projectId:string){
 await tx.execute(sql`UPDATE character_projects SET revision=revision+1,updated_at=now() WHERE id=${projectId}::uuid`)
}
async function participantAccess(tx:Session11Tx,project:ProjectRow,actorId:string,access:CampaignAccess){
 if(access.is_master||project.created_by_user_id===actorId)return true
 if(project.project_type==='PERSONAL'){
   const own=await tx.execute<{id:string}>(sql`SELECT id FROM characters WHERE id=${project.owner_character_id}::uuid AND user_id=${actorId}`)
   return Boolean(own.rows[0])
 }
 const rows=await tx.execute<{id:string}>(sql`SELECT cm.id FROM coterie_members cm JOIN characters ch ON ch.id=cm.character_id WHERE cm.coterie_id=${project.coterie_id}::uuid AND ch.user_id=${actorId} AND cm.left_at IS NULL LIMIT 1`)
 return Boolean(rows.rows[0])
}
function requireMaster(access:CampaignAccess){if(!access.is_master)throw new CharacterCommandError(403,'Ação exclusiva do Narrador da mesa.')}
async function readOrigin(tx:Session11Tx,project:ProjectRow,actorId:string){
 if(project.project_type==='PERSONAL'){
   const character=await requireCharacterOfCampaign(tx,project.campaign_id,project.owner_character_id!)
   if(character.user_id!==actorId)throw new CharacterCommandError(403,'Personagem não pertence ao jogador.')
 }else{
   const c=await tx.execute<{id:string}>(sql`SELECT id FROM coteries WHERE id=${project.coterie_id}::uuid AND campaign_id=${project.campaign_id}::uuid`)
   if(!c.rows[0])throw new CharacterCommandError(422,'Coterie não pertence à mesa.')
   const m=await tx.execute<{id:string}>(sql`SELECT cm.id FROM coterie_members cm JOIN characters ch ON ch.id=cm.character_id WHERE cm.coterie_id=${project.coterie_id}::uuid AND ch.user_id=${actorId} AND cm.left_at IS NULL LIMIT 1`)
   if(!m.rows[0])throw new CharacterCommandError(403,'É necessário ser membro da Coterie para propor o projeto.')
 }
}
async function availableStake(tx:Session11Tx,project:ProjectRow,item:Stake){
 const trait=requireText(item.trait,'Background',80)
 const amount=dots(item.dots,'Pontos comprometidos',1)
 const hasCharacter=typeof item.characterId==='string',hasCoterie=typeof item.coterieId==='string'
 if(hasCharacter===hasCoterie)throw new CharacterCommandError(400,'Stake precisa pertencer a um personagem ou à Coterie.')
 let actual=0
 if(hasCoterie){
   requireUuid(item.coterieId,'Coterie inválida.')
   if(project.coterie_id!==item.coterieId)throw new CharacterCommandError(403,'Stake de outra Coterie.')
   const r=await tx.execute<{dots:number}>(sql`SELECT dots FROM coterie_backgrounds WHERE coterie_id=${item.coterieId}::uuid AND background_code=${trait.toUpperCase()} FOR UPDATE`)
   actual=r.rows.reduce((sum,row)=>sum+Number(row.dots),0)
 }else{
   const ch=await requireCharacterOfCampaign(tx,project.campaign_id,item.characterId!)
   const r=await tx.execute<{data:Record<string,unknown>}>(sql`SELECT data FROM characters WHERE id=${ch.id}::uuid FOR UPDATE`)
   const data=r.rows[0]?.data??{}
   const backgrounds=Array.isArray(data.vantagens)?data.vantagens:[]
   actual=backgrounds.reduce<number>((sum,entry)=>{
     if(!entry||typeof entry!=='object'||Array.isArray(entry))return sum
     const v=entry as {name?:unknown;level?:unknown}
     return typeof v.name==='string'&&v.name.trim().toUpperCase()===trait.toUpperCase() ? sum+Number(v.level??0):sum
   },0)
 }
 const existing=await tx.execute<{dots:number}>(sql`SELECT COALESCE(SUM(dots),0)::int AS dots FROM project_stakes WHERE trait=${trait} AND released_at IS NULL AND ${hasCharacter?sql`character_id=${item.characterId}::uuid`:sql`coterie_id=${item.coterieId}::uuid`}`)
 if(actual-Number(existing.rows[0]?.dots??0)<amount)throw new CharacterCommandError(422,'Não há dots disponíveis para comprometer neste Background.')
 return {trait,amount}
}
async function commitStakes(tx:Session11Tx,project:ProjectRow,stakes:Stake[],required:number){
 if(required===0){if(stakes.length)throw new CharacterCommandError(422,'Um lançamento crítico não exige Stake.');return}
 if(!stakes.length||stakes.length>12)throw new CharacterCommandError(422,'Informe os Background dots comprometidos pelos participantes.')
 let sum=0
 const seen=new Set<string>()
 for(const stake of stakes){
   const key=`${stake.characterId??stake.coterieId}:${stake.trait.toUpperCase()}`
   if(seen.has(key))throw new CharacterCommandError(422,'Stake duplicado.');seen.add(key)
   const checked=await availableStake(tx,project,stake)
   sum+=checked.amount
 }
 if(sum!==required)throw new CharacterCommandError(422,`O lançamento exige ${required} pontos em Stake.`)
 for(const stake of stakes)await tx.execute(sql`INSERT INTO project_stakes (project_id,character_id,coterie_id,trait,dots) VALUES (${project.id}::uuid,${stake.characterId??null}::uuid,${stake.coterieId??null}::uuid,${stake.trait.trim()},${stake.dots})`)
}
async function finalize(tx:Session11Tx,projectId:string,status:'SUCCESS'|'FAILED'|'ABANDONED'){
 await tx.execute(sql`UPDATE character_projects SET status=${status},completed_at=now(),goal_roll_requested=false WHERE id=${projectId}::uuid`)
 await tx.execute(sql`UPDATE project_stakes SET released_at=now() WHERE project_id=${projectId}::uuid AND released_at IS NULL`)
}
async function applyStakeLoss(tx:Session11Tx,project:ProjectRow,loss:number){
 const stakes=await tx.execute<{id:string;character_id:string|null;coterie_id:string|null;trait:string;dots:number}>(sql`SELECT id,character_id,coterie_id,trait,dots FROM project_stakes WHERE project_id=${project.id}::uuid AND released_at IS NULL ORDER BY created_at,id FOR UPDATE`)
 let remaining=loss,spent=0
 for(const stake of stakes.rows){
   if(remaining<=0)break
   const consumed=Math.min(Number(stake.dots),remaining)
   remaining-=consumed;spent+=consumed
   if(stake.coterie_id){
     const rows=await tx.execute<{id:string;dots:number}>(sql`SELECT id,dots FROM coterie_backgrounds WHERE coterie_id=${stake.coterie_id}::uuid AND background_code=${stake.trait.toUpperCase()} ORDER BY id FOR UPDATE`)
     let toDeduct=consumed
     for(const row of rows.rows){if(toDeduct<=0)break;const debit=Math.min(row.dots,toDeduct);toDeduct-=debit;if(row.dots===debit)await tx.execute(sql`DELETE FROM coterie_backgrounds WHERE id=${row.id}::uuid`);else await tx.execute(sql`UPDATE coterie_backgrounds SET dots=dots-${debit} WHERE id=${row.id}::uuid`)}
   }else if(stake.character_id){
     const rows=await tx.execute<{data:Record<string,unknown>}>(sql`SELECT data FROM characters WHERE id=${stake.character_id}::uuid FOR UPDATE`)
     const data=rows.rows[0]?.data??{}
     const list=Array.isArray(data.vantagens)?[...data.vantagens]:[]
     let remainingDots=consumed
     const revised=list.map(item=>{
       if(remainingDots<=0||!item||typeof item!=='object'||Array.isArray(item))return item
       const v=item as {name?:string;level?:number}
       if(v.name?.toUpperCase()!==stake.trait.toUpperCase())return item
       const debit=Math.min(Number(v.level??0),remainingDots);remainingDots-=debit
       return {...v,level:Number(v.level??0)-debit}
     })
     if(remainingDots>0)throw new CharacterCommandError(409,'Background não está mais disponível para sofrer a perda.')
     await tx.execute(sql`UPDATE characters SET data=${JSON.stringify({...data,vantagens:revised})}::jsonb,revision=revision+1,updated_at=now() WHERE id=${stake.character_id}::uuid`)
     await tx.execute(sql`INSERT INTO character_ledger_events (character_id,event_type,origin,payload,created_by_user_id) VALUES (${stake.character_id}::uuid,'PROJECT_STAKE_LOST','PROJECT',${JSON.stringify({projectId:project.id,trait:stake.trait,dots:consumed})}::jsonb,${'SYSTEM'})`)
   }
   if(consumed===stake.dots)await tx.execute(sql`UPDATE project_stakes SET dots=0, released_at=now() WHERE id=${stake.id}::uuid`)
   else await tx.execute(sql`UPDATE project_stakes SET dots=dots-${consumed} WHERE id=${stake.id}::uuid`)
 }
 return {lostFromStake:spent,extraLossRequiresNarrator:remaining}
}
export async function getCampaignProjects(actorId:string,campaignId:string){
 requireUuid(campaignId,'Mesa inválida.')
 return db.transaction(async tx=>{
   const access=await campaignAccess(tx,actorId,campaignId)
   const result=await tx.execute<{id:string;name:string;status:ProjectStatus;projectDie:number|null;projectType:string}>(sql`SELECT p.id,p.name,p.description,p.goal_description AS "goalDescription",p.project_type AS "projectType",p.status,p.owner_character_id AS "ownerCharacterId",p.coterie_id AS "coterieId",p.created_by_user_id AS "createdBy",p.target_trait AS "targetTrait",p.target_current_dots AS "currentDots",p.target_final_dots AS "finalDots",p.scope,p.increment_unit AS "incrementUnit",p.increment_value AS "incrementValue",p.project_die AS "projectDie",p.launch_difficulty AS "launchDifficulty",p.launch_result AS "launchResult",p.launch_pool AS "launchPool",p.goal_roll_requested AS "goalRollRequested",p.revision,p.updated_at AS "updatedAt" FROM character_projects p WHERE p.campaign_id=${campaignId}::uuid AND (${access.is_master} OR p.created_by_user_id=${actorId} OR EXISTS (SELECT 1 FROM characters c WHERE c.id=p.owner_character_id AND c.user_id=${actorId}) OR EXISTS(SELECT 1 FROM coterie_members cm JOIN characters ch ON ch.id=cm.character_id WHERE cm.coterie_id=p.coterie_id AND ch.user_id=${actorId} AND cm.left_at IS NULL)) ORDER BY p.updated_at DESC`)
   const projects=[]
   for(const row of result.rows){
     const id=(row as {id:string}).id
     const participants=await tx.execute(sql`SELECT p.character_id AS "characterId",ch.name FROM project_participants p JOIN characters ch ON ch.id=p.character_id WHERE p.project_id=${id}::uuid`)
     const stakes=await tx.execute(sql`SELECT character_id AS "characterId",coterie_id AS "coterieId",trait,dots,released_at AS "releasedAt" FROM project_stakes WHERE project_id=${id}::uuid`)
     const events=await tx.execute(sql`SELECT type,previous_project_die AS "previousProjectDie",new_project_die AS "newProjectDie",description,created_at AS "createdAt" FROM project_events WHERE project_id=${id}::uuid ORDER BY created_at DESC LIMIT 50`)
     projects.push({...row,participants:participants.rows,stakes:stakes.rows,events:events.rows})
   }
   return {projects,canManage:access.is_master}
 })
}
export async function commandProject(actorId:string,campaignId:string,input:ProjectCommand,dice:DiceProvider=serverDiceProvider){
 if(!input||typeof input!=='object'||typeof input.action!=='string'||typeof input.idempotencyKey!=='string')throw new CharacterCommandError(400,'Comando inválido.')
 return runCampaignCommand(actorId,campaignId,input,async(tx,access)=>{
   if(input.action==='CREATE'){
     if(!['PERSONAL','COTERIE'].includes(input.ownerCharacterId?'PERSONAL':input.coterieId?'COTERIE':''))throw new CharacterCommandError(400,'Informe personagem ou Coterie.')
     if(input.ownerCharacterId&&input.coterieId)throw new CharacterCommandError(400,'Projeto não pode ter dois proprietários.')
     if(input.ownerCharacterId)await requireCharacterOfCampaign(tx,campaignId,input.ownerCharacterId,access.is_master?undefined:actorId)
     if(input.coterieId){
       requireUuid(input.coterieId,'Coterie inválida.')
       const r=await tx.execute<{id:string}>(sql`SELECT id FROM coteries WHERE id=${input.coterieId}::uuid AND campaign_id=${campaignId}::uuid`)
       if(!r.rows[0])throw new CharacterCommandError(404,'Coterie não encontrada.')
       if(!access.is_master){
         const m=await tx.execute<{id:string}>(sql`SELECT cm.id FROM coterie_members cm JOIN characters ch ON ch.id=cm.character_id WHERE cm.coterie_id=${input.coterieId}::uuid AND ch.user_id=${actorId} AND cm.left_at IS NULL`)
         if(!m.rows[0])throw new CharacterCommandError(403,'Não pertence a esta Coterie.')
       }
     }
     const kind=input.ownerCharacterId?'PERSONAL':'COTERIE'
     const p=await tx.execute<{id:string}>(sql`INSERT INTO character_projects (campaign_id,owner_character_id,coterie_id,name,description,goal_description,project_type,created_by_user_id) VALUES (${campaignId}::uuid,${input.ownerCharacterId??null}::uuid,${input.coterieId??null}::uuid,${requireText(input.name,'Nome',140)},${optionalText(input.description,'Descrição',2000)},${requireText(input.goalDescription,'Objetivo',1000)},${kind},${actorId}) RETURNING id`)
     if(input.ownerCharacterId)await tx.execute(sql`INSERT INTO project_participants (project_id,character_id) VALUES (${p.rows[0].id}::uuid,${input.ownerCharacterId}::uuid)`)
     await event(tx,p.rows[0].id,'CREATED',actorId,null,null,'Projeto criado.')
     return {ok:true,projectId:p.rows[0].id,status:'DRAFT'}
   }
   const project=await requireProject(tx,campaignId,input.projectId!)
   if(!(await participantAccess(tx,project,actorId,access)))throw new CharacterCommandError(403,'Sem permissão para consultar ou alterar este projeto.')
   expectRevision(project,input.expectedRevision)
   const reason=optionalText(input.reason,'Justificativa',1000)
   if(input.action==='UPDATE_DRAFT'){
     await assertOwner(tx,project,access,actorId)
     if(project.status!=='DRAFT')throw new CharacterCommandError(409,'Somente rascunhos podem ser editados.')
     await tx.execute(sql`UPDATE character_projects SET name=${requireText(input.name,'Nome',140)},description=${optionalText(input.description,'Descrição',2000)},goal_description=${requireText(input.goalDescription,'Objetivo',1000)} WHERE id=${project.id}::uuid`)
     await event(tx,project.id,'UPDATED',actorId,null,null,'Rascunho editado.')
   }else if(input.action==='SET_PARTICIPANTS'){
     await assertOwner(tx,project,access,actorId)
     if(project.status!=='DRAFT')throw new CharacterCommandError(409,'Defina os participantes enquanto o projeto é rascunho.')
     if(!Array.isArray(input.participantIds)||input.participantIds.length<1||input.participantIds.length>12||new Set(input.participantIds).size!==input.participantIds.length)throw new CharacterCommandError(400,'Lista de participantes inválida.')
     if(project.project_type==='PERSONAL'&&!input.participantIds.includes(project.owner_character_id!))throw new CharacterCommandError(422,'O proprietário do projeto pessoal precisa participar.')
     for(const id of input.participantIds){
       await requireCharacterOfCampaign(tx,campaignId,id)
       if(project.coterie_id){
         const membership=await tx.execute<{id:string}>(sql`SELECT id FROM coterie_members WHERE coterie_id=${project.coterie_id}::uuid AND character_id=${id}::uuid AND left_at IS NULL`)
         if(!membership.rows[0])throw new CharacterCommandError(422,'Um dos participantes não é membro ativo da Coterie.')
       }
     }
     await tx.execute(sql`DELETE FROM project_participants WHERE project_id=${project.id}::uuid`)
     for(const id of input.participantIds)await tx.execute(sql`INSERT INTO project_participants (project_id,character_id) VALUES (${project.id}::uuid,${id}::uuid)`)
     await event(tx,project.id,'UPDATED',actorId,null,null,'Participantes do projeto atualizados.',{participantCount:input.participantIds.length})
   }else if(input.action==='SUBMIT'){
     await assertOwner(tx,project,access,actorId)
     if(project.status!=='DRAFT')throw new CharacterCommandError(409,'O projeto não está em rascunho.')
     await tx.execute(sql`UPDATE character_projects SET status='AWAITING_APPROVAL' WHERE id=${project.id}::uuid`)
     await event(tx,project.id,'SUBMITTED',actorId,null,null,'Enviado para aprovação do Narrador.')
   }else if(input.action==='APPROVE'){
     requireMaster(access)
     if(project.status!=='AWAITING_APPROVAL'||project.approved_at)throw new CharacterCommandError(409,'Projeto não está aguardando aprovação.')
     const current=dots(input.currentDots,'Pontos atuais')
     const final=dots(input.finalDots,'Pontos desejados',1)
     const scope=projectScope(current,final)
     const target=requireText(input.targetTrait,'Característica',80)
     const unit=requireText(input.incrementUnit,'Unidade temporal',20)
     if(!['DAY','WEEK','MONTH','YEAR'].includes(unit))throw new CharacterCommandError(400,'Increment inválido.')
     const increment=dots(input.incrementValue,'Valor do Increment',1,120)
     const pool=dots(input.launchPool,'Pool de lançamento',1,50)
     await tx.execute(sql`UPDATE character_projects SET target_trait=${target},target_current_dots=${current},target_final_dots=${final},scope=${scope},increment_unit=${unit},increment_value=${increment},launch_pool=${pool},launch_difficulty=${scope+2},approved_at=now(),approved_by_user_id=${actorId} WHERE id=${project.id}::uuid`)
     await event(tx,project.id,'APPROVED',actorId,null,null,`Scope ${scope}, Increment ${increment} ${unit}, Launch Difficulty ${scope+2}.`)
   }else if(input.action==='LAUNCH'){
     requireMaster(access)
     if(project.status!=='AWAITING_APPROVAL'||!project.approved_at||!project.scope||!project.launch_pool||project.launch_result && ['WIN','CRITICAL'].includes((project.launch_result as {outcome?:string}).outcome??''))throw new CharacterCommandError(409,'Projeto precisa de aprovação e não pode repetir um lançamento bem-sucedido.')
     const rollingId=input.rollingCharacterId??project.owner_character_id
     if(!rollingId)throw new CharacterCommandError(400,'Escolha um personagem participante para lançar o projeto.')
     const listed=await tx.execute<{character_id:string}>(sql`SELECT character_id FROM project_participants WHERE project_id=${project.id}::uuid`)
     const participants=listed.rows.map(row=>row.character_id)
     if(!participants.length)throw new CharacterCommandError(422,'Defina participantes do projeto antes do Launch Roll.')
     if(!participants.includes(rollingId))throw new CharacterCommandError(403,'Personagem não participa do Project Launch.')
     const ch=await requireCharacterOfCampaign(tx,campaignId,rollingId)
     if(project.project_type==='COTERIE'){
       const m=await tx.execute<{id:string}>(sql`SELECT id FROM coterie_members WHERE coterie_id=${project.coterie_id}::uuid AND character_id=${rollingId}::uuid AND left_at IS NULL`)
       if(!m.rows[0])throw new CharacterCommandError(403,'Personagem não integra a Coterie.')
     }else if(project.owner_character_id!==rollingId)throw new CharacterCommandError(403,'Lançamento pessoal deve usar seu personagem.')
     const state=await tx.execute<{game_state:Record<string,unknown>;data:Record<string,unknown>}>(sql`SELECT game_state,data FROM characters WHERE id=${ch.id}::uuid FOR SHARE`)
     const hunger=Number(state.rows[0]?.game_state?.hunger??state.rows[0]?.data?.fome??0)
     if(!Number.isSafeInteger(hunger)||hunger<0||hunger>5)throw new CharacterCommandError(422,'Fome inválida na ficha selecionada.')
     if(launchDifficulty(project.scope,project.launch_failure_count)>50)throw new CharacterCommandError(422,'Dificuldade do Launch Roll ultrapassa o limite do motor.')
     const result=resolveProjectLaunch(dice,project.launch_pool,Math.min(hunger,project.launch_pool),project.scope,project.launch_failure_count)
     if(result.outcome==='WIN'||result.outcome==='CRITICAL'){
       if(result.outcome==='CRITICAL'){
         await tx.execute(sql`UPDATE character_projects SET status='ACTIVE',project_die=10,launch_difficulty=${result.launchDifficulty},launch_result=${JSON.stringify(result)}::jsonb,launched_at=now() WHERE id=${project.id}::uuid`)
         await event(tx,project.id,'LAUNCHED',actorId,null,10,reason||'Projeto lançado sem Stake: vitória crítica.',{...result,rollingCharacterId:rollingId})
       }else{
         await tx.execute(sql`UPDATE character_projects SET launch_difficulty=${result.launchDifficulty},launch_result=${JSON.stringify(result)}::jsonb WHERE id=${project.id}::uuid`)
         await event(tx,project.id,'LAUNCH_PENDING_STAKE',actorId,null,null,'Launch Roll bem-sucedido. Aguardando compromisso de Stake.',{...result,rollingCharacterId:rollingId})
       }
     }else{
       await tx.execute(sql`UPDATE character_projects SET launch_failure_count=launch_failure_count+1,launch_difficulty=${result.launchDifficulty+1},launch_result=${JSON.stringify(result)}::jsonb WHERE id=${project.id}::uuid`)
       await event(tx,project.id,'LAUNCH_FAILED',actorId,null,null,reason||'Launch Roll falhou; próxima tentativa aumenta a dificuldade.',result)
     }
     await changeRevision(tx,project.id)
     return {ok:true,projectId:project.id,launchResult:result,status:result.outcome==='CRITICAL'?'ACTIVE':'AWAITING_APPROVAL',revision:project.revision+1}
   }else if(input.action==='COMMIT_STAKE'){
     requireMaster(access)
     const launch=project.launch_result as {outcome?:string;stakeRequired?:number}|null
     if(project.status!=='AWAITING_APPROVAL'||launch?.outcome!=='WIN'||!Number.isSafeInteger(launch.stakeRequired))throw new CharacterCommandError(409,'Não há Launch Roll bem-sucedido aguardando Stake.')
     const people=await tx.execute<{character_id:string}>(sql`SELECT character_id FROM project_participants WHERE project_id=${project.id}::uuid`)
     const participantIds=people.rows.map(row=>row.character_id)
     if(!participantIds.length)throw new CharacterCommandError(422,'Defina os participantes antes de comprometer o Stake.')
     const stakes=input.stakes??[]
     for(const stake of stakes){
       if(stake.characterId&&!participantIds.includes(stake.characterId))throw new CharacterCommandError(403,'Stake associado a personagem que não participa do projeto.')
     }
     const allShared=stakes.length>0&&stakes.every(stake=>Boolean(stake.coterieId))
     const required=allShared?launch.stakeRequired!:Math.max(launch.stakeRequired!,participantIds.length)
     if(participantIds.length>1&&!allShared){
       const contributing=new Set(stakes.filter(stake=>stake.characterId&&stake.dots>=1).map(stake=>stake.characterId))
       if(!participantIds.every(id=>contributing.has(id)))throw new CharacterCommandError(422,'Cada participante cooperante deve comprometer pelo menos um dot ou utilizar apenas Stake compartilhado da Coterie.')
     }
     await commitStakes(tx,project,stakes,required)
     await tx.execute(sql`UPDATE character_projects SET status='ACTIVE',project_die=10,launched_at=now() WHERE id=${project.id}::uuid`)
     await event(tx,project.id,'LAUNCHED',actorId,null,10,reason||'Stake confirmado e projeto iniciado.',{requiredStake:launch.stakeRequired})
   }else if(input.action==='INCREMENT'){
     requireMaster(access)
     if(project.status!=='ACTIVE'||!project.project_die)throw new CharacterCommandError(409,'O projeto não está ativo.')
     const progress=advanceProjectDie(project.project_die)
     if(progress.completed){
       await finalize(tx,project.id,'SUCCESS')
       await tx.execute(sql`UPDATE character_projects SET project_die=NULL WHERE id=${project.id}::uuid`)
       await event(tx,project.id,'COMPLETED',actorId,progress.previous,null,reason||'Projeto concluído por passagem de Increment.')
     }else{
       await tx.execute(sql`UPDATE character_projects SET project_die=${progress.next} WHERE id=${project.id}::uuid`)
       await event(tx,project.id,'INCREMENT',actorId,progress.previous,progress.next,reason||'Increment ficcional registrado.')
     }
   }else if(input.action==='REQUEST_GOAL'){
     if(!(await participantAccess(tx,project,actorId,access)))throw new CharacterCommandError(403,'Sem permissão para solicitar Goal Roll.')
     if(project.status!=='ACTIVE'||project.goal_roll_requested)throw new CharacterCommandError(409,'Goal Roll indisponível ou já solicitado.')
     await tx.execute(sql`UPDATE character_projects SET goal_roll_requested=true WHERE id=${project.id}::uuid`)
     await event(tx,project.id,'GOAL_REQUESTED',actorId,project.project_die,project.project_die,'Solicitação de Goal Roll.')
   }else if(input.action==='RESOLVE_GOAL'){
     requireMaster(access)
     if(project.status!=='ACTIVE'||!project.goal_roll_requested||!project.project_die)throw new CharacterCommandError(409,'Goal Roll não foi solicitado ou o projeto está inativo.')
     const pool=dots(input.goalPool,'Pool de Goal Roll',1,50)
     const rollingId=input.rollingCharacterId??project.owner_character_id
     if(!rollingId)throw new CharacterCommandError(400,'Escolha personagem para a disputa.')
     const selected=await tx.execute<{character_id:string}>(sql`SELECT character_id FROM project_participants WHERE project_id=${project.id}::uuid`)
     if(!selected.rows.some(row=>row.character_id===rollingId))throw new CharacterCommandError(403,'Personagem não selecionado para este Goal Roll.')
     const ch=await requireCharacterOfCampaign(tx,campaignId,rollingId)
     if(project.coterie_id){
       const membership=await tx.execute<{id:string}>(sql`SELECT id FROM coterie_members WHERE coterie_id=${project.coterie_id}::uuid AND character_id=${rollingId}::uuid AND left_at IS NULL`)
       if(!membership.rows[0])throw new CharacterCommandError(403,'Este personagem não integra a Coterie.')
     }else if(rollingId!==project.owner_character_id)throw new CharacterCommandError(403,'Goal Roll pessoal pertence ao dono.')
     const state=await tx.execute<{game_state:Record<string,unknown>;data:Record<string,unknown>}>(sql`SELECT game_state,data FROM characters WHERE id=${ch.id}::uuid FOR SHARE`)
     const hunger=Number(state.rows[0]?.game_state?.hunger??state.rows[0]?.data?.fome??0)
     if(!Number.isSafeInteger(hunger)||hunger<0||hunger>5)throw new CharacterCommandError(422,'Fome inválida.')
     const result=resolveProjectGoal(dice,pool,project.project_die,Math.min(hunger,pool))
     if(result.won){
       const next=project.project_die-result.projectDieDamage
       if(next<1){await finalize(tx,project.id,'SUCCESS');await tx.execute(sql`UPDATE character_projects SET project_die=NULL WHERE id=${project.id}::uuid`)}
       else await tx.execute(sql`UPDATE character_projects SET project_die=${next},goal_roll_requested=false WHERE id=${project.id}::uuid`)
       await event(tx,project.id,next<1?'COMPLETED':'GOAL_ROLL',actorId,project.project_die,next<1?null:next,reason||'Goal Roll bem-sucedido.',result)
     }else{
       const loss=await applyStakeLoss(tx,project,result.stakeDamage)
       await tx.execute(sql`UPDATE character_projects SET goal_roll_requested=false WHERE id=${project.id}::uuid`)
       const available=await tx.execute<{remaining:number}>(sql`SELECT COALESCE(SUM(dots),0)::int AS remaining FROM project_stakes WHERE project_id=${project.id}::uuid AND released_at IS NULL`)
       const critical=Boolean((project.launch_result as {outcome?:string}|null)?.outcome==='CRITICAL')
       if(Number(available.rows[0]?.remaining??0)===0&&!critical){
         await finalize(tx,project.id,'FAILED')
         await event(tx,project.id,'FAILED',actorId,project.project_die,project.project_die,reason||'Projeto colapsou após perda de Stake.',{...result,...loss})
       }else await event(tx,project.id,'GOAL_ROLL',actorId,project.project_die,project.project_die,reason||'Goal Roll perdido.',{...result,...loss})
       // Perdas além do Stake exigem adjudicação do Narrador e não são debitadas automaticamente.
     }
     await changeRevision(tx,project.id)
     return {ok:true,projectId:project.id,goalResult:result,revision:project.revision+1}
   }else if(input.action==='ABANDON'){
     await assertOwner(tx,project,access,actorId)
     if(['SUCCESS','FAILED','ABANDONED'].includes(project.status))throw new CharacterCommandError(409,'Projeto já encerrado.')
     await finalize(tx,project.id,'ABANDONED')
     await event(tx,project.id,'ABANDONED',actorId,project.project_die,project.project_die,reason||'Projeto abandonado.')
   }else throw new CharacterCommandError(400,'Ação desconhecida.')
   await changeRevision(tx,project.id)
   return {ok:true,projectId:project.id,revision:project.revision+1}
 })
}
