import { NextResponse } from 'next/server'
import { CharacterCommandError } from '@/lib/character-commands'
import { getCampaignCall, setCampaignCall } from '@/lib/campaign-calls'
import { notesActor, notesBody } from '@/lib/notes-http'

function failure(error: unknown) {
  return NextResponse.json({ error: error instanceof CharacterCommandError ? error.message : 'Não foi possível consultar a convocação.' }, { status: error instanceof CharacterCommandError ? error.status : 500, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } })
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actorId = await notesActor(request)
    return NextResponse.json(await getCampaignCall(actorId, (await context.params).id), { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } })
  } catch (error) { return failure(error) }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actorId = await notesActor(request, true)
    return NextResponse.json(await setCampaignCall(actorId, (await context.params).id, await notesBody(request)), { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } })
  } catch (error) { return failure(error) }
}
