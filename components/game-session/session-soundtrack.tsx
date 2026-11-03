'use client'
import { useEffect, useRef, useState } from 'react'
import useSWR from 'swr'

type Mood='DREAD'|'NOIR'|'RITUAL'
type State={mood:Mood;playing:boolean;startedAt:string|null;revision:number;canManage:boolean;active:boolean}
type Command={mood:Mood;playing:boolean;expectedRevision:number;idempotencyKey:string}
type AudioEngine={ctx:AudioContext;gain:GainNode|null;stop:()=>void}
const notes:Record<Mood,number[]>={DREAD:[164.81,196,246.94,329.63],NOIR:[146.83,174.61,220,261.63],RITUAL:[110,130.81,164.81,196]}
const captions:Record<Mood,string>={DREAD:'Tensão da noite',NOIR:'Mistério urbano',RITUAL:'Ritual sombrio'}
async function load(url:string):Promise<State>{const r=await fetch(url,{cache:'no-store'});const body=await r.json();if(!r.ok)throw new Error(body.error??'Falha ao carregar áudio.');return body}

/** Composição ambiente original: osciladores locais, sem mídias comerciais ou streaming. */
function beginSoundscape(ctx:AudioContext,mood:Mood,startedAt:string|null,volume:number) {
  const master=ctx.createGain()
  master.gain.setValueAtTime(volume*0.16,ctx.currentTime)
  const lowpass=ctx.createBiquadFilter()
  lowpass.type='lowpass';lowpass.frequency.value=850
  lowpass.connect(master);master.connect(ctx.destination)
  const voices:OscillatorNode[]=[]
  for(const [i,f] of notes[mood].entries()){
    const osc=ctx.createOscillator()
    osc.type=i===0?'sine':'triangle'
    osc.frequency.value=f*(i===0?0.5:1)
    const gain=ctx.createGain();gain.gain.value=i===0?0.24:0.035
    osc.connect(gain);gain.connect(lowpass);osc.start();voices.push(osc)
  }
  let stopped=false
  function chime(){
    if(stopped)return
    const offset=startedAt?Math.max(0,Date.now()-Date.parse(startedAt)):0
    const step=Math.floor(offset/1800)%8
    const f=notes[mood][[0,1,2,1,3,2,1,0][step]]
    const osc=ctx.createOscillator()
    const g=ctx.createGain()
    osc.type='sine';osc.frequency.value=f*2
    g.gain.setValueAtTime(0,ctx.currentTime)
    g.gain.linearRampToValueAtTime(0.12,ctx.currentTime+0.08)
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+1.4)
    osc.connect(g);g.connect(lowpass);osc.start();osc.stop(ctx.currentTime+1.45)
  }
  chime()
  const timer=window.setInterval(chime,1800)
  return {gain:master,stop:()=>{
    stopped=true;window.clearInterval(timer)
    master.gain.setTargetAtTime(0,ctx.currentTime,0.03)
    window.setTimeout(()=>{for(const osc of voices){try{osc.stop();osc.disconnect()}catch{/* já parado */}}lowpass.disconnect();master.disconnect()},200)
  }}
}

