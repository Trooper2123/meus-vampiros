import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { getAvailability, getCampaignOwner, getCampaignSchedule, isUserInCampaign, saveAvailability, saveCampaignSchedule, suggestAvailability, type AvailabilityStatus } from '@/lib/availability'
import { ensureAllTables } from '@/lib/db'
import { noteUuid } from '@/lib/notes'

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
}

function handle(action: (request: Request) => Promise<Response>, mutation = false) {
  return async (request: Request) => {
    if (mutation) {
      const origin = request.headers.get('origin')
      if ((origin && origin !== new URL(request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site') return NextResponse.json({ error: 'Origem não permitida.' }, { status: 403 })
      if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return NextResponse.json({ error: 'Envie dados JSON.' }, { status: 400 })
    }
    try { return await action(request) }
    catch { return NextResponse.json({ error: 'Não foi possível atualizar o calendário.' }, { status: 500 }) }
  }
}

export const GET = handle(async (request: Request) => {
  const campaignId = new URL(request.url).searchParams.get('campaignId')
  const session = await getSessionOrDev()
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  if (!campaignId || !noteUuid(campaignId)) return NextResponse.json({ error: 'Mesa inválida.' }, { status: 400 })
  if (!(await isUserInCampaign(campaignId, session.user.sub))) return NextResponse.json({ error: 'Você não pertence a esta mesa.' }, { status: 403 })
  await ensureAllTables()
  return NextResponse.json({ currentUserId: session.user.sub, entries: await getAvailability(campaignId), schedule: await getCampaignSchedule(campaignId) }, { headers: { 'Cache-Control': 'private, no-store' } })
})

export const POST = handle(async (request: Request) => {
  const session = await getSessionOrDev()
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  const campaignId = typeof body.campaignId === 'string' ? body.campaignId : ''
  const date = typeof body.date === 'string' ? body.date : ''
  const status = body.status as AvailabilityStatus
  if (!noteUuid(campaignId) || !validDate(date) || !['disponível', 'talvez', 'indisponível'].includes(status) || (body.suggested !== undefined && typeof body.suggested !== 'boolean')) return NextResponse.json({ error: 'Data ou disponibilidade inválida.' }, { status: 400 })
  if (!(await isUserInCampaign(campaignId, session.user.sub))) return NextResponse.json({ error: 'Você não pertence a esta mesa.' }, { status: 403 })
  await ensureAllTables()
  const owner = await getCampaignOwner(campaignId)
  const isMaster = owner === session.user.sub
  const entry = await saveAvailability(campaignId, session.user.sub, isMaster ? 'Mestre' : (session.user.name ?? session.user.email ?? 'Jogador'), date, status, Boolean(body.suggested) && isMaster)
  return NextResponse.json({ entry })
}, true)

export const PATCH = handle(async (request: Request) => {
  const session = await getSessionOrDev()
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  const campaignId = typeof body.campaignId === 'string' ? body.campaignId : ''
  const date = typeof body.date === 'string' ? body.date : ''
  if (!noteUuid(campaignId)) return NextResponse.json({ error: 'Mesa inválida.' }, { status: 400 })
  const startTime = typeof body.startTime === 'string' ? body.startTime : null
  const endTime = typeof body.endTime === 'string' ? body.endTime : null
  if (!campaignId || (await getCampaignOwner(campaignId)) !== session.user.sub) return NextResponse.json({ error: 'Apenas o Narrador pode alterar o planejamento da mesa.' }, { status: 403 })
  if (body.action === 'schedule') {
    if (!startTime || !endTime || !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime) || startTime >= endTime) return NextResponse.json({ error: 'Informe um intervalo de horário válido.' }, { status: 400 })
    await ensureAllTables()
    return NextResponse.json({ schedule: await saveCampaignSchedule(campaignId, startTime, endTime) })
  }
  if ((body.action !== undefined && body.action !== 'suggest') || !validDate(date)) return NextResponse.json({ error: 'Data inválida.' }, { status: 400 })
  await ensureAllTables()
  await suggestAvailability(campaignId, session.user.sub, date)
  return NextResponse.json({ ok: true })
}, true)
