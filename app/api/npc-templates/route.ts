import { narratorActor,npcFailure } from '@/lib/npc-http'
import { notesResponse } from '@/lib/notes-http'
import { npcTemplates } from '@/lib/npc-store'
export async function GET(request:Request){try{return notesResponse(await npcTemplates(await narratorActor(request)))}catch(error){return npcFailure(error)}}
