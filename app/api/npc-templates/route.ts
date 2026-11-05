import { narratorActor,npcFailure } from '@/lib/npc-http'
import { notesResponse } from '@/lib/notes-http'
import { npcTemplates } from '@/lib/npc-store'
import { noteUuid } from '@/lib/notes'

export async function GET(request:Request) {
  try {
    const actorId=await narratorActor(request)
    const params=new URL(request.url).searchParams
    const campaignId=params.get('campaignId')??undefined
    if([...params.keys()].some(key=>key!=='campaignId') || (campaignId && !noteUuid(campaignId))) {
      return notesResponse({error:'Parâmetros inválidos.'},400)
    }
    return notesResponse(await npcTemplates(actorId,campaignId))
  } catch(error) { return npcFailure(error) }
}
