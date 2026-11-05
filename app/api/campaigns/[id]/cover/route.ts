import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { CharacterCommandError } from '@/lib/character-commands'
import { noteUuid } from '@/lib/notes'
import { campaignCoverAccess, readCampaignCover, replaceCampaignCover, removeCampaignCover, sanitizeCampaignCover } from '@/lib/campaign-cover'

export const runtime = 'nodejs'
type Context = { params: Promise<{ id: string }> }
const response = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } })
function fail(error: unknown) {
  return response({ error: error instanceof CharacterCommandError ? error.message : 'Não foi possível gerenciar a capa.' }, error instanceof CharacterCommandError ? error.status : 500)
}
async function access(request: Request, context: Context, manage: boolean) {
  const user = (await getSessionOrDev())?.user?.sub
  if (!user) throw new CharacterCommandError(401, 'Não autorizado.')
  const { id } = await context.params
  if (!noteUuid(id)) throw new CharacterCommandError(400, 'Mesa inválida.')
  if (manage) {
    const origin = request.headers.get('origin')
    if ((origin && origin !== new URL(request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site') throw new CharacterCommandError(403, 'Origem não permitida.')
  }
  const row = await campaignCoverAccess(user, id, manage)
  return { user, id, row }
}
export async function GET(request: Request, context: Context) {
  try {
    const { row } = await access(request, context, false)
    if (!row.cover_storage_key) return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'private, no-store' } })
    const bytes = await readCampaignCover(row.cover_storage_key)
    if (!bytes) return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'private, no-store' } })
    return new NextResponse(new Uint8Array(bytes), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', Vary: 'Cookie' } })
  } catch (error) { return fail(error) }
}
export async function PUT(request: Request, context: Context) {
  try {
    const { user, id } = await access(request, context, true)
    const bytes = await sanitizeCampaignCover(request)
    await replaceCampaignCover(user, id, bytes)
    return response({ ok: true })
  } catch (error) { return fail(error) }
}
export async function DELETE(request: Request, context: Context) {
  try {
    const { user, id } = await access(request, context, true)
    await removeCampaignCover(user, id)
    return response({ ok: true })
  } catch (error) { return fail(error) }
}
