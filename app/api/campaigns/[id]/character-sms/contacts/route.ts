import { smsActor,smsFailure,smsResponse } from '@/lib/character-sms-http'
import { smsContacts } from '@/lib/character-sms'
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  try{return smsResponse(await smsContacts((await params).id,await smsActor(request)))}catch(e){return smsFailure(e)}
}
