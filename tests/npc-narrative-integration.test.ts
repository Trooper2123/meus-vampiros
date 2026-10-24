import { beforeEach,expect,it,vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
const auth=vi.hoisted(()=>vi.fn())
vi.mock('@/lib/auth0',()=>({getSessionOrDev:auth}))
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { preparePostgresTest,createTestCampaign,createTestCharacter } from './postgres-test-helpers'
import { createNpc,getNpc,changeNpc,listNpcs } from '@/lib/npc-store'
import { NPC_TEMPLATES } from '@/lib/npc-domain'
import { getSessionNpcs,sessionNpcCommand } from '@/lib/npc-sessions'
import { startGameSession } from '@/lib/game-sessions'
import { getSheetData,sheetRecordCommand,revealSheetItem,listSheetReveals } from '@/lib/sheet-records'
import { prepareSheetUpload,confirmSheetUpload,readSheetMedia,editSheetMedia,sanitizeSheetImage,type MediaStore } from '@/lib/sheet-media'
import { POST as createNpcRoute } from '@/app/api/npcs/route'
import { GET as readNpcRoute } from '@/app/api/npcs/[id]/route'

let master:string,player:string,outsider:string,campaignId:string,characterId:string,sessionId:string
const key=()=>randomUUID()
const request=(body:unknown,origin='http://localhost')=>new Request('http://localhost/api/npcs',{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify(body)})
beforeEach(async()=>{
  preparePostgresTest();master='gm-'+key();player='player-'+key();outsider='other-'+key()
  campaignId=(await createTestCampaign(master)).id
  characterId=(await createTestCharacter(player,campaignId,'Personagem')).id
  sessionId=(await startGameSession(master,campaignId,{idempotencyKey:key()})).id
  auth.mockResolvedValue({user:{sub:master}})
})
async function npc(){const result=await createNpc(master,{data:structuredClone(NPC_TEMPLATES[0].data),campaignId,idempotencyKey:key()});return getNpc(master,String(result.id))}
async function addInstance(npcId:string,label:string){const row=await getNpc(master,npcId);const linked=row.campaigns.find(c=>c.campaign_id===campaignId)!;return sessionNpcCommand(master,sessionId,{action:'ADD',campaignNpcId:linked.id,instanceKey:label,idempotencyKey:key()})}
const record=(visibility='OWNER_ONLY',title='Nota')=>({section:'PROFILE',title,body:'Texto reservado',fields:{},visibility})
function command(actor:string,body:unknown){return sheetRecordCommand(actor,campaignId,'CHARACTER',characterId,body)}

it('APIs exigem 401, 403, origem válida e não retornam NPC alheio',async()=>{
  auth.mockResolvedValue(null);expect((await createNpcRoute(request({}))).status).toBe(401)
  auth.mockResolvedValue({user:{sub:player}});expect((await createNpcRoute(request({}))).status).toBe(403)
  auth.mockResolvedValue({user:{sub:master}});expect((await createNpcRoute(request({},'https://evil.invalid'))).status).toBe(403)
  const own=await npc();auth.mockResolvedValue({user:{sub:outsider,'https://meus-vampiros.app/roles':['mestre']}})
  expect((await readNpcRoute(new Request('http://localhost'),{params:Promise.resolve({id:own.id})})).status).toBe(403)
})
it('CRUD é idempotente, revisionado e não permite vínculo em outra mesa',async()=>{
  const body={data:NPC_TEMPLATES[0].data,campaignId,idempotencyKey:key()}
  expect(await createNpc(master,body)).toEqual(await createNpc(master,body))
  const own=await getNpc(master,String((await createNpc(master,body)).id))
  const other=(await createTestCampaign(outsider)).id
  await expect(changeNpc(master,own.id,{action:'LINK',campaignId:other,expectedRevision:0,idempotencyKey:key()})).rejects.toMatchObject({status:403})
  await changeNpc(master,own.id,{action:'EDIT',data:{...own.data,name:'Revisado'},expectedRevision:0,idempotencyKey:key()})
  await expect(changeNpc(master,own.id,{action:'EDIT',data:own.data,expectedRevision:0,idempotencyKey:key()})).rejects.toMatchObject({status:409})
})
it('catálogo ordena por nome e ameaça, filtra a mesa e sinaliza sessão ativa',async()=>{
  const own=await npc()
  await addInstance(own.id,'detetive')
  const otherCampaign=(await createTestCampaign(master)).id
  const other=await createNpc(master,{data:{...NPC_TEMPLATES[0].data,name:'Alfa',threatLevel:7},campaignId:otherCampaign,idempotencyKey:key()})
  const byName=await listNpcs(master,{sort:'name'})
  expect(byName.npcs.map(n=>n.id)).toEqual([other.id,own.id])
  expect(byName.npcs.find(n=>n.id===own.id)?.inSession).toBe(true)
  expect((await listNpcs(master,{sort:'threat'})).npcs.map(n=>n.id)).toEqual([other.id,own.id])
  expect((await listNpcs(master,{campaignId,sort:'recent'})).npcs.map(n=>n.id)).toEqual([own.id])
  await expect(listNpcs(master,{sort:'name; DROP TABLE npc_definitions'})).rejects.toMatchObject({status:422})
  await expect(listNpcs(player,{campaignId})).rejects.toMatchObject({status:403})
})
it('conversão tem prévia e confirmação; cópia não recebe estado de campanha',async()=>{
  const own=await npc()
  const preview=await changeNpc(master,own.id,{action:'CONVERT_PREVIEW',targetSheetType:'FULL'})
  await expect(changeNpc(master,own.id,{action:'CONVERT',data:preview.preview,expectedRevision:0,idempotencyKey:key()})).rejects.toMatchObject({status:422})
  const converted=await changeNpc(master,own.id,{action:'CONVERT',data:preview.preview,confirmed:true,expectedRevision:0,idempotencyKey:key()})
  const full=await getNpc(master,String(converted.id));expect(full.characterId).toBeTruthy()
  const copy=await changeNpc(master,full.id,{action:'DUPLICATE',expectedRevision:full.revision,idempotencyKey:key()})
  expect((await getNpc(master,String(copy.id))).campaigns).toHaveLength(0)
})
it('três instâncias preservam danos independentes e rolagem usa pool excepcional',async()=>{
  const own=await npc(),instances=await Promise.all(['A','B','C'].map(label=>addInstance(own.id,label)))
  await sessionNpcCommand(master,sessionId,{action:'UPDATE',id:instances[0].id,expectedRevision:0,state:{healthDamage:{superficial:2,aggravated:0}},idempotencyKey:key()})
  const snapshot=await getSessionNpcs(master,sessionId),states=snapshot.instances as any[]
  expect(states.map(i=>i.state.healthDamage.superficial).sort()).toEqual([0,0,2])
  const rolled=await sessionNpcCommand(master,sessionId,{action:'ROLL',id:instances[0].id,expectedRevision:1,category:'mental',exceptionalId:'investigacao',difficulty:2,visibility:'SECRET',reason:'Investigar',idempotencyKey:key()},{rollD10:n=>Array(n).fill(6)})
  expect(rolled.pool).toBe(6)
  expect((await getSessionNpcs(player,sessionId)).instances).toHaveLength(0)
  expect((await getSessionNpcs(player,sessionId)).rolls).toHaveLength(0)
})
it('revelação de nome não expõe ameaça, pools, notas ou chave interna',async()=>{
  const own=await npc(),added=await addInstance(own.id,'Segredo: irmão do príncipe')
  await sessionNpcCommand(master,sessionId,{action:'UPDATE',id:added.id,expectedRevision:0,revealedFields:['name'],idempotencyKey:key()})
  const json=JSON.stringify(await getSessionNpcs(player,sessionId))
  expect(json).toContain('Detetive');expect(json).not.toMatch(/Segredo:|threat|standardPools|privateNotes|fullData|investigacao/)
  await expect(sessionNpcCommand(player,sessionId,{action:'ROLL',id:added.id,expectedRevision:1,idempotencyKey:key()})).rejects.toMatchObject({status:403})
})
it('ficha completa rola pelos atributos e habilidades reais, sem usar ameaça',async()=>{
  const result=await createNpc(master,{data:{...NPC_TEMPLATES[0].data,sheetType:'FULL',threatLevel:7},campaignId,idempotencyKey:key()}),own=await getNpc(master,String(result.id))
  await db.execute(sql`UPDATE characters SET data='{"forca":4,"habilidade-briga":2,"vigor":3,"compostura":2,"determinacao":2}'::jsonb WHERE id=${own.characterId}::uuid`)
  const added=await addInstance(own.id,'Completo')
  const rolled=await sessionNpcCommand(master,sessionId,{action:'ROLL',id:added.id,expectedRevision:0,attribute:'forca',skillId:'briga',difficulty:2,visibility:'PUBLIC',reason:'Atacar',idempotencyKey:key()},{rollD10:n=>Array(n).fill(6)})
  expect(rolled.pool).toBe(6)
})
it('notas por mesa não vazam GM_ONLY e edição depende de autoria/política',async()=>{
  await command(master,{action:'CREATE_RECORD',data:record('GM_ONLY','Segredo do Narrador')})
  const own=await command(player,{action:'CREATE_RECORD',data:record('OWNER_ONLY','Minha nota')})
  const view=await getSheetData(player,campaignId,'CHARACTER',characterId)
  expect(view.records.map(r=>r.title)).toEqual(['Minha nota'])
  expect((await getSheetData(master,campaignId,'CHARACTER',characterId)).records).toHaveLength(2)
  await command(master,{action:'SET_POLICY',allowPlayerEdits:false})
  await expect(command(player,{action:'EDIT_RECORD',id:own.id,expectedRevision:0,data:record()})).rejects.toMatchObject({status:403})
  await expect(getSheetData(outsider,campaignId,'CHARACTER',characterId)).rejects.toMatchObject({status:403})
  await expect(command(master,{action:'CREATE_RECORD',data:{...record(),ownerId:player}})).rejects.toMatchObject({status:400})
})
it('relacionamentos respeitam os dois extremos e rejeitam outra campanha',async()=>{
  const own=await npc()
  await changeNpc(master,own.id,{action:'LINK',campaignId,expectedRevision:0,idempotencyKey:key(),revealedFields:['name']})
  await command(master,{action:'CREATE_RELATION',target:{subjectType:'NPC',subjectId:own.id},relationType:'CONTACT',reciprocal:true,description:'Conhecem-se',visibility:'CAMPAIGN_VISIBLE'})
  expect((await getSheetData(player,campaignId,'CHARACTER',characterId)).relations).toHaveLength(1)
  expect((await getSheetData(player,campaignId,'NPC',own.id)).relations).toHaveLength(1)
  const other=(await createTestCampaign(master)).id,char=(await createTestCharacter(master,other)).id
  await expect(command(master,{action:'CREATE_RELATION',target:{subjectType:'CHARACTER',subjectId:char},relationType:'ALLY',reciprocal:true,visibility:'CAMPAIGN_VISIBLE'})).rejects.toMatchObject({status:404})
})
it('revelar registro cria snapshot público isolado sem expor futuras edições privadas',async()=>{
  const created=await command(master,{action:'CREATE_RECORD',data:record('GM_ONLY')})
  await revealSheetItem(master,sessionId,{action:'REVEAL',kind:'RECORD',targetId:created.id,id:key()})
  await command(master,{action:'EDIT_RECORD',id:created.id,expectedRevision:0,data:{...record('GM_ONLY'),body:'Outro segredo'}})
  const shared=JSON.stringify(await listSheetReveals(player,sessionId))
  expect(shared).toContain('Texto reservado');expect(shared).not.toContain('Outro segredo')
  await expect(revealSheetItem(player,sessionId,{action:'REVEAL',kind:'RECORD',targetId:created.id,id:key()})).rejects.toMatchObject({status:403})
})
function memoryStore(){const objects=new Map<string,Uint8Array>();const store:MediaStore={read:async key=>objects.get(key)??null,write:async(key,data)=>{objects.set(key,data)},remove:async key=>{objects.delete(key)}};return {store,objects}}
async function media(visibility='OWNER_ONLY',portrait=false){
  const prepared=await prepareSheetUpload(master,{subjectType:'CHARACTER',subjectId:characterId,campaignId,data:{title:'Retrato',isPortrait:portrait,visibility}},false)
  const storage=memoryStore();storage.objects.set(prepared.pathname,await sharp({create:{width:64,height:64,channels:3,background:'red'}}).jpeg().toBuffer())
  const confirmed=await confirmSheetUpload(master,prepared.uploadId,storage.store)
  return {...storage,confirmed}
}
it('valida bytes reais, rejeita arquivo falso/excessivo e reencoda sem metadados',async()=>{
  await expect(sanitizeSheetImage(Buffer.from('<svg></svg>'))).rejects.toMatchObject({status:422})
  await expect(sanitizeSheetImage(Buffer.alloc(5*1024*1024+1))).rejects.toMatchObject({status:413})
  const input=await sharp({create:{width:64,height:64,channels:3,background:'red'}}).jpeg().withMetadata().toBuffer()
  const image=await sanitizeSheetImage(input),metadata=await sharp(image.bytes).metadata()
  expect(metadata.format).toBe('webp');expect(metadata.exif).toBeUndefined()
})
it('mídia privada exige autorização atual e revelação não abre a ficha inteira',async()=>{
  const {store,confirmed}=await media('GM_ONLY')
  await expect(readSheetMedia(player,confirmed.id,store)).rejects.toMatchObject({status:404})
  await revealSheetItem(master,sessionId,{action:'REVEAL',kind:'MEDIA',targetId:confirmed.id,id:key()})
  expect((await readSheetMedia(player,confirmed.id,store)).mimeType).toBe('image/webp')
  await expect(readSheetMedia(outsider,confirmed.id,store)).rejects.toMatchObject({status:403})
  expect((await getSheetData(player,campaignId,'CHARACTER',characterId)).records).toHaveLength(0)
})
it('excluir revoga a URL mesmo se o storage falhar; confirmar é idempotente',async()=>{
  const {store,confirmed}=await media()
  const failure={...store,remove:async()=>{throw Error('offline')}}
  expect(await editSheetMedia(master,confirmed.id,{action:'DELETE',expectedRevision:0},failure)).toMatchObject({ok:true,storageDeletionPending:true})
  await expect(readSheetMedia(master,confirmed.id,store)).rejects.toMatchObject({status:404})
})
