'use client'
import { useRef, useState } from 'react'
import useSWR from 'swr'
type Settings = {executionMode:'PLAYER_ROLLS'|'NARRATOR_FORCES';canManage:boolean;night:{id:string;night_number:number;in_game_date:string;execution_mode:string}|null}
const read=async(url:string):Promise<Settings>=>{const r=await fetch(url,{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error??'Falha ao carregar.');return d}
export function CampaignAwakeSettings({campaignId}:Readonly<{campaignId:string}>) {
 const url=`/api/campaigns/${campaignId}/awake-settings`
 const {data,error,mutate}=useSWR<Settings>(url,read)
 const [date,setDate]=useState('')
 const [busy,setBusy]=useState(false)
 const [feedback,setFeedback]=useState('')
 const pending=useRef<{action:string;inGameDate:string;idempotencyKey:string}|null>(null)
 async function send(body: object) {
  setBusy(true);setFeedback('')
  try{const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const result=await r.json();if(!r.ok)throw new Error(result.error??'Erro ao salvar.');pending.current=null;await mutate();setFeedback('Configuração/noite registrada com sucesso.')}catch(e){setFeedback(e instanceof Error?e.message:'Falha de conexão.')}finally{setBusy(false)}
 }
 const prepare=()=>{if(!pending.current)pending.current={action:'PREPARE_NIGHT',inGameDate:date,idempotencyKey:crypto.randomUUID()};void send(pending.current)}
 return <section className="archive-character-card p-5 sm:p-6" aria-labelledby="campaign-awake-title">
  <p className="eyebrow">Crônica / Despertar</p>
  <h3 id="campaign-awake-title" className="mt-2 font-serif text-2xl">Execução do Despertar</h3>
  <p className="mt-2 text-sm text-muted-foreground">Defina quem conduz os despertares e prepare a próxima noite da crônica.</p>
  {error&&<p role="alert" className="mt-4 text-sm text-primary">{error.message}</p>}
  {data&&<div className="mt-5 flex flex-col gap-4">
   <label className="flex flex-col gap-1 text-sm">Responsável pela rolagem
    <select className="select" value={data.executionMode} disabled={!data.canManage||busy} onChange={e=>void send({action:'SET_MODE',executionMode:e.target.value})}>
     <option value="PLAYER_ROLLS">Jogadores realizam seus despertares</option>
     <option value="NARRATOR_FORCES">Narrador força os despertares</option>
    </select>
   </label>
   <p className="text-sm leading-6 text-muted-foreground">A escolha vale para novas noites. Noites já criadas conservam sua modalidade.</p>
   {data.night&&<p className="border-t border-border pt-3 text-sm">Noite atual: {data.night.night_number} · {data.night.in_game_date} · {data.night.execution_mode==='PLAYER_ROLLS'?'Jogadores':'Narrador'}</p>}
   {data.canManage&&data.executionMode==='PLAYER_ROLLS'&&<div className="flex flex-wrap gap-3 items-end">
    <label className="flex flex-col gap-1 text-sm">Data na crônica<input className="input" type="date" value={date} onChange={e=>{setDate(e.target.value);pending.current=null}} disabled={busy}/></label>
    <button className="button-primary" type="button" disabled={busy||!date} onClick={prepare}>Preparar nova noite dos jogadores</button>
   </div>}
   {feedback&&<output role="status">{feedback}</output>}
  </div>}
 </section>
}
