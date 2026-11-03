import {randomUUID} from 'node:crypto'
import {beforeEach,describe,expect,it} from 'vitest'
import {sql} from 'drizzle-orm'
import {db,ensureAllTables} from '@/lib/db'
import {createTestCampaign,createTestCharacter,preparePostgresTest} from './postgres-test-helpers'
import {commandCoterie,getCampaignCoteries} from '@/lib/coterie-service'
import {commandProject,getCampaignProjects} from '@/lib/projects-service'

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
   expect((projects[0] as {status:string}).status).toBe('SUCCESS')
 })
 it('Objetivo coletivo vira Project apenas por comando explícito',async()=>{
   const campaign=await createTestCampaign('narrator-011')
   const c=await commandCoterie('narrator-011',campaign.id,command('CREATE',{name:'Guardas do porto'}) as any)
   await commandCoterie('narrator-011',campaign.id,command('ADD_GOAL',{coterieId:c.coterieId,title:'Expandir domínio'}) as any)
   const goal=(await getCampaignCoteries('narrator-011',campaign.id)).coteries[0].goals[0] as {id:string}
   const project=await commandCoterie('narrator-011',campaign.id,command('GOAL_TO_PROJECT',{coterieId:c.coterieId,goalId:goal.id}) as any)
   expect(project.projectId).toBeTruthy()
   const projects=await getCampaignProjects('narrator-011',campaign.id)
   expect((projects.projects[0] as {projectType:string}).projectType).toBe('COTERIE')
 })
})