export function SessionSoundtrack({sessionId}:Readonly<{sessionId:string}>) {
 const url=`/api/sessions/${sessionId}/soundtrack`
 const {data,error,mutate}=useSWR<State>(url,load,{refreshInterval:5000})
 const [enabled,setEnabled]=useState(false)
 const [volume,setVolume]=useState(45)
 const [muted,setMuted]=useState(false)
 const [busy,setBusy]=useState(false)
 const [feedback,setFeedback]=useState('')
 const audio=useRef<AudioEngine|null>(null)
 const pending=useRef<Command|null>(null)

 useEffect(()=>{
  const engine=audio.current
  if(!engine)return
  engine.stop()
  engine.gain=null
  if(!enabled||!data?.playing||!data.active)return
  const playback=beginSoundscape(engine.ctx,data.mood,data.startedAt,muted?0:volume/100)
  engine.gain=playback.gain
  engine.stop=playback.stop
  return ()=>{playback.stop();engine.gain=null;engine.stop=()=>{}}
 // volume updates through a separate effect to avoid restarting playback
 },[enabled,data?.mood,data?.startedAt,data?.playing,data?.active])

 useEffect(()=>{
  if(audio.current?.gain)audio.current.gain.gain.setTargetAtTime((muted?0:volume/100)*0.16,audio.current.ctx.currentTime,0.05)
 },[volume,muted])
 useEffect(()=>()=>{const engine=audio.current;if(engine){engine.stop();void engine.ctx.close();audio.current=null}},[])

 async function activate() {
  try{
   const ctx=new AudioContext();await ctx.resume()
   audio.current={ctx,gain:null,stop:()=>{}}
   setEnabled(true);setFeedback('Áudio local ativado. O volume é individual.')
  }catch{setFeedback('O navegador não permitiu iniciar o áudio. Ative o som manualmente.')}
 }
 async function send(mood:Mood,playing:boolean) {
  if(!data||busy)return
  if(!pending.current)pending.current={mood,playing,expectedRevision:data.revision,idempotencyKey:crypto.randomUUID()}
  setBusy(true);setFeedback('')
  try{
   const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(pending.current)})
   const body=await r.json().catch(()=>null)
   if(!r.ok){if(r.status<500)pending.current=null;throw new Error(body?.error??'Falha ao alterar trilha.')}
   pending.current=null;await mutate();setFeedback('Estado da trilha atualizado para os participantes.')
  }catch(e){setFeedback(e instanceof Error?e.message:'Falha de conexão, use reenviar.')}finally{setBusy(false)}
 }
 return <section className="border border-border bg-card p-4 sm:p-5" aria-label="Trilha sonora da sessão">
  <p className="eyebrow">Ambiência sonora · SG-011</p><h3 className="mt-2 font-serif text-xl">Trilha sonora da sessão</h3>
  <p className="mt-2 text-sm text-muted-foreground">Composições ambientes originais geradas no navegador. O Narrador controla o clima; cada pessoa controla seu próprio volume.</p>
  {error&&<p role="alert">{error.message}</p>}
  {data&&<div className="mt-3 flex flex-col gap-3 text-sm">
   <p>Ambiente atual: {captions[data.mood]} · {data.playing?'Em reprodução':'Pausado'}</p>
   {!enabled&&<button className="button-primary self-start" type="button" onClick={()=>void activate()}>Ativar som neste dispositivo</button>}
   {enabled&&<><label className="flex flex-col gap-1">Volume pessoal: {volume}%<input type="range" min={0} max={100} step={1} value={volume} onChange={e=>setVolume(Number(e.target.value))}/></label>
    <label className="flex gap-2 items-center"><input type="checkbox" checked={muted} onChange={e=>setMuted(e.target.checked)}/>Silenciar neste dispositivo</label></>}
   {data.canManage&&<div className="flex flex-wrap items-end gap-3">
    <label className="flex flex-col gap-1">Ambiente
     <select className="select" value={data.mood} disabled={busy||Boolean(pending.current)} onChange={e=>void send(e.target.value as Mood,data.playing)}>
      {(Object.keys(notes) as Mood[]).map(mood=><option key={mood} value={mood}>{captions[mood]}</option>)}
     </select>
    </label>
    <button className="button-primary" type="button" disabled={!data.active||busy} onClick={()=>void send(data.mood,!data.playing)}>{data.playing?'Pausar para todos':'Reproduzir para todos'}</button>
   </div>}
   {pending.current&&!busy&&<button className="button-ghost self-start" type="button" onClick={()=>void send(pending.current!.mood,pending.current!.playing)}>Reenviar mesmo comando</button>}
   {feedback&&<output role="status" aria-live="polite">{feedback}</output>}
  </div>}
 </section>
}
