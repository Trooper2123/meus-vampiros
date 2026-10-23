import { narratorActor,npcFailure } from '@/lib/npc-http'
import { notesBody,notesResponse } from '@/lib/notes-http'
import { createNpc,listNpcs,npcDomitors } from '@/lib/npc-store'
import { getCampaignsForMaster } from '@/lib/campaigns'
export async function GET(request:Request){try{const actorId=await narratorActor(request);return notesResponse({...await listNpcs(actorId,Object.fromEntries(new URL(request.url).searchParams)),campaigns:await getCampaignsForMaster(actorId),domitors:await npcDomitors(actorId)})}catch(error){return npcFailure(error)}}
export async function POST(request:Request){try{const actorId=await narratorActor(request,true);return notesResponse(await createNpc(actorId,await notesBody(request)),201)}catch(error){return npcFailure(error)}}
