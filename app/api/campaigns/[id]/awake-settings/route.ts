import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { ensureAllTables } from '@/lib/db'
import { CharacterCommandError } from '@/lib/character-commands'
import { readCampaignAwakeSettings, saveCampaignAwakeSettings, preparePlayerAwakeNight } from '@/lib/campaign-awake-settings'
type Context = { params: Promise<{ id: string }> }
function failure(error: unknown) { return NextResponse.json({error: error instanceof CharacterCommandError ? error.message : 'Falha na configuração do despertar.'},{status: error instanceof CharacterCommandError ? error.status : 500}) }
export async function GET(_request: Request, context: Context) {
  try { const auth = await getSessionOrDev(); if (!auth?.user?.sub) return NextResponse.json({error:'Não autorizado.'},{status:401});await ensureAllTables();return NextResponse.json(await readCampaignAwakeSettings(auth.user.sub,(await context.params).id),{headers:{'Cache-Control':'no-store'}}) } catch(error){return failure(error)}
}
export async function POST(request: Request, context: Context) {
  try {
    const auth = await getSessionOrDev()
    if (!auth?.user?.sub) return NextResponse.json({error:'Não autorizado.'},{status:401})
    const origin=request.headers.get('origin')
    if(origin && origin!==new URL(request.url).origin) return NextResponse.json({error:'Origem inválida.'},{status:403})
    const body:unknown=await request.json().catch(()=>null)
    if(!body||typeof body!=='object'||Array.isArray(body)) return NextResponse.json({error:'Operação inválida.'},{status:400})
    const data=body as Record<string,unknown>
    if(Object.keys(data).some(key=>!['action','executionMode','inGameDate','idempotencyKey'].includes(key))) return NextResponse.json({error:'Operação inválida.'},{status:400})
    await ensureAllTables()
    const campaignId=(await context.params).id
    if(data.action==='SET_MODE') return NextResponse.json(await saveCampaignAwakeSettings(auth.user.sub,campaignId,data.executionMode))
    if(data.action==='PREPARE_NIGHT') return NextResponse.json(await preparePlayerAwakeNight(auth.user.sub,campaignId,data.inGameDate,data.idempotencyKey))
    return NextResponse.json({error:'Ação inválida.'},{status:400})
  }catch(error){return failure(error)}
}
