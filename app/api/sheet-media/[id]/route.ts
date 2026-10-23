import { npcFailure } from '@/lib/npc-http'
import { notesActor,notesBody,notesId,notesResponse } from '@/lib/notes-http'
import { editSheetMedia,readSheetMedia } from '@/lib/sheet-media'
type Context={params:Promise<{id:string}>}
export async function GET(request:Request,context:Context){try{const image=await readSheetMedia(await notesActor(request),notesId((await context.params).id));return new Response(new Uint8Array(image.bytes),{headers:{'Content-Type':image.mimeType,'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff','Content-Disposition':'inline; filename="image.webp"','Content-Security-Policy':"default-src 'none'; sandbox"}})}catch(error){return npcFailure(error)}}
export async function PATCH(request:Request,context:Context){try{return notesResponse(await editSheetMedia(await notesActor(request,true),notesId((await context.params).id),await notesBody(request)))}catch(error){return npcFailure(error)}}
export async function DELETE(request:Request,context:Context){try{return notesResponse(await editSheetMedia(await notesActor(request,true),notesId((await context.params).id),{...await notesBody(request),action:'DELETE'}))}catch(error){return npcFailure(error)}}
