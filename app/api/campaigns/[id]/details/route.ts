import { NextResponse } from 'next/server'
import { getSessionOrDev } from '@/lib/auth0'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const fields = ['name', 'theme', 'principios'] as const

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionOrDev()
  if (!session?.user?.sub) return NextResponse.json({error:'Não autorizado.'},{status:401})
  const {id} = await params
  if (!uuid.test(id)) return NextResponse.json({error:'Mesa inválida.'},{status:400})
  const origin = request.headers.get('origin')
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site') return NextResponse.json({error:'Origem não permitida.'},{status:403})
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return NextResponse.json({error:'Envie JSON.'},{status:415})
  const body = await request.json().catch(()=>null)
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k=>!fields.includes(k as typeof fields[number]))) return NextResponse.json({error:'Campos inválidos.'},{status:400})
  const input=body as Record<string,unknown>
  if (!fields.some(k=>Object.hasOwn(input,k))) return NextResponse.json({error:'Informe uma alteração.'},{status:400})
  const text=(key:string,max:number)=> {
    const value=input[key]
    if (value===undefined) return undefined
    if (value!==null && typeof value!=='string') throw new Error('Formato inválido.')
    const trimmed=(value??'') as string
    if (trimmed.trim().length>max) throw new Error('Texto muito longo.')
    return trimmed.trim()||null
  }
  let name:string|null|undefined,theme:string|null|undefined,principios:string|null|undefined
  try {
    name=text('name',200);theme=text('theme',2000);principios=text('principios',10000)
    if (name===null) throw new Error('O nome da mesa é obrigatório.')
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Dados inválidos.'},{status:422})}
  try {
    const result=await db.execute<{id:string;name:string;theme:string|null;principios:string|null}>(sql`
      UPDATE campaigns SET
        name=COALESCE(${name??null},name),
        theme=CASE WHEN ${theme===undefined} THEN theme ELSE ${theme??null} END,
        principios=CASE WHEN ${principios===undefined} THEN principios ELSE ${principios??null} END,
        updated_at=now()
      WHERE id=${id}::uuid AND master_user_id=${session.user.sub}
      RETURNING id,name,theme,principios
    `)
    if (!result.rows[0]) return NextResponse.json({error:'Mesa não encontrada.'},{status:404})
    return NextResponse.json({campaign:result.rows[0]},{headers:{'Cache-Control':'private, no-store'}})
  }catch{return NextResponse.json({error:'Não foi possível atualizar a mesa.'},{status:500})}
}
