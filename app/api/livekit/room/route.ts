import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { canManageCampaign } from '@/lib/auth/authorization'
import { isUserInCampaign } from '@/lib/availability'
import { createLiveKitRoom, ensureAllTables, getLiveKitRoom } from '@/lib/db'
import { generateLiveKitToken, getLiveKitUrl } from '@/lib/livekit'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function roomResponse(campaignId: string, user: { sub: string; name?: string | null; email?: string | null }) {
  const room = await getLiveKitRoom(campaignId)
  if (!room) return NextResponse.json({ error: 'Sala virtual ainda não criada.' }, { status: 404 })
  const isHost = room.hostUserId === user.sub
  const token = await generateLiveKitToken({ identity: user.sub, name: user.name ?? user.email, roomName: room.roomName, isHost })
  return NextResponse.json({ roomName: room.roomName, roomUrl: room.roomUrl, hostUserId: room.hostUserId, isHost, token })
}

export async function GET(request: Request) {
  try {
    await ensureAllTables()
    const session = await getSessionOrDev()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    const campaignId = new URL(request.url).searchParams.get('campaignId') ?? ''
    if (!UUID_PATTERN.test(campaignId)) return NextResponse.json({ error: 'ID da mesa inválido.' }, { status: 400 })
    if (!await isUserInCampaign(campaignId, session.user.sub)) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
    if (!await getLiveKitRoom(campaignId) && await canManageCampaign(session.user.sub, campaignId)) {
      await createLiveKitRoom(campaignId, `campanha-${campaignId}`, getLiveKitUrl(), session.user.sub)
    }
    return roomResponse(campaignId, session.user)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível carregar a sala virtual.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await ensureAllTables()
    const session = await getSessionOrDev()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    const body = await request.json().catch(() => ({}))
    const campaignId = typeof body.campaignId === 'string' ? body.campaignId : ''
    if (!UUID_PATTERN.test(campaignId)) return NextResponse.json({ error: 'ID da mesa inválido.' }, { status: 400 })
    if (!await canManageCampaign(session.user.sub, campaignId)) return NextResponse.json({ error: 'Apenas o mestre pode criar a sala virtual.' }, { status: 403 })
    if (!await getLiveKitRoom(campaignId)) await createLiveKitRoom(campaignId, `campanha-${campaignId}`, getLiveKitUrl(), session.user.sub)
    return roomResponse(campaignId, session.user)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível criar a sala virtual.' }, { status: 500 })
  }
}
