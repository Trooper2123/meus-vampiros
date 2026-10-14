import { createNote, listNotes } from '@/lib/notes'
import { notesActor, notesBody, notesFailure, notesResponse } from '@/lib/notes-http'
import { CharacterCommandError } from '@/lib/character-commands'

export async function GET(request: Request) {
  try {
    const actor = await notesActor(request)
    const query = new URL(request.url).searchParams
    if ([...query.keys()].some(key => !['campaignId', 'page', 'pageSize'].includes(key))) throw new CharacterCommandError(400, 'Filtros inválidos.')
    return notesResponse(listNotes(actor, { campaignId: query.get('campaignId') ?? undefined, page: query.has('page') ? Number(query.get('page')) : undefined, pageSize: query.has('pageSize') ? Number(query.get('pageSize')) : undefined }))
  } catch (error) { return notesFailure(error) }
}

export async function POST(request: Request) {
  try { const actor = await notesActor(request, true); return notesResponse(createNote(actor, await notesBody(request)), 201) }
  catch (error) { return notesFailure(error) }
}
