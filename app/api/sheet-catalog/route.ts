import { notesActor,notesResponse } from '@/lib/notes-http'
import { npcFailure } from '@/lib/npc-http'
import { SKILL_CATALOG,DISCIPLINE_RESEARCH } from '@/lib/vtm-v5/research-catalog'
import { DISCIPLINES } from '@/lib/vtm-v5/disciplines'
export async function GET(request:Request){try{await notesActor(request);return notesResponse({skills:SKILL_CATALOG,disciplines:DISCIPLINES.map(d=>({id:d.id,name:d.name})),powers:DISCIPLINE_RESEARCH.filter(p=>p.status==='Publicação').map(p=>({id:p.id,name:p.name,discipline:p.discipline,level:p.level}))})}catch(error){return npcFailure(error)}}
