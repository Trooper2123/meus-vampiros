import { handleUpload,type HandleUploadBody } from '@vercel/blob/client'
import { notesActor,notesBody,notesFailure,notesResponse } from '@/lib/notes-http'
import { CharacterCommandError } from '@/lib/character-commands'
import { authorizeCampaignHandoutUpload,MAX_SESSION_HANDOUT_BYTES } from '@/lib/session-handouts'

export async function POST(request:Request,context:{params:Promise<{id:string}>}){try{
  const actor=await notesActor(request,true),campaignId=(await context.params).id,body=await notesBody(request)
  if(body.type!=='blob.generate-client-token')throw new CharacterCommandError(400,'Pedido de upload inválido.')
  const result=await handleUpload({request,body:body as unknown as HandleUploadBody,onBeforeGenerateToken:async(pathname,payload)=>{
    let value:Record<string,unknown>;try{value=JSON.parse(payload??'') as Record<string,unknown>}catch{throw new CharacterCommandError(400,'Pedido de upload inválido.')}
    if(typeof value.uploadId!=='string')throw new CharacterCommandError(400,'Pedido de upload inválido.')
    await authorizeCampaignHandoutUpload(actor,campaignId,value.uploadId,pathname)
    return {maximumSizeInBytes:MAX_SESSION_HANDOUT_BYTES,validUntil:Date.now()+10*60*1000,addRandomSuffix:false,allowOverwrite:false}
  }})
  return notesResponse(result)
}catch(error){return notesFailure(error)}}
