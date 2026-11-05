import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { notesActor, notesBody, notesFailure, notesId, notesResponse } from '@/lib/notes-http'
import { listCampaignHandouts } from '@/lib/session-handouts'
import { CharacterCommandError } from '@/lib/character-commands'

type Context={params:Promise<{id:string}>}
export async function GET(request:Request,context:Context) {
 try {
  const actor=await notesActor(request),campaign=notesId((await context.params).id)
  const library=await listCampaignHandouts(actor,campaign)
  const result=await db.execute<{handout_id:string|null;revision:string}>(sql`SELECT handout_id,revision FROM campaign_visual_state WHERE campaign_id=${campaign}::uuid`)
  const chosen=library.handouts.find(item=>item.id===result.rows[0]?.handout_id && item.contentType?.startsWith('image/'))
  return notesResponse({active:chosen??null,revision:Number(result.rows[0]?.revision??0),canManage:library.canManage,images:library.canManage?library.handouts.filter(item=>item.contentType?.startsWith('image/')):[]})
 }catch(e){return notesFailure(e)}
}
export async function PUT(request:Request,context:Context) {
 try {
  const actor=await notesActor(request,true),campaign=notesId((await context.params).id)
  const library=await listCampaignHandouts(actor,campaign)
  if(!library.canManage)throw new CharacterCommandError(403,'Somente o narrador altera a mesa visual.')
  const body=await notesBody(request)
  const handoutId=body.handoutId
  if(handoutId!==null && (typeof handoutId!=='string'||!library.handouts.some(item=>item.id===handoutId&&item.contentType?.startsWith('image/')&&item.shareMode==='ALL')))throw new CharacterCommandError(422,'Selecione uma imagem da biblioteca.')
  const expected=body.expectedRevision
  if(typeof expected!=='number'||!Number.isSafeInteger(expected)||expected<0)throw new CharacterCommandError(422,'Revisão inválida.')
  const updated=await db.execute<{revision:string}>(sql`
   INSERT INTO campaign_visual_state(campaign_id,handout_id,revision) SELECT ${campaign}::uuid,${handoutId}::uuid,1 WHERE ${expected}=0
   ON CONFLICT(campaign_id) DO UPDATE SET handout_id=EXCLUDED.handout_id,revision=campaign_visual_state.revision+1,updated_at=now()
   WHERE campaign_visual_state.revision=${expected}
   RETURNING revision`)
  if(!updated.rows.length)throw new CharacterCommandError(409,'A mesa visual foi alterada. Atualize e tente novamente.')
  return notesResponse({revision:Number(updated.rows[0].revision)})
 }catch(e){return notesFailure(e)}
}
