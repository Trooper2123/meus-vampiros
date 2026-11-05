import { smsActor,smsBody,smsFailure,smsResponse } from '@/lib/character-sms-http'
import { setSmsSettings,smsSettings } from '@/lib/character-sms'
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  try{return smsResponse(await smsSettings((await params).id,await smsActor(request)))}catch(e){return smsFailure(e)}
}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  try{return smsResponse(await setSmsSettings((await params).id,await smsActor(request,true),(await smsBody(request)).enabled))}catch(e){return smsFailure(e)}
}
