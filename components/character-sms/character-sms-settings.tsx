'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { MessageSquareText } from 'lucide-react'

const fetcher=async(url:string)=>{
 const r=await fetch(url,{cache:'no-store'})
 const body=await r.json().catch(()=>({}))
 if(!r.ok)throw new Error(body.error??'Não foi possível consultar a configuração.')
 return body as {enabled:boolean;isNarrator:boolean}
}
export function CharacterSmsSettings({campaignId}:Readonly<{campaignId:string}>) {
 const endpoint=`/api/campaigns/${campaignId}/settings/character-sms`
 const {data,error,mutate}=useSWR(endpoint,fetcher)
 const [saving,setSaving]=useState(false)
 const [message,setMessage]=useState('')
 async function toggle(){
   if(!data?.isNarrator||saving)return
   setSaving(true);setMessage('')
   try{
     const r=await fetch(endpoint,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:!data.enabled})})
     const next=await r.json().catch(()=>({}))
     if(!r.ok)throw new Error(next.error??'Não foi possível atualizar a configuração.')
     await mutate({...data,enabled:next.enabled},{revalidate:false})
     setMessage(next.enabled?'Mensagens entre personagens habilitadas.':'Mensagens desativadas. Histórico preservado para consulta.')
   }catch(e){setMessage(e instanceof Error?e.message:'Não foi possível salvar.')}finally{setSaving(false)}
 }
 return <section className="campaign-module-subsection sms-settings">
   <div className="sms-settings-title"><MessageSquareText className="size-6"/><div><p className="eyebrow">Comunicação da crônica</p><h3>Mensagens entre personagens (SMS)</h3></div></div>
   <p>Permite conversas persistentes entre personagens, inclusive fora da sessão. O Narrador pode acessar todas as conversas e responder como NPC ou outro personagem.</p>
   {error&&<p role="alert">{error instanceof Error?error.message:'Não foi possível consultar a configuração.'}</p>}
   {data&&<button type="button" role="switch" aria-checked={data.enabled} disabled={saving||!data.isNarrator} onClick={()=>void toggle()} className={data.enabled?'sms-toggle active':'sms-toggle'}>
     <span className="sms-toggle-track"><span/></span>
     {data.enabled?'SMS habilitado':'SMS desativado'}
   </button>}
   {!data&&!error&&<p>Carregando configuração...</p>}
   {message&&<p role="status">{message}</p>}
   <p className="sms-muted">Desativar bloqueia novos envios para todos, mas mantém o histórico em modo somente leitura. O chat LiveKit permanece independente.</p>
 </section>
}
