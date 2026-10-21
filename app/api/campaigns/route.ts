import { getSessionOrDev } from '@/lib/auth0'
import { NextResponse } from 'next/server'
import { createCampaign, getCampaignsForMaster, hasMasterAccess } from '@/lib/campaigns'
import { db, ensureAllTables } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { CharacterCommandError } from '@/lib/character-commands'
import { createCampaignInvitation, validateCampaignExceptions } from '@/lib/campaign-invitations'
import { CLANS } from '@/lib/vtm-v5/clans'
import { PREDATOR_TYPE_CODES, PREDATOR_TYPES, type PredatorTypeCode } from '@/lib/vtm-v5/predator-types'
import { savePredatorTypeSettings } from '@/lib/predator-types'

async function getAuthenticatedUser() {
  const session = await getSessionOrDev()
  return session?.user ?? null
}

export async function GET() {
  try {
    await ensureAllTables()
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (!await hasMasterAccess(user)) return NextResponse.json({ campaigns: [], canCreate: false })
    const campaigns = await getCampaignsForMaster(user.sub)
    return NextResponse.json({ campaigns, canCreate: true, clans: CLANS.map(({ code, name }) => ({ code, name })), predatorTypes: PREDATOR_TYPES.map(({ code, name, source }) => ({ code, name, source })) })
  } catch {
    return NextResponse.json({ error: 'Não foi possível carregar as mesas.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (!await hasMasterAccess(user)) return NextResponse.json({ error: 'Somente o Narrador pode criar uma mesa.' }, { status: 403 })
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Dados da mesa inválidos.' }, { status: 400 })
    const { enabledClanCodes, enabledPredatorCodes, exceptionCodes } = readCampaignPolicy(body)
    const { name, theme, principios, averageXp, status, lastSessionAt, enableSchedulingCalendar } = readCampaignDetails(body)
    const campaign = await createCampaign(user.sub, { name, theme, principios, averageXp: Number.isFinite(averageXp) ? averageXp : null, status, lastSessionAt, enabledClanCodes })

    // Criar registro no calendário de marcação com valor padrão do checkbox
    await db.execute(sql`
      INSERT INTO campaign_scheduling_calendars (campaign_id, enabled)
      VALUES (${campaign.id}, ${enableSchedulingCalendar})
    `)
    await savePredatorTypeSettings(campaign.id, { enabledSources: ['COREBOOK'], enabledCodes: enabledPredatorCodes as PredatorTypeCode[], disabledCodes: PREDATOR_TYPE_CODES.filter(code => !enabledPredatorCodes.includes(code)) }, user.sub)

    const inviteToken = await createCampaignInvitation(user.sub, campaign.id, exceptionCodes)
    return NextResponse.json({ campaign, inviteToken }, { status: 201, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof CharacterCommandError ? error.message : 'Não foi possível criar a mesa.' }, { status: error instanceof CharacterCommandError ? error.status : 500 })
  }
}

function readCampaignPolicy(body: Record<string, unknown>) {
    const enabledClanCodes = body.enabledClanCodes ?? CLANS.map(clan => clan.code)
    const enabledPredatorCodes = body.enabledPredatorCodes ?? PREDATOR_TYPE_CODES.slice(0, 10)
    const exceptionCodes = validateCampaignExceptions(body.exceptionCodes ?? [])
    if (!Array.isArray(enabledClanCodes) || enabledClanCodes.length > CLANS.length || new Set(enabledClanCodes).size !== enabledClanCodes.length || enabledClanCodes.some(code => !CLANS.some(clan => clan.code === code)) || !Array.isArray(enabledPredatorCodes) || enabledPredatorCodes.length > PREDATOR_TYPE_CODES.length || new Set(enabledPredatorCodes).size !== enabledPredatorCodes.length || enabledPredatorCodes.some(code => !PREDATOR_TYPE_CODES.includes(code))) throw new CharacterCommandError(400, 'Clãs ou predações inválidos.')

  return { enabledClanCodes, enabledPredatorCodes, exceptionCodes }
}

function readCampaignDetails(body: Record<string, unknown>) {
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : null
    if (!name || name.length > 200) throw new CharacterCommandError(400, 'Nome da campanha é obrigatório e deve ter até 200 caracteres.')
    const theme = typeof body.theme === 'string' && body.theme.trim() ? body.theme.trim() : null
    const principios = typeof body.principios === 'string' && body.principios.trim() ? body.principios.trim() : null
    let averageXpValue
    if (typeof body.averageXp === 'number' && Number.isFinite(body.averageXp)) {
      averageXpValue = Math.trunc(body.averageXp)
    } else if (typeof body.averageXp === 'string' && body.averageXp.trim()) {
      averageXpValue = Number.parseInt(body.averageXp, 10)
    } else {
      averageXpValue = null
    }
    const averageXp = averageXpValue
    const status = typeof body.status === 'string' && body.status.trim() ? body.status.trim() : 'Ativa'
    const lastSessionAt = typeof body.lastSessionAt === 'string' && body.lastSessionAt.trim() ? body.lastSessionAt.trim() : null
    const enableSchedulingCalendar = typeof body.enableSchedulingCalendar === 'boolean' ? body.enableSchedulingCalendar : true
    if (lastSessionAt && !Number.isFinite(new Date(lastSessionAt).getTime())) throw new CharacterCommandError(400, 'Data do último encontro inválida.')


  return { name, theme, principios, averageXp, status, lastSessionAt, enableSchedulingCalendar }
}
