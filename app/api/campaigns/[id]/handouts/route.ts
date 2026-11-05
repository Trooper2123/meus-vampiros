import { notesActor, notesBody, notesFailure, notesId, notesResponse } from '@/lib/notes-http'
import { confirmCampaignHandout, listCampaignHandouts, prepareCampaignHandout } from '@/lib/session-handouts'

export async function GET(request:Request,context:{params:Promise<{id:string}>}){try{return notesResponse(await listCampaignHandouts(await notesActor(request),notesId((await context.params).id)))}catch(error){return notesFailure(error)}}
export async function POST(request:Request,context:{params:Promise<{id:string}>}){try{
  const actor=await notesActor(request,true),campaignId=notesId((await context.params).id),body=await notesBody(request)
  if(body.action==='PREPARE')return notesResponse(await prepareCampaignHandout(actor,campaignId,body))
  if(body.action==='CONFIRM'&&typeof body.uploadId==='string')return notesResponse(await confirmCampaignHandout(actor,campaignId,body.uploadId),201)
  return notesResponse({error:'Ação de envio inválida.'},400)
}catch(error){return notesFailure(error)}}
