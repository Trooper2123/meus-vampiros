import { deleteNote, getNote, updateNote } from '@/lib/notes'
import { notesActor, notesBody, notesFailure, notesId, notesResponse } from '@/lib/notes-http'
import { CharacterCommandError } from '@/lib/character-commands'

type Context = { params: Promise<{ id: string }> }
export async function GET(request: Request, context: Context) {
  try { const actor = await notesActor(request); return notesResponse(getNote(actor, notesId((await context.params).id))) }
  catch (error) { return notesFailure(error) }
}
export async function PATCH(request: Request, context: Context) {
  try { const actor = await notesActor(request, true); return notesResponse(updateNote(actor, notesId((await context.params).id), await notesBody(request))) }
  catch (error) { return notesFailure(error) }
}
export async function DELETE(request: Request, context: Context) {
  try {
    const actor = await notesActor(request, true)
    const body = await notesBody(request)
    if (Object.keys(body).some(key => key !== 'expectedRevision')) throw new CharacterCommandError(400, 'Campos inválidos.')
    return notesResponse(deleteNote(actor, notesId((await context.params).id), body.expectedRevision))
  } catch (error) { return notesFailure(error) }
}
