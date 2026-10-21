import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { createLiveKitRoom, getLiveKitRoom } from '@/lib/db'
import { generateLiveKitToken, getLiveKitUrl } from '@/lib/livekit'
import { CharacterCommandError } from '@/lib/character-commands'
import { getCampaignCall } from '@/lib/campaign-calls'
import { notesActor, notesBody } from '@/lib/notes-http'

async function roomResponse(campaignId: string, user: { sub: string; name?: string | null; email?: string | null }, hostOnly = false) {
  const status = await getCampaignCall(user.sub, campaignId)
  if (hostOnly && !status.canSummon) throw new CharacterCommandError(403, 'Somente o Narrador atual pode preparar a sala.')
  if (!status.canSummon && !status.active) throw new CharacterCommandError(403, 'Aguarde a convocação do Narrador.')
  let room = await getLiveKitRoom(campaignId)
  if (!room && status.canSummon) {
    await createLiveKitRoom(campaignId, `campanha-${campaignId}`, getLiveKitUrl(), user.sub)
    room = await getLiveKitRoom(campaignId)
  }
  if (!room) throw new CharacterCommandError(409, 'O Narrador ainda precisa preparar a sala virtual.')
  const token = await generateLiveKitToken({ identity: user.sub, name: user.name ?? user.email, roomName: room.roomName, isHost: status.canSummon })
  const current = await getCampaignCall(user.sub, campaignId)
  if (current.canSummon !== status.canSummon || (!current.canSummon && !current.active)) throw new CharacterCommandError(403, 'A convocação ou sua participação foi alterada.')
  return NextResponse.json({ roomName: room.roomName, roomUrl: room.roomUrl, isHost: current.canSummon, token }, { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } })
}

function failure(error: unknown) {
  return NextResponse.json({ error: error instanceof CharacterCommandError ? error.message : 'Não foi possível acessar a sala virtual. Verifique a configuração com o Narrador.' }, { status: error instanceof CharacterCommandError ? error.status : 500, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } })
}

export async function GET(request: Request) {
  try {
    const session = await getSessionOrDev()
    if (!session?.user?.sub) throw new CharacterCommandError(401, 'Não autorizado.')
    return await roomResponse(new URL(request.url).searchParams.get('campaignId') ?? '', session.user)
  } catch (error) { return failure(error) }
}

export async function POST(request: Request) {
  try {
    await notesActor(request, true)
    const session = await getSessionOrDev()
    if (!session?.user?.sub) throw new CharacterCommandError(401, 'Não autorizado.')
    const body = await notesBody(request)
    if (Object.keys(body).length !== 1 || typeof body.campaignId !== 'string') throw new CharacterCommandError(400, 'Mesa inválida.')
    return await roomResponse(body.campaignId, session.user, true)
  } catch (error) { return failure(error) }
}
