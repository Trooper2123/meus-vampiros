import { NextResponse } from 'next/server'
import { profileActor,readUserProfile,saveUserProfile } from '@/lib/user-profile'
export async function GET(){
 try {const user=await profileActor();return NextResponse.json(await readUserProfile(user.sub))}
 catch {return NextResponse.json({error:'Não foi possível carregar o perfil.'},{status:401})}
}
export async function PUT(request:Request){
 try {
 const user=await profileActor()
 const body=await request.json()
 if(!body||typeof body.name!=='string'||typeof body.nickname!=='string'||typeof body.pronouns!=='string')return NextResponse.json({error:'Dados inválidos.'},{status:400})
 return NextResponse.json(await saveUserProfile(user.sub,{name:body.name,nickname:body.nickname,pronouns:body.pronouns}))
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Falha ao salvar.'},{status:400})}
}
