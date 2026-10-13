import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { canManageCampaign } from '@/lib/auth/authorization'
import { getPredatorTypeSettings, isPredatorTypeEnabled } from '@/lib/predator-types'
import { PREDATOR_TYPES, toMasterPredatorTypeDto } from '@/lib/vtm-v5/predator-types'

export async function GET(_request: Request, context: RouteContext<'/api/campaigns/[id]/predator-types'>) {
  const session = await getSessionOrDev()
  if (!session?.user?.sub) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  const { id } = await context.params
  if (!(await canManageCampaign(session.user.sub, id))) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  const settings = await getPredatorTypeSettings(id)
  return NextResponse.json({ settings, predatorTypes: PREDATOR_TYPES.map((definition) => toMasterPredatorTypeDto(definition, isPredatorTypeEnabled(definition.code, settings))) })
}
