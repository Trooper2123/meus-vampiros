import {NextResponse} from 'next/server'
import {getSessionOrDev} from '@/lib/auth0'
import {ensureAllTables} from '@/lib/db'
import {duplicateCharacter, getCharacterAccessRecord} from '@/lib/characters'

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSessionOrDev()
        if (!session?.user?.sub) return NextResponse.json({error: 'Não autorizado.'}, {status: 401})
        const {id} = await context.params
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({error: 'Ficha inválida.'}, {status: 400})
        await ensureAllTables()
        const original = await getCharacterAccessRecord(id)
        if (!original) return NextResponse.json({error: 'Ficha não encontrada.'}, {status: 404})
        if (original.userId !== session.user.sub || original.characterType !== 'PLAYER_VAMPIRE') return NextResponse.json({error: 'Somente seu vampiro jogável pode ser duplicado.'}, {status: 403})
        const copy = await duplicateCharacter(id, session.user.sub)
        if (!copy) return NextResponse.json({error: 'Ficha não encontrada.'}, {status: 404})
        return NextResponse.json({id: copy.id}, {status: 201})
    } catch {
        return NextResponse.json({error: 'Não foi possível duplicar a ficha.'}, {status: 500})
    }
}
