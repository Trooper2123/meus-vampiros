import {randomUUID} from 'node:crypto'
import {beforeEach,describe,expect,it} from 'vitest'
import {sql} from 'drizzle-orm'
import {db,ensureAllTables} from '@/lib/db'
import {createTestCampaign,createTestCharacter,preparePostgresTest} from './postgres-test-helpers'
import {commandCoterie,getCampaignCoteries} from '@/lib/coterie-service'
import {commandProject,getCampaignProjects} from '@/lib/projects-service'
import {getProjectStakeOptions,backgroundDots} from '@/lib/project-stake-options'

const command=(action:string,extra:Record<string,unknown>={})=>({action,idempotencyKey:randomUUID(),...extra})
describe('SPEC-SESSION-011: domínio persistente em PostgreSQL isolado',()=>{
 beforeEach(async()=>{preparePostgresTest();await ensureAllTables()})
 it('Coterie: Narrador administra, jogador da mesa consulta, intruso bloqueado, retry não duplica',async()=>{
   const campaign=await createTestCampaign('narrator-011')
   const char=await createTestCharacter('player-011',campaign.id,'Membro V5')
   await db.execute(sql`UPDATE characters SET status='APPROVED',character_type='PLAYER_VAMPIRE' WHERE id=${char.id}::uuid`)
   const input=command('CREATE',{name:'Os Corvos',description:'Coterie itinerante'})
   await expect(commandCoterie('player-011',campaign.id,input as any)).rejects.toMatchObject({status:403})
   const created=await commandCoterie('narrator-011',campaign.id,input as any)
   expect(await commandCoterie('narrator-011',campaign.id,input as any)).toEqual(created)
   expect((await getCampaignCoteries('player-011',campaign.id)).coteries).toHaveLength(1)
   await expect(getCampaignCoteries('intruso',campaign.id)).rejects.toMatchObject({status:403})
   await commandCoterie('narrator-011',campaign.id,command('ADD_MEMBER',{coterieId:created.coterieId,characterId:char.id}) as any)
   const members=(await getCampaignCoteries('player-011',campaign.id)).coteries[0].members
   expect(members).toHaveLength(1)
 })
 it('Projects: jogador cria e envia, Narrador aprova, crítico inicia sem Stake, Increment termina',async()=>{
   const campaign=await createTestCampaign('narrator-011')
   const char=await createTestCharacter('player-011',campaign.id,'Vampira V5',{fome:0})
   await db.execute(sql`UPDATE characters SET status='APPROVED',character_type='PLAYER_VAMPIRE',game_state='{"hunger":0,"condition":"ACTIVE"}'::jsonb WHERE id=${char.id}::uuid`)
   const p=await commandProject('player-011',campaign.id,command('CREATE',{name:'Construir influência',goalDescription:'Influence 1→3',ownerCharacterId:char.id}) as any)
   await expect(commandProject('outro',campaign.id,command('SUBMIT',{projectId:p.projectId,expectedRevision:0}) as any)).rejects.toMatchObject({status:403})
   await commandProject('player-011',campaign.id,command('SUBMIT',{projectId:p.projectId,expectedRevision:0}) as any)
   await commandProject('narrator-011',campaign.id,command('APPROVE',{projectId:p.projectId,expectedRevision:1,targetTrait:'Influence',currentDots:1,finalDots:3,incrementUnit:'MONTH',incrementValue:1,launchPool:6}) as any)
   const launched=await commandProject('narrator-011',campaign.id,command('LAUNCH',{projectId:p.projectId,expectedRevision:2,rollingCharacterId:char.id}) as any,{rollD10:()=>[10,10,6,6,6,6]})
   expect(launched).toMatchObject({status:'ACTIVE',launchResult:{outcome:'CRITICAL',stakeRequired:0}})
   let revision=3
   for(let i=0;i<10;i++){await commandProject('narrator-011',campaign.id,command('INCREMENT',{projectId:p.projectId,expectedRevision:revision++,reason:'Avanço narrativo'}) as any)}
   const projects=(await getCampaignProjects('player-011',campaign.id)).projects
   expect(projects).toHaveLength(1)
   expect(projects[0].status).toBe('SUCCESS')
 })
 it('Launch comum registra Stake depois do dado e reserva Background coletivo',async()=>{
   const camp=await createTestCampaign('narrator-011')
   const ch=await createTestCharacter('player-011',camp.id,'Participante',{fome:0})
   await db.execute(sql`UPDATE characters SET status='APPROVED',character_type='PLAYER_VAMPIRE',game_state='{"hunger":0,"condition":"ACTIVE"}'::jsonb WHERE id=${ch.id}::uuid`)
   const co=await commandCoterie('narrator-011',camp.id,command('CREATE',{name:'Coterie de teste'}) as any)
   await commandCoterie('narrator-011',camp.id,command('ADD_MEMBER',{coterieId:co.coterieId,characterId:ch.id}) as any)
   await commandCoterie('narrator-011',camp.id,command('ADD_BACKGROUND',{coterieId:co.coterieId,backgroundCode:'RESOURCES',dots:2}) as any)
   const p=await commandProject('player-011',camp.id,command('CREATE',{coterieId:co.coterieId,name:'Conseguir influência',goalDescription:'Influence 1 para 2'}) as any)
   await commandProject('player-011',camp.id,command('SET_PARTICIPANTS',{projectId:p.projectId,expectedRevision:0,participantIds:[ch.id]}) as any)
   await commandProject('player-011',camp.id,command('SUBMIT',{projectId:p.projectId,expectedRevision:1}) as any)
   await commandProject('narrator-011',camp.id,command('APPROVE',{projectId:p.projectId,expectedRevision:2,targetTrait:'INFLUENCE',currentDots:1,finalDots:2,incrementUnit:'MONTH',incrementValue:1,launchPool:4}) as any)
   const rolled=await commandProject('narrator-011',camp.id,command('LAUNCH',{projectId:p.projectId,expectedRevision:3,rollingCharacterId:ch.id}) as any,{rollD10:()=>[6,6,6,6]})
   expect(rolled).toMatchObject({status:'AWAITING_APPROVAL',launchResult:{outcome:'WIN',stakeRequired:1}})
   const committed=await commandProject('narrator-011',camp.id,command('COMMIT_STAKE',{projectId:p.projectId,expectedRevision:4,stakes:[{coterieId:co.coterieId,trait:'RESOURCES',dots:1}]}) as any)
   expect(committed).toMatchObject({ok:true,revision:5})
   const view=await getCampaignProjects('player-011',camp.id)
   expect(view.projects[0].status).toBe('ACTIVE')
   expect(view.projects[0].projectDie).toBe(10)
 })
 it('não expõe projeto coletivo ao ex-integrante da Coterie',async()=>{
   const camp=await createTestCampaign('narrator-011')
   const ch=await createTestCharacter('player-011',camp.id,'Vampiro convidado')
   await db.execute(sql`UPDATE characters SET status='APPROVED',character_type='PLAYER_VAMPIRE' WHERE id=${ch.id}::uuid`)
   const co=await commandCoterie('narrator-011',camp.id,command('CREATE',{name:'Coterie privada'}) as any)
   await commandCoterie('narrator-011',camp.id,command('ADD_MEMBER',{coterieId:co.coterieId,characterId:ch.id}) as any)
   const project=await commandProject('player-011',camp.id,command('CREATE',{coterieId:co.coterieId,name:'Influência sigilosa',goalDescription:'Ganhar Influence'}) as any)
   expect((await getCampaignProjects('player-011',camp.id)).projects).toHaveLength(1)
   const member=(await getCampaignCoteries('narrator-011',camp.id)).coteries[0].members[0] as {id:string}
   await commandCoterie('narrator-011',camp.id,command('REMOVE_MEMBER',{coterieId:co.coterieId,memberId:member.id}) as any)
   expect((await getCampaignProjects('player-011',camp.id)).projects).toHaveLength(0)
   await expect(commandProject('player-011',camp.id,command('SUBMIT',{projectId:project.projectId,expectedRevision:0}) as any)).rejects.toMatchObject({status:403})
 })
 it('Narrador vê todos os Projects; jogador vê os próprios e os que participa com jogador/NPC',async()=>{
   const camp=await createTestCampaign('narrator-011')
   const owner=await createTestCharacter('owner-011',camp.id,'Dono da ficha')
   const partner=await createTestCharacter('partner-011',camp.id,'Aliado jogador')
   const outsider=await createTestCharacter('outsider-011',camp.id,'Fora do projeto')
   const npcId=randomUUID(),campaignNpcId=randomUUID()
   await db.execute(sql`UPDATE characters SET status='APPROVED',character_type='PLAYER_VAMPIRE' WHERE id IN (${owner.id}::uuid,${partner.id}::uuid,${outsider.id}::uuid)`)
   await db.execute(sql`INSERT INTO npc_definitions (id,owner_id,name,sheet_type,creature_type,role,threat_level,payload)
      VALUES (${npcId}::uuid,'narrator-011','Contato informante','SIMPLE','HUMAN','INFORMANT',2,'{}'::jsonb)`)
   await db.execute(sql`INSERT INTO campaign_npcs (id,campaign_id,npc_id) VALUES (${campaignNpcId}::uuid,${camp.id}::uuid,${npcId}::uuid)`)
   const input=command('CREATE',{ownerCharacterId:owner.id,name:'Conquistar território',goalDescription:'Ampliar acesso a Influence'})
   const project=await commandProject('narrator-011',camp.id,input as any)
   await commandProject('narrator-011',camp.id,command('SET_PARTICIPANTS',{projectId:project.projectId,expectedRevision:0,participantIds:[owner.id,partner.id],npcParticipantIds:[campaignNpcId]}) as any)
   const masterView=await getCampaignProjects('narrator-011',camp.id)
   const ownerView=await getCampaignProjects('owner-011',camp.id)
   const partnerView=await getCampaignProjects('partner-011',camp.id)
   const outsiderView=await getCampaignProjects('outsider-011',camp.id)
   expect(masterView.projects).toHaveLength(1)
   expect(ownerView.projects).toHaveLength(1)
   expect(partnerView.projects).toHaveLength(1)
   expect(outsiderView.projects).toHaveLength(0)
   expect(ownerView.projects[0].npcParticipants).toMatchObject([{name:'Contato informante',campaignNpcId}])
   await expect(commandProject('partner-011',camp.id,command('UPDATE_DRAFT',{projectId:project.projectId,expectedRevision:1,name:'Tentar alterar',goalDescription:'Alteração indevida'}) as any)).rejects.toMatchObject({status:403})
   await commandProject('owner-011',camp.id,command('UPDATE_DRAFT',{projectId:project.projectId,expectedRevision:1,name:'Conquistar acesso',goalDescription:'Expandir contatos'}) as any)
   await expect(commandProject('narrator-011',camp.id,command('SET_PARTICIPANTS',{projectId:project.projectId,expectedRevision:2,participantIds:[owner.id],npcParticipantIds:[randomUUID()]}) as any)).rejects.toMatchObject({status:422})
   expect((await getCampaignProjects('partner-011',camp.id)).projects).toHaveLength(1)
 })
 it('Stake utiliza Background do jogador e desconta reservas de outros projetos',async()=>{
  const camp=await createTestCampaign('narrator-011')
  const ch=await createTestCharacter('player-011',camp.id,'Investidora',{fome:0,vantagens:[{name:'Resources',level:2}]})
  await db.execute(sql`UPDATE characters SET status='APPROVED',character_type='PLAYER_VAMPIRE',game_state='{"hunger":0,"condition":"ACTIVE"}'::jsonb WHERE id=${ch.id}::uuid`)
  const launch=async(name:string)=>{
   const p=await commandProject('player-011',camp.id,command('CREATE',{ownerCharacterId:ch.id,name,goalDescription:'Aumentar contatos'}) as any)
   await commandProject('player-011',camp.id,command('SUBMIT',{projectId:p.projectId,expectedRevision:0}) as any)
   await commandProject('narrator-011',camp.id,command('APPROVE',{projectId:p.projectId,expectedRevision:1,targetTrait:'Contacts',currentDots:0,finalDots:1,incrementUnit:'MONTH',incrementValue:1,launchPool:4}) as any)
   const roll=await commandProject('narrator-011',camp.id,command('LAUNCH',{projectId:p.projectId,expectedRevision:2,rollingCharacterId:ch.id}) as any,{rollD10:()=>[6,6,6,6]})
   expect(roll.launchResult).toMatchObject({outcome:'WIN',stakeRequired:1})
   return p.projectId
  }
  const first=await launch('Infiltrar o mercado')
  const initial=await getProjectStakeOptions('narrator-011',camp.id,first)
  expect(initial.options).toEqual(expect.arrayContaining([expect.objectContaining({ownerType:'CHARACTER',trait:'RESOURCES',dots:2,reserved:0,available:2})]))
  await commandProject('narrator-011',camp.id,command('COMMIT_STAKE',{projectId:first,expectedRevision:3,stakes:[{characterId:ch.id,trait:'Resources',dots:1}]}) as any)
  const second=await launch('Expandir rede de favores')
  const next=await getProjectStakeOptions('narrator-011',camp.id,second)
  expect(next.options).toEqual(expect.arrayContaining([expect.objectContaining({trait:'RESOURCES',dots:2,reserved:1,available:1})]))
  await expect(commandProject('narrator-011',camp.id,command('COMMIT_STAKE',{projectId:second,expectedRevision:3,stakes:[{characterId:ch.id,trait:'Resources',dots:2}]}) as any)).rejects.toMatchObject({status:422})
  await commandProject('narrator-011',camp.id,command('COMMIT_STAKE',{projectId:second,expectedRevision:3,stakes:[{characterId:ch.id,trait:'Resources',dots:1}]}) as any)
  expect((await getProjectStakeOptions('narrator-011',camp.id,second)).options).toEqual(expect.arrayContaining([expect.objectContaining({trait:'RESOURCES',available:0,reserved:2})]))
  await expect(getProjectStakeOptions('player-011',camp.id,second)).rejects.toMatchObject({status:403})
 })
 it('normaliza nomes e pontos de Background sem duplicar fontes',()=>{
  expect(backgroundDots({vantagens:[{name:'Resources',level:2},{name:'Resources',level:3}],backgrounds:[{name:'Resources',dots:5}]})).toEqual([{trait:'RESOURCES',dots:3}])
 })
 it('Objetivo coletivo vira Project apenas por comando explícito',async()=>{
   const campaign=await createTestCampaign('narrator-011')
   const c=await commandCoterie('narrator-011',campaign.id,command('CREATE',{name:'Guardas do porto'}) as any)
   await commandCoterie('narrator-011',campaign.id,command('ADD_GOAL',{coterieId:c.coterieId,title:'Expandir domínio'}) as any)
   const goal=(await getCampaignCoteries('narrator-011',campaign.id)).coteries[0].goals[0] as {id:string}
   const project=await commandCoterie('narrator-011',campaign.id,command('GOAL_TO_PROJECT',{coterieId:c.coterieId,goalId:goal.id}) as any)
   expect(project.projectId).toBeTruthy()
   const projects=await getCampaignProjects('narrator-011',campaign.id)
   expect(projects.projects[0].projectType).toBe('COTERIE')
 })
})
