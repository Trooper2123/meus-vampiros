import { npcFailure } from '@/lib/npc-http'
import { notesActor,notesBody,notesResponse } from '@/lib/notes-http'
import { prepareSheetUpload,confirmSheetUpload,listGlobalSheetMedia } from '@/lib/sheet-media'
import { npcFail,npcKeys } from '@/lib/npc-domain'
import { npcId } from '@/lib/npc-store'
export async function GET(request:Request){try{const actorId=await notesActor(request),params=new URL(request.url).searchParams;return notesResponse(await listGlobalSheetMedia(actorId,params.get('subjectType'),npcId(params.get('subjectId'))))}catch(error){return npcFailure(error)}}
export async function POST(request:Request){try{const actorId=await notesActor(request,true),{action,...body}=await notesBody(request);if(action==='PREPARE'){ return notesResponse(await prepareSheetUpload(actorId,body),201); }if(action==='CONFIRM'){npcKeys(body,['uploadId']);return notesResponse(await confirmSheetUpload(actorId,npcId(body.uploadId)))}return npcFail(400,'Operação de upload inválida.')}catch(error){return npcFailure(error)}}
