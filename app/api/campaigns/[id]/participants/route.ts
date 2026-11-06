import { NextResponse } from 'next/server'
import { profileActor,listCampaignParticipants } from '@/lib/user-profile'
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 try{
 const user=await profileActor(),{id}=await params
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))return NextResponse.json({error:'Mesa inválida.'},{status:400})
 return NextResponse.json({participants:await listCampaignParticipants(id,user.sub)})
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Acesso negado.'},{status:403})}
}
