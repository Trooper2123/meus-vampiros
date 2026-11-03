import { sql } from 'drizzle-orm'
import { db } from './db'
import { CharacterCommandError } from './character-commands'
import { campaignAccess, dots, optionalText, requireCharacterOfCampaign, requireText, requireUuid, runCampaignCommand, type CampaignAccess, type Session11Tx } from './session11-common'

const BACKGROUNDS = ['ADVERSARY','ALLY','CONTACTS','ENEMY','HAVEN','HERD','INFLUENCE','MASK','MAWLA','RESOURCES','RETAINERS','STATUS'] as const
const BOON_TYPES = ['BOON_OWED_TO_COTERIE','BOON_OWED_BY_COTERIE','DEBT'] as const
type Input = {
  action:'CREATE'|'UPDATE'|'ADD_MEMBER'|'REMOVE_MEMBER'|'ADD_BACKGROUND'|'ADD_ADVANTAGE'|'ADD_HAVEN'|'ADD_HAVEN_TRAIT'|'ADD_BOON'|'ADD_GOAL'|'GOAL_TO_PROJECT'
  idempotencyKey:string
  coterieId?:string; characterId?:string; memberId?:string; goalId?:string; havenId?:string
  name?:string; typeId?:string|null; city?:string; chronicle?:string; description?:string
  hasDomain?:boolean; domainDescription?:string; chasse?:number; lien?:number; portillon?:number
  domainResonance?:string; chronicleTenets?:string; expectedRevision?:number
  role?:string; backgroundCode?:string; dots?:number; source?:string; kind?:string; catalogItemId?:string; customName?:string
  location?:string; isPrimary?:boolean; counterparty?:string; level?:number; status?:string; title?:string
}
function requireMaster(access:CampaignAccess) { if(!access.is_master) throw new CharacterCommandError(403,'Somente o Narrador pode administrar a Coterie.') }
async function coterieInCampaign(tx:Session11Tx,campaignId:string,coterieId:string,lock=true) {
  requireUuid(coterieId,'Coterie inválida.')
  const rows=await tx.execute<{id:string;revision:number;campaign_id:string}>(sql`SELECT id,revision,campaign_id FROM coteries WHERE id=${coterieId}::uuid AND campaign_id=${campaignId}::uuid ${lock?sql`FOR UPDATE`:sql`FOR SHARE`}`)
  if(!rows.rows[0]) throw new CharacterCommandError(404,'Coterie não encontrada nesta mesa.')
  return rows.rows[0]
}
function checkRevision(value:unknown,revision:number) {
  if(!Number.isSafeInteger(value)||Number(value)!==revision)throw new CharacterCommandError(409,'Coterie alterada. Recarregue e tente novamente.')
}
async function validType(tx:Session11Tx,id:string|null|undefined) {
  if(!id) return null
  if(id.length>160)throw new CharacterCommandError(400,'Tipo inválido.')
  const types=await tx.execute<{id:string}>(sql`SELECT id FROM coterie_type_catalog WHERE id=${id} AND active=true`)
  if(!types.rows[0])throw new CharacterCommandError(422,'Tipo de Coterie não cadastrado ou inativo.')
  return id
}
async function activeMember(tx:Session11Tx,coterieId:string,characterId:string) {
  const rows=await tx.execute<{id:string}>(sql`SELECT id FROM coterie_members WHERE coterie_id=${coterieId}::uuid AND character_id=${characterId}::uuid AND left_at IS NULL`)
  return Boolean(rows.rows[0])
}
async function updateRevision(tx:Session11Tx,coterieId:string) {
  await tx.execute(sql`UPDATE coteries SET revision=revision+1,updated_at=now() WHERE id=${coterieId}::uuid`)
}
export async function getCampaignCoteries(actorId:string,campaignId:string){
  requireUuid(campaignId,'Mesa inválida.')
  return db.transaction(async tx=>{
    const access=await campaignAccess(tx,actorId,campaignId)
    const coteries=await tx.execute(sql`SELECT co.id,co.name,co.type_id AS "typeId",ct.name AS "typeName",co.chronicle,co.city,co.description,co.has_domain AS "hasDomain",co.domain_description AS "domainDescription",co.chasse,co.lien,co.portillon,co.domain_resonance AS "domainResonance",co.chronicle_tenets AS "chronicleTenets",co.revision
    FROM coteries co LEFT JOIN coterie_type_catalog ct ON ct.id=co.type_id WHERE co.campaign_id=${campaignId}::uuid ORDER BY co.created_at`)
    const ids=coteries.rows.map(x=>(x as {id:string}).id)
    const detail=[]
    for(const id of ids){
      const members=await tx.execute(sql`SELECT cm.id,cm.character_id AS "characterId", ch.name,cm.role,cm.joined_at AS "joinedAt" FROM coterie_members cm JOIN characters ch ON ch.id=cm.character_id WHERE cm.coterie_id=${id}::uuid AND cm.left_at IS NULL ORDER BY ch.name`)
      const backgrounds=await tx.execute(sql`SELECT id,background_code AS "code",dots,description,source FROM coterie_backgrounds WHERE coterie_id=${id}::uuid`)
      const advantages=await tx.execute(sql`SELECT id,catalog_item_id AS "catalogItemId",custom_name AS "customName",dots,kind,notes FROM coterie_advantages WHERE coterie_id=${id}::uuid`)
      const havens=await tx.execute(sql`SELECT id,name,description,location,is_primary AS "isPrimary" FROM coterie_havens WHERE coterie_id=${id}::uuid`)
      const boons=await tx.execute(sql`SELECT id,type,counterparty,level,description,status FROM coterie_boons_debts WHERE coterie_id=${id}::uuid`)
      const goals=await tx.execute(sql`SELECT id,title,description,status FROM coterie_goals WHERE coterie_id=${id}::uuid ORDER BY created_at DESC`)
      detail.push({...(coteries.rows.find(row=>(row as {id:string}).id===id) as object),members:members.rows,backgrounds:backgrounds.rows,advantages:advantages.rows,havens:havens.rows,boons:boons.rows,goals:goals.rows})
    }
    const catalog=await tx.execute(sql`SELECT id,code,name,source,description,suggested_mechanics AS "suggestedMechanics" FROM coterie_type_catalog WHERE active=true ORDER BY name`)
    return {canManage:access.is_master,coteries:detail,types:catalog.rows}
  })
}
export async function commandCoterie(actorId:string,campaignId:string,input:Input) {
  if(!input||typeof input!=='object'||!input.action||typeof input.idempotencyKey!=='string')throw new CharacterCommandError(400,'Comando inválido.')
  return runCampaignCommand(actorId,campaignId,input,async(tx,access)=>{
    if(input.action==='CREATE'){
      requireMaster(access)
      const name=requireText(input.name,'Nome',140)
      const typeId=await validType(tx,input.typeId)
      const result=await tx.execute<{id:string}>(sql`INSERT INTO coteries (campaign_id,name,type_id,chronicle,city,description)
        VALUES (${campaignId}::uuid,${name},${typeId},${optionalText(input.chronicle,'Crônica',140)},${optionalText(input.city,'Cidade',140)},${optionalText(input.description,'Descrição',2000)}) RETURNING id`)
      return {ok:true,coterieId:result.rows[0].id}
    }
    const coterieId=input.coterieId!
    const coterie=await coterieInCampaign(tx,campaignId,coterieId)
    if(input.action==='UPDATE') {
      requireMaster(access)
      checkRevision(input.expectedRevision,coterie.revision)
      const name=requireText(input.name,'Nome',140)
      const typeId=await validType(tx,input.typeId)
      if(typeof input.hasDomain!=='boolean')throw new CharacterCommandError(400,'Informe se a Coterie possui Domain.')
      const chasse=input.hasDomain?dots(input.chasse,'Chasse'):0
      const lien=input.hasDomain?dots(input.lien,'Lien'):0
      const portillon=input.hasDomain?dots(input.portillon,'Portillon'):0
      await tx.execute(sql`UPDATE coteries SET name=${name},type_id=${typeId},city=${optionalText(input.city,'Cidade',140)},chronicle=${optionalText(input.chronicle,'Crônica',140)},description=${optionalText(input.description,'Descrição',2000)},has_domain=${input.hasDomain},domain_description=${optionalText(input.domainDescription,'Domain',2000)},chasse=${chasse},lien=${lien},portillon=${portillon},domain_resonance=${optionalText(input.domainResonance,'Ressonância',200)},chronicle_tenets=${optionalText(input.chronicleTenets,'Princípios',2000)} WHERE id=${coterieId}::uuid`)
    } else if(input.action==='ADD_MEMBER'){
      requireMaster(access)
      const member=await requireCharacterOfCampaign(tx,campaignId,input.characterId!)
      if(await activeMember(tx,coterieId,member.id))throw new CharacterCommandError(409,'Este personagem já integra a Coterie.')
      await tx.execute(sql`INSERT INTO coterie_members (coterie_id,character_id,role) VALUES (${coterieId}::uuid,${member.id}::uuid,${optionalText(input.role,'Papel',80)||null})`)
    } else if(input.action==='REMOVE_MEMBER') {
      requireMaster(access)
      requireUuid(input.memberId,'Membro inválido.')
      const result=await tx.execute<{id:string}>(sql`UPDATE coterie_members SET left_at=now() WHERE id=${input.memberId}::uuid AND coterie_id=${coterieId}::uuid AND left_at IS NULL RETURNING id`)
      if(!result.rows[0])throw new CharacterCommandError(404,'Membro ativo não encontrado.')
    } else if(input.action==='ADD_BACKGROUND'){
      requireMaster(access)
      const code=requireText(input.backgroundCode,'Background',80).toUpperCase()
      if(!(BACKGROUNDS as readonly string[]).includes(code))throw new CharacterCommandError(422,'Background não reconhecido.')
      await tx.execute(sql`INSERT INTO coterie_backgrounds (coterie_id,background_code,dots,description,source) VALUES (${coterieId}::uuid,${code},${dots(input.dots,'Pontos',1)},${optionalText(input.description,'Descrição',1000)},${optionalText(input.source,'Fonte',160)||'CUSTOM'})`)
    } else if(input.action==='ADD_ADVANTAGE'){
      requireMaster(access)
      if(!['ADVANTAGE','FLAW'].includes(input.kind??''))throw new CharacterCommandError(400,'Tipo inválido.')
      const customName=optionalText(input.customName,'Nome personalizado',160)
      const catalogId=optionalText(input.catalogItemId,'Item do catálogo',160)
      if(!customName&&!catalogId)throw new CharacterCommandError(400,'Informe item de catálogo ou nome personalizado.')
      await tx.execute(sql`INSERT INTO coterie_advantages (coterie_id,catalog_item_id,custom_name,dots,kind,notes) VALUES (${coterieId}::uuid,${catalogId||null},${customName||null},${dots(input.dots,'Pontos',1)},${input.kind},${optionalText(input.description,'Observações',1000)})`)
    } else if(input.action==='ADD_HAVEN'){
      requireMaster(access)
      if(typeof input.isPrimary!=='boolean')throw new CharacterCommandError(400,'Informe se é o Haven principal.')
      if(input.isPrimary)await tx.execute(sql`UPDATE coterie_havens SET is_primary=false WHERE coterie_id=${coterieId}::uuid`)
      await tx.execute(sql`INSERT INTO coterie_havens (coterie_id,name,description,location,is_primary) VALUES (${coterieId}::uuid,${requireText(input.name,'Nome',140)},${optionalText(input.description,'Descrição',2000)},${optionalText(input.location,'Localização',250)},${input.isPrimary})`)
    } else if(input.action==='ADD_HAVEN_TRAIT'){
      requireMaster(access)
      requireUuid(input.havenId,'Haven inválido.')
      if(!['MERIT','FLAW'].includes(input.kind??''))throw new CharacterCommandError(400,'Tipo inválido.')
      const haven=await tx.execute<{id:string}>(sql`SELECT id FROM coterie_havens WHERE id=${input.havenId}::uuid AND coterie_id=${coterieId}::uuid`)
      if(!haven.rows[0])throw new CharacterCommandError(404,'Haven não encontrado.')
      const catalog=optionalText(input.catalogItemId,'Catálogo',160),custom=optionalText(input.customName,'Nome',160)
      if(!catalog&&!custom)throw new CharacterCommandError(400,'Defina o mérito ou defeito.')
      await tx.execute(sql`INSERT INTO coterie_haven_traits (haven_id,catalog_item_id,custom_name,kind,dots) VALUES (${input.havenId}::uuid,${catalog||null},${custom||null},${input.kind},${dots(input.dots,'Pontos',1)})`)
    } else if(input.action==='ADD_BOON') {
      requireMaster(access)
      if(!(BOON_TYPES as readonly string[]).includes(input.kind??''))throw new CharacterCommandError(400,'Tipo de favor inválido.')
      await tx.execute(sql`INSERT INTO coterie_boons_debts (coterie_id,type,counterparty,level,description) VALUES (${coterieId}::uuid,${input.kind},${requireText(input.counterparty,'Contraparte',160)},${dots(input.level,'Nível',1)},${optionalText(input.description,'Descrição',1000)})`)
    } else if(input.action==='ADD_GOAL'){
      const title=requireText(input.title,'Objetivo',180)
      // Integrantes podem propor objetivos. O Narrador controla atributos mecânicos.
      if(!access.is_master){
        const membership=await tx.execute<{id:string}>(sql`SELECT cm.id FROM coterie_members cm JOIN characters ch ON ch.id=cm.character_id WHERE cm.coterie_id=${coterieId}::uuid AND ch.user_id=${actorId} AND cm.left_at IS NULL LIMIT 1`)
        if(!membership.rows[0])throw new CharacterCommandError(403,'Somente membros da Coterie podem propor objetivos.')
      }
      await tx.execute(sql`INSERT INTO coterie_goals (coterie_id,title,description) VALUES (${coterieId}::uuid,${title},${optionalText(input.description,'Descrição',2000)})`)
    } else if(input.action==='GOAL_TO_PROJECT'){
      requireUuid(input.goalId,'Objetivo inválido.')
      const goal=await tx.execute<{id:string;title:string;description:string}>(sql`SELECT id,title,description FROM coterie_goals WHERE id=${input.goalId}::uuid AND coterie_id=${coterieId}::uuid AND status='OPEN' FOR SHARE`)
      if(!goal.rows[0])throw new CharacterCommandError(404,'Objetivo aberto não encontrado.')
      if(!access.is_master){
        const member=await tx.execute<{id:string}>(sql`SELECT cm.id FROM coterie_members cm JOIN characters ch ON ch.id=cm.character_id WHERE cm.coterie_id=${coterieId}::uuid AND ch.user_id=${actorId} AND cm.left_at IS NULL LIMIT 1`)
        if(!member.rows[0])throw new CharacterCommandError(403,'Somente membro pode propor este projeto.')
      }
      const prior=await tx.execute<{id:string}>(sql`SELECT id FROM character_projects WHERE origin_goal_id=${goal.rows[0].id}::uuid`)
      if(prior.rows[0])throw new CharacterCommandError(409,'Este objetivo já originou um projeto.')
      const project=await tx.execute<{id:string}>(sql`INSERT INTO character_projects (campaign_id,coterie_id,origin_goal_id,name,description,goal_description,project_type,created_by_user_id) VALUES (${campaignId}::uuid,${coterieId}::uuid,${goal.rows[0].id}::uuid,${goal.rows[0].title},${goal.rows[0].description},${goal.rows[0].title},'COTERIE',${actorId}) RETURNING id`)
      await tx.execute(sql`INSERT INTO project_events (project_id,type,description,actor_id) VALUES (${project.rows[0].id}::uuid,'CREATED','Projeto proposto a partir de objetivo da Coterie',${actorId})`)
      await updateRevision(tx,coterieId)
      return {ok:true,coterieId,projectId:project.rows[0].id}
    } else throw new CharacterCommandError(400,'Ação não reconhecida.')
    await updateRevision(tx,coterieId)
    return {ok:true,coterieId}
  })
}
