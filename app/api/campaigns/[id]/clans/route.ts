import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { canManageCampaign } from '@/lib/auth/authorization'
import { getCharacterAccessRecord, getCharactersForCampaign } from '@/lib/characters'
import { CLANS } from '@/lib/vtm-v5/clans'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionOrDev()
    if (!session?.user?.sub) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    const { id } = await context.params
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({ error: 'Mesa inválida.' }, { status: 400 })
    if (!await canManageCampaign(session.user.sub, id)) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
    const records = await Promise.all((await getCharactersForCampaign(id)).map(character => getCharacterAccessRecord(character.id)))
    const used = new Set(records.filter(record => record?.campaignId === id).map(record => {
      let selectedClanCode
      if (record?.data.isThinBlood || record?.data.creationType === 'THIN_BLOOD') {
        selectedClanCode = 'THIN_BLOOD'
      } else if (record?.data.isCaitiff) {
        selectedClanCode = 'CAITIFF'
      } else {
        selectedClanCode = CLANS.find(clan => clan.name.toLocaleLowerCase('pt-BR') === String(record?.data.cla ?? '').trim().toLocaleLowerCase('pt-BR'))?.code
      }
      return record?.data.clanCode ?? (selectedClanCode)
    }))
    return NextResponse.json({ clans: CLANS.filter(clan => used.has(clan.code)) })
  } catch { return NextResponse.json({ error: 'Não foi possível carregar os clãs da mesa.' }, { status: 500 }) }
}
