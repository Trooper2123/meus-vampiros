import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { hasMasterAccess } from '@/lib/campaigns'
import { getAvailability, getCampaignOwner, isUserInCampaign, saveAvailability, suggestAvailability, type AvailabilityStatus } from '@/lib/availability'
import { ensureAllTables } from '@/lib/db'

export async function GET(request: Request) {
  const campaignId = new URL(request.url).searchParams.get('campaignId')
  const session = await getSessionOrDev()
  if (!session?.user || !campaignId || !(await isUserInCampaign(campaignId, session.user.sub))) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  await ensureAllTables()
  return NextResponse.json({ entries: await getAvailability(campaignId) })
}

export async function POST(request: Request) {
  const session = await getSessionOrDev()
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const campaignId = typeof body.campaignId === 'string' ? body.campaignId : ''
  const date = typeof body.date === 'string' ? body.date : ''
  const status = body.status as AvailabilityStatus
  if (!campaignId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !['disponível', 'talvez', 'indisponível'].includes(status)) return NextResponse.json({ error: 'Data ou disponibilidade inválida.' }, { status: 400 })
  if (!(await isUserInCampaign(campaignId, session.user.sub))) return NextResponse.json({ error: 'Você não pertence a esta mesa.' }, { status: 403 })
  await ensureAllTables()
  const owner = await getCampaignOwner(campaignId)
  const isMaster = owner === session.user.sub || await hasMasterAccess(session.user)
  const entry = await saveAvailability(campaignId, session.user.sub, isMaster ? 'Mestre' : (session.user.name ?? session.user.email ?? 'Jogador'), date, status, Boolean(body.suggested) && isMaster)
  if (Boolean(body.suggested) && isMaster) await suggestAvailability(campaignId, session.user.sub, date)
  return NextResponse.json({ entry })
}

export async function PATCH(request: Request) {
  const session = await getSessionOrDev()
  const body = await request.json().catch(() => ({}))
  const campaignId = typeof body.campaignId === 'string' ? body.campaignId : ''
  const date = typeof body.date === 'string' ? body.date : ''
  if (!session?.user || !campaignId || !date || (await getCampaignOwner(campaignId)) !== session.user.sub) return NextResponse.json({ error: 'Apenas o mestre pode sugerir datas.' }, { status: 403 })
  await ensureAllTables()
  await suggestAvailability(campaignId, session.user.sub, date)
  return NextResponse.json({ ok: true })
}
