import { smsActor,smsBody,smsFailure,smsResponse } from '@/lib/character-sms-http'
import { smsMessages,smsRead,smsSend } from '@/lib/character-sms'
type Ctx={params:Promise<{id:string;threadId:string}>}
export async function GET(request:Request,{params}:Ctx){
  try{const {id,threadId}=await params;return smsResponse(await smsMessages(id,await smsActor(request),threadId,new URL(request.url).searchParams.get('cursor')??undefined,new URL(request.url).searchParams.get('view')==='player'?'player':undefined))}catch(e){return smsFailure(e)}
}
export async function POST(request:Request,{params}:Ctx){
  try{const {id,threadId}=await params;return smsResponse(await smsSend(id,await smsActor(request,true),threadId,await smsBody(request),new URL(request.url).searchParams.get('view')==='player'?'player':undefined),201)}catch(e){return smsFailure(e)}
}
export async function PATCH(request:Request,{params}:Ctx){
  try{const {id,threadId}=await params;await smsBody(request);return smsResponse(await smsRead(id,await smsActor(request,true),threadId,new URL(request.url).searchParams.get('view')==='player'?'player':undefined))}catch(e){return smsFailure(e)}
}
