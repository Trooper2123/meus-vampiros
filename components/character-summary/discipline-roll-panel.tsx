'use client'
import { useRef, useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { AnimatedDice } from './animated-dice'

type Power={id:string;name:string;disciplineName:string;level:number;cost:string;dicePool:string;opposingPool:string;executable:boolean;reason:string;source:string}
type Data={revision:number;eligible:boolean;powers:Power[]}
type Command={powerId:string;difficulty:number;expectedRevision:number;idempotencyKey:string;sessionId?:string}
type RollResult={ok:boolean;powerName:string;pool:number;hungerAfter:number;rouseRolls:number[];bonusDice:number;result:{normalDice:number[];hungerDice:number[];difficulty:number;successes:number;outcome:'SUCCESS'|'CRITICAL'|'MESSY_CRITICAL'|'FAILURE'|'BESTIAL_FAILURE'}}
async function read(url:string):Promise<Data>{const r=await fetch(url,{cache:'no-store'});const body=await r.json();if(!r.ok)throw new Error(body.error??'Falha ao carregar poderes.');return body}
export function DisciplineRollPanel({characterId,sessionId}:Readonly<{characterId:string;sessionId?:string}>) {
 const endpoint=`/api/characters/${characterId}/discipline-rolls`
 const {data,error,mutate}=useSWR<Data>(endpoint,read)
 const {mutate:refresh}=useSWRConfig()
 const [powerId,setPowerId]=useState(''),[difficulty,setDifficulty]=useState('2'),[busy,setBusy]=useState(false),[feedback,setFeedback]=useState(''),[result,setResult]=useState<RollResult|null>(null)
 const [pendingCommand,setPendingCommand]=useState<Command|null>(null)
 const pending=useRef<Command|null>(null)
 const selected=data?.powers.find(power=>power.id===(powerId||data.powers[0]?.id))
 async function roll(){
  if(!data||!selected||busy)return
  if(!pending.current){pending.current={powerId:selected.id,difficulty:Number(difficulty),expectedRevision:data.revision,idempotencyKey:crypto.randomUUID(),...(sessionId?{sessionId}:{})};setPendingCommand(pending.current)}
  setBusy(true);setFeedback('')
  try{const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(pending.current)});const body=await response.json().catch(()=>null)
   if(!response.ok){if(response.status<500){pending.current=null;setPendingCommand(null);if(response.status===409)await mutate()};throw new Error(body?.error??'Falha na rolagem.')}
   setResult(body);pending.current=null;setPendingCommand(null)
   setFeedback('Rolagem de poder registrada.')
   await Promise.allSettled([mutate(),refresh(`/api/characters/${characterId}/rolls`),refresh(`/api/characters/${characterId}/resources`)])
  }catch(e){setPendingCommand(pending.current);setFeedback(e instanceof Error?e.message:'Falha de conexão. Reenvie a mesma operação.')}finally{setBusy(false)}
 }
 return <section className="border border-border bg-card p-4 sm:p-5" aria-label="Rolagens de Disciplinas">
  <p className="eyebrow">SG-010 · Poderes de Disciplinas</p>
  <h3 className="mt-2 font-serif text-xl">Rolagem de poderes</h3>
  {error&&<p role="alert" className="mt-2 text-sm">{error.message}</p>}
  {!data&&!error&&<p className="mt-3 text-sm">Carregando poderes adquiridos…</p>}
  {data&&<div className="mt-3 flex flex-col gap-3">
   {!data.powers.length&&<p className="text-sm text-muted-foreground">Nenhum poder adquirido foi identificado nesta ficha.</p>}
   {Boolean(data.powers.length)&&<label className="sheet-field"><span>Poder adquirido</span><select className="select" value={selected?.id??''} disabled={busy||Boolean(pendingCommand)} onChange={e=>{setPowerId(e.target.value);setResult(null)}}>{data.powers.map((power,index)=><option key={`${power.id}:${index}`} value={power.id}>{power.disciplineName} · {power.name} {power.executable?'':'(assistido)'}</option>)}</select></label>}
   {selected&&<div className="text-sm text-muted-foreground">
    <p>Parada: {selected.dicePool||'Não catalogada'} · Custo: {selected.cost||'Consultar regra'}</p>
    {selected.opposingPool&&selected.opposingPool!=='Not stated in a separate field'&&<p>Resistência: {selected.opposingPool}. Esta rolagem não determina automaticamente o resultado resistido.</p>}
    {selected.reason&&<p role="status">{selected.reason}</p>}
    <p className="text-xs">Fonte: {selected.source}</p>
   </div>}
   {selected?.executable&&<><label className="sheet-field"><span>Dificuldade conhecida</span><input className="input" type="number" min={1} max={50} step={1} value={difficulty} onChange={e=>{setDifficulty(e.target.value);pending.current=null;setPendingCommand(null)}} disabled={busy}/></label>
    <button type="button" className="button-primary self-start" disabled={!data.eligible||busy||!Number.isInteger(Number(difficulty))||Number(difficulty)<1||Number(difficulty)>50} onClick={()=>void roll()}>{busy?'Rolando…':'Rolar poder'}</button></>}
   {feedback&&<output role="status" aria-live="polite" className="text-sm">{feedback}</output>}
   {pendingCommand&&!busy&&<button className="button-ghost self-start" type="button" onClick={()=>void roll()}>Reenviar mesma rolagem</button>}
   {result&&<><p className="text-sm">Poder: {result.powerName} · Pool: {result.pool} · Bônus de Potência: {result.bonusDice} · Fome após Rouse: {result.hungerAfter}</p>
    {result.rouseRolls.length>0&&<p className="text-sm">Rouse: {result.rouseRolls.join(', ')}</p>}
    <AnimatedDice animate={true} normalDice={result.result.normalDice} hungerDice={result.result.hungerDice} outcome={result.result.outcome} successes={result.result.successes} difficulty={result.result.difficulty} visibility="PUBLIC"/>
   </>}
  </div>}
 </section>
}
