import { notesContext } from '@/lib/notes'
import { notesActor, notesFailure, notesResponse } from '@/lib/notes-http'

export async function GET(request: Request) {
  try { return notesResponse(notesContext(await notesActor(request))) }
  catch (error) { return notesFailure(error) }
}
