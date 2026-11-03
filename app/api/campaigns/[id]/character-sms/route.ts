import { smsActor,smsBody,smsFailure,smsResponse } from '@/lib/character-sms-http'
import { smsStart,smsThreads } from '@/lib/character-sms'

type Ctx={params:Promise<{id:string}>}
export async function GET(request:Request,{params}:Ctx){
  try{return smsResponse(await smsThreads((await params).id,await smsActor(request)))}catch(e){return smsFailure(e)}
}
export async function POST(request:Request,{params}:Ctx){
  try{return smsResponse(await smsStart((await params).id,await smsActor(request,true),await smsBody(request)),201)}catch(e){return smsFailure(e)}
}
