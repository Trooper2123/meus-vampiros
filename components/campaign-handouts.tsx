'use client'

import { useEffect, useState } from 'react'
import { upload } from '@vercel/blob/client'

type Recipient={actor_id:string;name:string}
type Handout={id:string;title:string;fileName:string;contentType:string|null;sizeBytes:number;shareMode:'PRIVATE'|'ALL'|'SELECTED';revision:number;recipientActorIds?:string[];url:string}
type Listing={canManage:boolean;recipients:Recipient[];handouts:Handout[]}
const json=async(response:Response)=>{const body=await response.json();if(!response.ok)throw new Error(body.error??'Falha na operação.');return body}

export function CampaignHandouts({campaignId}:Readonly<{campaignId:string}>) {
 const [data,setData]=useState<Listing|null>(null)
 const [error,setError]=useState('')
 const [busy,setBusy]=useState(false)
 const [file,setFile]=useState<File|null>(null)
 const [mode,setMode]=useState<'PRIVATE'|'ALL'|'SELECTED'>('PRIVATE')
 const [selected,setSelected]=useState<string[]>([])
 const [search,setSearch]=useState('')
 const [drafts,setDrafts]=useState<Record<string,{mode:'PRIVATE'|'ALL'|'SELECTED';ids:string[]}>>({})
 const endpoint=`/api/campaigns/${campaignId}/handouts`
 async function refresh(){try{setData(await json(await fetch(endpoint,{cache:'no-store'})))}catch(e){setError(e instanceof Error?e.message:'Falha ao carregar arquivos.')}}
 useEffect(()=>{void refresh()},[campaignId])
 async function perform(action:()=>Promise<void>){setBusy(true);setError('');try{await action();await refresh()}catch(e){setError(e instanceof Error?e.message:'Operação não concluída.')}finally{setBusy(false)}}
 async function send(){
  if(!file)return
  await perform(async()=>{
   if(file.size>100*1024*1024)throw new Error('Arquivo acima de 100 MB.')
   const key=crypto.randomUUID()
   const prepared=await json(await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'PREPARE',fileName:file.name,idempotencyKey:key})}))
   await upload(prepared.pathname,file,{access:'private',handleUploadUrl:`${endpoint}/upload`,clientPayload:JSON.stringify({uploadId:prepared.uploadId}),contentType:file.type||'application/octet-stream',multipart:file.size>5*1024*1024})
   await json(await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'CONFIRM',uploadId:prepared.uploadId})}))
   if(mode!=='PRIVATE')await json(await fetch(`/api/handouts/${prepared.uploadId}/share`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({shareMode:mode,recipientActorIds:mode==='SELECTED'?selected:[],expectedRevision:0})}))
   setFile(null);setSelected([]);setMode('PRIVATE')
  })
 }
 const recipients=data?.recipients.filter(r=>r.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))??[]
 return <section className="flex flex-col gap-5">
  {error&&<p role="alert" className="text-sm text-red-400">{error}</p>}
  {data?.canManage&&<div className="rounded-lg border border-border p-4 flex flex-col gap-3">
   <h3 className="font-serif text-xl">Importar handout</h3>
   <label className="flex flex-col gap-1 text-sm">Arquivo (até 100 MB)<input type="file" disabled={busy} onChange={e=>setFile(e.target.files?.[0]??null)} /></label>
   <label className="flex flex-col gap-1 text-sm">Compartilhar com
    <select className="select" value={mode} onChange={e=>setMode(e.target.value as typeof mode)}><option value="PRIVATE">Somente narrador</option><option value="ALL">Todos os jogadores</option><option value="SELECTED">Jogadores selecionados</option></select>
   </label>
   {mode==='SELECTED'&&<div className="flex flex-col gap-2"><input className="sheet-field" placeholder="Buscar jogador" value={search} onChange={e=>setSearch(e.target.value)}/><div className="max-h-48 overflow-auto flex flex-col gap-2">{recipients.map(r=><label key={r.actor_id} className="flex gap-2 text-sm"><input type="checkbox" checked={selected.includes(r.actor_id)} onChange={e=>setSelected(prev=>e.target.checked?[...prev,r.actor_id]:prev.filter(x=>x!==r.actor_id))}/>{r.name}</label>)}</div></div>}
   <button className="button-primary" type="button" disabled={busy||!file||(mode==='SELECTED'&&!selected.length)} onClick={()=>void send()}>{busy?'Enviando...':'Importar e compartilhar'}</button>
  </div>}
  <div className="flex flex-col gap-3"><h3 className="font-serif text-xl">{data?.canManage?'Biblioteca da mesa':'Arquivos compartilhados'}</h3>
  {!data&&<p>Carregando handouts...</p>}
  {data?.handouts.length===0&&<p className="text-sm text-muted-foreground">Nenhum arquivo disponível.</p>}
  {data?.handouts.map(h=>{const draft=drafts[h.id]??{mode:h.shareMode,ids:h.recipientActorIds??[]};return <article key={h.id} className="rounded-lg border border-border p-3 flex flex-col gap-2">
   <div className="flex flex-wrap items-center justify-between gap-2"><div><strong>{h.title}</strong><p className="text-xs text-muted-foreground">{h.fileName} · {(h.sizeBytes/1024/1024).toFixed(2)} MB</p></div><a className="button-ghost" href={h.url}>Baixar arquivo</a></div>
   {data.canManage&&<div className="flex flex-col gap-2"><label className="text-sm">Visibilidade <select className="select" value={draft.mode} onChange={e=>setDrafts(p=>({...p,[h.id]:{...draft,mode:e.target.value as typeof draft.mode}}))}><option value="PRIVATE">Somente narrador</option><option value="ALL">Todos</option><option value="SELECTED">Selecionados</option></select></label>
    {draft.mode==='SELECTED'&&<div className="flex flex-wrap gap-3">{data.recipients.map(r=><label key={r.actor_id} className="flex items-center gap-1 text-xs"><input type="checkbox" checked={draft.ids.includes(r.actor_id)} onChange={e=>setDrafts(p=>({...p,[h.id]:{...draft,ids:e.target.checked?[...draft.ids,r.actor_id]:draft.ids.filter(x=>x!==r.actor_id)}}))}/>{r.name}</label>)}</div>}
    <div className="flex flex-wrap gap-2"><button type="button" className="button-ghost" disabled={busy||(draft.mode==='SELECTED'&&!draft.ids.length)} onClick={()=>void perform(async()=>{await json(await fetch(`/api/handouts/${h.id}/share`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({shareMode:draft.mode,recipientActorIds:draft.mode==='SELECTED'?draft.ids:[],expectedRevision:h.revision})}))})}>Salvar compartilhamento</button>
    <button type="button" className="button-ghost" disabled={busy} onClick={()=>{if(confirm(`Excluir ${h.fileName}?`))void perform(async()=>{await json(await fetch(`/api/handouts/${h.id}`,{method:'DELETE'}))})}}>Excluir</button></div>
   </div>}
  </article>})}
  </div>
 </section>
}
