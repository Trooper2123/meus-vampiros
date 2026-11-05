import { beforeEach,describe,expect,it,vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { put } from '@vercel/blob'
import { db } from '@/lib/db'
import { closeGameSession,startGameSession } from '@/lib/game-sessions'
import { confirmCampaignHandout,deleteCampaignHandout,listCampaignHandouts,prepareCampaignHandout,readCampaignHandout,shareCampaignHandout } from '@/lib/session-handouts'
import { getSessionVisual,selectSessionVisual } from '@/lib/session-visual'
import { createTestCampaign,createTestCharacter,preparePostgresTest } from './postgres-test-helpers'

const actor=vi.hoisted(()=>({id:'hub-master'}))
vi.mock('@/lib/auth0',()=>({getSessionOrDev:()=>actor.id?{user:{sub:actor.id}}:null}))
import { GET as getChat,POST as postChat } from '@/app/api/sessions/[id]/chat/route'

const context=(id:string)=>({params:Promise.resolve({id})})
const request=(method:string,body?:unknown)=>new Request('http://localhost/api/sessions/chat',{method,headers:body===undefined?undefined:{'content-type':'application/json',origin:'http://localhost'},body:body===undefined?undefined:JSON.stringify(body)})

async function fixture(){
  preparePostgresTest()
  const campaign=await createTestCampaign('hub-master')
  const first=await createTestCharacter('hub-player-a',campaign.id,'Jogadora A')
  const second=await createTestCharacter('hub-player-b',campaign.id,'Jogadora B')
  const pending=await createTestCharacter('hub-pending',campaign.id,'Pendente')
  await db.execute(sql`UPDATE characters SET status='APPROVED',character_type='PLAYER_VAMPIRE' WHERE id IN (${first.id}::uuid,${second.id}::uuid)`)
  const session=await startGameSession('hub-master',campaign.id,{idempotencyKey:randomUUID()})
  return {campaign,first,second,pending,session}
}

async function handout(campaignId:string,mode:'PRIVATE'|'ALL'|'SELECTED',key:string){
  const id=randomUUID()
  await db.execute(sql`INSERT INTO campaign_handouts(id,campaign_id,title,file_name,blob_url,blob_pathname,content_type,size_bytes,uploaded_by_actor_id,share_mode,idempotency_key,upload_completed_at) VALUES(${id}::uuid,${campaignId}::uuid,${key},${key+'.pdf'},'private-url',${'test/'+id},'application/pdf',10,'hub-master',${mode},${randomUUID()}::uuid,now())`)
  return id
}

describe('hub de sessão: chat, handouts e mesa visual',()=>{
  beforeEach(()=>{vi.stubEnv('NODE_ENV','test');actor.id='hub-master'})

  it('protege chat, define o autor no servidor e apaga mensagens ao encerrar',async()=>{
    const {campaign,first,pending,session}=await fixture()
    actor.id=''
    expect((await getChat(request('GET'),context(session.id))).status).toBe(401)
    actor.id='hub-pending'
    expect((await getChat(request('GET'),context(session.id))).status).toBe(403)
    expect((await postChat(request('POST',{message:'teste',idempotencyKey:randomUUID(),actor_id:'hub-master'}),context(session.id))).status).toBe(400)
    actor.id='hub-player-a'
    const key=randomUUID()
    const firstPost=await postChat(request('POST',{message:'  Vou investigar.  ',idempotencyKey:key}),context(session.id))
    expect(firstPost.status).toBe(201)
    expect(await firstPost.json()).toMatchObject({message:{authorName:'Jogadora A',message:'Vou investigar.'}})
    expect((await postChat(request('POST',{message:'x'.repeat(2001),idempotencyKey:randomUUID()}),context(session.id))).status).toBe(422)
    actor.id='hub-master'
    await closeGameSession(actor.id,session.id,{idempotencyKey:randomUUID(),expectedRevision:1})
    expect((await db.execute<{count:string}>(sql`SELECT count(*) AS count FROM session_chat_messages WHERE session_id=${session.id}::uuid`)).rows[0].count).toBe('0')
    expect((await getChat(request('GET'),context(session.id))).status).toBe(409)
    expect(first.id).toBeTruthy();expect(pending.id).toBeTruthy();expect(campaign.id).toBeTruthy()
  })

  it('isola handouts por destinatário e limita a Mesa Visual a arquivos compartilhados com todos',async()=>{
    const {campaign,session}=await fixture()
    const privateId=await handout(campaign.id,'PRIVATE','privado')
    const allId=await handout(campaign.id,'ALL','mesa')
    const selectedId=await handout(campaign.id,'SELECTED','individual')
    await db.execute(sql`INSERT INTO campaign_handout_recipients(handout_id,actor_id) VALUES(${selectedId}::uuid,'hub-player-a')`)
    actor.id='hub-master'
    expect((await listCampaignHandouts(actor.id,campaign.id)).handouts).toHaveLength(3)
    actor.id='hub-player-a'
    expect((await listCampaignHandouts(actor.id,campaign.id)).handouts.map(item=>item.id).sort()).toEqual([allId,selectedId].sort())
    actor.id='hub-player-b'
    expect((await listCampaignHandouts(actor.id,campaign.id)).handouts.map(item=>item.id)).toEqual([allId])
    await expect(readCampaignHandout(actor.id,selectedId)).rejects.toThrow('Handout não encontrado.')
    actor.id='hub-master'
    await expect(selectSessionVisual(actor.id,session.id,{handoutId:privateId,expectedRevision:0})).rejects.toThrow('compartilhado com toda a mesa')
    await selectSessionVisual(actor.id,session.id,{handoutId:allId,expectedRevision:0})
    expect((await getSessionVisual('hub-player-a',session.id)).handout?.id).toBe(allId)
    expect((await getSessionVisual('hub-player-b',session.id)).handout?.id).toBe(allId)
  })

  it.skipIf(!process.env.BLOB_READ_WRITE_TOKEN)('executa upload, compartilhamento, download autorizado e exclusão no Blob privado',async()=>{
    const {campaign}=await fixture(),key=randomUUID()
    const prepared=await prepareCampaignHandout('hub-master',campaign.id,{fileName:'pista.txt',idempotencyKey:key})
    let confirmed=false
    try{
      await put(prepared.pathname,Buffer.from('pista de teste privada'),{access:'private',addRandomSuffix:false,contentType:'text/plain'})
      await confirmCampaignHandout('hub-master',campaign.id,prepared.uploadId);confirmed=true
      await shareCampaignHandout('hub-master',prepared.uploadId,{shareMode:'ALL',recipientActorIds:[],expectedRevision:1})
      const download=await readCampaignHandout('hub-player-a',prepared.uploadId)
      expect(await download.text()).toBe('pista de teste privada')
      await deleteCampaignHandout('hub-master',prepared.uploadId);confirmed=false
      expect((await listCampaignHandouts('hub-master',campaign.id)).handouts.some(item=>item.id===prepared.uploadId)).toBe(false)
    }finally{if(confirmed)await deleteCampaignHandout('hub-master',prepared.uploadId).catch(()=>{})}
  })
})
