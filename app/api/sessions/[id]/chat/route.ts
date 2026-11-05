import { listSessionChat, sendSessionChat } from '@/lib/session-chat'
import { notesActor, notesBody, notesFailure, notesId, notesResponse } from '@/lib/notes-http'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try { return notesResponse(await listSessionChat(await notesActor(request), notesId((await context.params).id))) }
  catch (error) { return notesFailure(error) }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try { return notesResponse({ message: await sendSessionChat(await notesActor(request, true), notesId((await context.params).id), await notesBody(request)) }, 201) }
  catch (error) { return notesFailure(error) }
}
