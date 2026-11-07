import { get } from '@vercel/blob'
import { configurePrivateBlobToken } from '@/lib/private-blob-token'
import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { playerHandoutPath } from '@/lib/player-handouts'

export async function GET(_request: Request, context: {params: Promise<{id:string;handoutId:string}>}) {
  const session = await getSessionOrDev()
  if (!session?.user?.sub) return NextResponse.json({error:'Não autorizado.'},{status:401})
  const {id,handoutId} = await context.params
  try {
    const file = await playerHandoutPath(session.user.sub,id,handoutId)
    if (!file) return NextResponse.json({error:'Arquivo indisponível.'},{status:404})
    if (!configurePrivateBlobToken()) return NextResponse.json({error:'Armazenamento privado não configurado.',code:'BLOB_NOT_CONFIGURED'},{status:503})
    const blob = await get(file.pathname, {access:'private'})
    if (!blob || blob.statusCode !== 200 || !blob.stream) return NextResponse.json({error:'Arquivo não encontrado no armazenamento.'},{status:404})
    const safeName = file.file_name.replace(/[\r\n"\\]/g, '_').slice(0,200)
    return new NextResponse(blob.stream,{
      headers:{
        'Content-Type':file.content_type || 'application/octet-stream',
        'Content-Disposition':`attachment; filename="${safeName}"`,
        'X-Content-Type-Options':'nosniff',
        'Cache-Control':'private, no-store',
      },
    })
  } catch (cause) {
    const code = cause && typeof cause === 'object' && 'code' in cause ? String(cause.code) : 'unknown'
    console.error('player_handout_download_failed', { code })
    return NextResponse.json({error:'Não foi possível acessar o arquivo.',code:'HANDOUT_DOWNLOAD_UNAVAILABLE'},{status:503})
  }
}
