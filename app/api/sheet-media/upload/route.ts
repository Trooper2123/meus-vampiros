import { handleUpload,type HandleUploadBody } from '@vercel/blob/client'
import { notesActor,notesBody,notesResponse } from '@/lib/notes-http'
import { npcFailure } from '@/lib/npc-http'
import { npcFail,npcKeys,npcObject } from '@/lib/npc-domain'
import { npcId } from '@/lib/npc-store'
import { authorizeSheetUpload,mediaStagingKey,MAX_SHEET_IMAGE_BYTES,requireBlobConfiguration } from '@/lib/sheet-media'
export async function POST(request:Request){try{
  const actorId=await notesActor(request,true);requireBlobConfiguration()
  const body=await notesBody(request)
  if(body.type!=='blob.generate-client-token')return npcFail(400,'Pedido de upload inválido.')
  const result=await handleUpload({request,body:body as unknown as HandleUploadBody,onBeforeGenerateToken:async(pathname,clientPayload)=>{
    let payload:Record<string,unknown>
    try{payload=npcObject(JSON.parse(clientPayload??''))}catch{return npcFail(400,'Pedido de upload inválido.')}
    npcKeys(payload,['uploadId']);const id=npcId(payload.uploadId);await authorizeSheetUpload(actorId,id)
    if(pathname!==mediaStagingKey(actorId,id))return npcFail(403,'Destino de upload não autorizado.')
    return {allowedContentTypes:['image/jpeg','image/png','image/webp'],maximumSizeInBytes:MAX_SHEET_IMAGE_BYTES,validUntil:Date.now()+10*60*1000,addRandomSuffix:false,allowOverwrite:false}
  }})
  return notesResponse(result)
}catch(error){return npcFailure(error)}}
