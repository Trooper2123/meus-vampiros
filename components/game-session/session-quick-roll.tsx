'use client'
import { useState } from 'react'
import { Dices, Eye } from 'lucide-react'
import { AnimatedDice } from '@/components/character-summary/animated-dice'

type Response={ok:boolean;pool:number;hunger:number;visibility:'PUBLIC'|'SECRET';result:{normalDice:number[];hungerDice:number[];difficulty:number;successes:number;success:boolean;outcome:'SUCCESS'|'CRITICAL'|'MESSY_CRITICAL'|'FAILURE'|'BESTIAL_FAILURE'}}

export function SessionQuickRoll({sessionId,campaignId}:Readonly<{sessionId:string;campaignId:string}>){
 const [pool,setPool]=useState(5),[hunger,setHunger]=useState(0),[difficulty,setDifficulty]=useState(1),[visibility,setVisibility]=useState<'PUBLIC'|'SECRET'>('PUBLIC'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState<Response|null>(null)
 async function roll(){if(busy)return;setBusy(true);setError('');try{const response=await fetch(`/api/sessions/${sessionId}/rolls`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({campaignId,pool,hunger:Math.min(hunger,pool),difficulty,visibility,reason:'Rolagem rápida da sessão',idempotencyKey:crypto.randomUUID()})});const body=await response.json();if(!response.ok)throw new Error(body.error??'Não foi possível realizar a rolagem.');setResult(body)}catch(e){setError(e instanceof Error?e.message:'Não foi possível realizar a rolagem.')}finally{setBusy(false)}}
 return <div className="session-free-roll">
  <div><label>Pool de dados<input type="number" min="1" max="50" value={pool} onChange={e=>setPool(Math.max(1,Math.min(50,Number(e.target.value))))}/></label><label>Fome<input type="number" min="0" max={Math.min(5,pool)} value={hunger} onChange={e=>setHunger(Math.max(0,Math.min(5,pool,Number(e.target.value))))}/></label><label>Dificuldade<input type="number" min="1" max="50" value={difficulty} onChange={e=>setDifficulty(Math.max(1,Math.min(50,Number(e.target.value))))}/></label></div>
  <div className="session-free-roll-actions"><label className="session-roll-visibility"><span><Eye className="size-4" aria-hidden="true"/>Visível aos jogadores</span><input type="checkbox" role="switch" checked={visibility==='PUBLIC'} disabled={busy} aria-label="Visível aos jogadores" onChange={e=>setVisibility(e.target.checked?'PUBLIC':'SECRET')}/><span className="session-roll-switch-track" aria-hidden="true"><span/></span></label><button type="button" className="button-primary" disabled={busy} onClick={()=>void roll()}><Dices className="size-4"/>{busy?'Rolando…':'Rolar'}</button></div>
  {error&&<p role="alert">{error}</p>}{result&&<><AnimatedDice key={JSON.stringify(result.result)} animate normalDice={result.result.normalDice} hungerDice={result.result.hungerDice} outcome={result.result.outcome} successes={result.result.successes} difficulty={result.result.difficulty} visibility={result.visibility}/><p>Resultado: <strong>{result.result.successes} sucesso(s)</strong> · {result.result.outcome}</p></>}
 </div>
}
