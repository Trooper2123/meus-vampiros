import { createNote, listNotes } from '@/lib/notes'
import { notesActor, notesBody, notesFailure, notesResponse } from '@/lib/notes-http'
import { CharacterCommandError } from '@/lib/character-commands'

export async function GET(request: Request) {
  try {
    const actor = await notesActor(request)
    const query = new URL(request.url).searchParams
    if ([...query.keys()].some(key => !['campaignId', 'page', 'pageSize', 'search', 'marker'].includes(key))) throw new CharacterCommandError(400, 'Filtros inválidos.')
    return notesResponse(await listNotes(actor, { campaignId: query.get('campaignId') ?? undefined, page: query.has('page') ? Number(query.get('page')) : undefined, pageSize: query.has('pageSize') ? Number(query.get('pageSize')) : undefined, search: query.get('search') ?? undefined, marker: query.get('marker') ?? undefined }))
  } catch (error) { return notesFailure(error) }
}

export async function POST(request: Request) {
  try { const actor = await notesActor(request, true); return notesResponse(await createNote(actor, await notesBody(request)), 201) }
  catch (error) { return notesFailure(error) }
}
