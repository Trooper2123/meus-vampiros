import { npcFailure } from '@/lib/npc-http'
import { notesActor,notesBody,notesId,notesResponse } from '@/lib/notes-http'
import { getSheetData,sheetRecordCommand } from '@/lib/sheet-records'
import { listSheetMedia } from '@/lib/sheet-media'
import { npcId } from '@/lib/npc-store'
import type { SubjectType } from '@/lib/sheet-access'
type Context={params:Promise<{id:string}>}
export async function GET(request:Request,context:Context){try{const actorId=await notesActor(request),campaignId=notesId((await context.params).id),params=new URL(request.url).searchParams,type=params.get('subjectType') as SubjectType,id=npcId(params.get('subjectId'));return notesResponse({...await getSheetData(actorId,campaignId,type,id,params.get('query')??''),...await listSheetMedia(actorId,campaignId,type,id)})}catch(error){return npcFailure(error)}}
export async function POST(request:Request,context:Context){try{const actorId=await notesActor(request,true),campaignId=notesId((await context.params).id),{subjectType,subjectId,...body}=await notesBody(request);return notesResponse(await sheetRecordCommand(actorId,campaignId,subjectType as SubjectType,npcId(subjectId),body))}catch(error){return npcFailure(error)}}
