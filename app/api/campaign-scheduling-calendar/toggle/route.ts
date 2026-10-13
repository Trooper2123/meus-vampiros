import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { toggleCampaignSchedulingCalendar, ensureAllTables } from '@/lib/db'
import { canManageCampaign } from '@/lib/auth/authorization'

export async function PATCH(request: Request) {
  try {
    const session = await getSessionOrDev()
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const campaignId = typeof body.campaignId === 'string' ? body.campaignId : ''
    const enabled = body.enabled

    if (!campaignId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(campaignId)) {
      return NextResponse.json({ error: 'ID da mesa inválido.' }, { status: 400 })
    }

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Valor de habilitação inválido.' }, { status: 400 })
    }

    if (!await canManageCampaign(session.user.sub, campaignId)) {
      return NextResponse.json({ error: 'Apenas o modelo.md pode alterar o calendário de marcação.' }, { status: 403 })
    }

    await ensureAllTables()

    const { enabled: newEnabled } = await toggleCampaignSchedulingCalendar(campaignId, enabled)

    return NextResponse.json({ enabled: newEnabled })
  } catch {
    return NextResponse.json({ error: 'Não foi possível atualizar o calendário de marcação.' }, { status: 500 })
  }
}
