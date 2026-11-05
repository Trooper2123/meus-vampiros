'use client'

import { useState } from 'react'
import useSWR from 'swr'

type Image={id:string;title:string;fileName:string;contentType:string|null;url:string}
type Board={active:Image|null;images:Image[];canManage:boolean;revision:number}
const read=async(url:string):Promise<Board>=>{const response=await fetch(url,{cache:'no-store'});const data=await response.json();if(!response.ok)throw new Error(data.error??'Falha ao consultar mesa visual.');return data}
export function SessionVisualBoard({campaignId,compact=false}:Readonly<{campaignId:string;compact?:boolean}>) {
 const endpoint=`/api/campaigns/${campaignId}/visual`
 const {data,error,mutate}=useSWR<Board>(endpoint,read,{refreshInterval:3000})
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 const [search,setSearch]=useState('')
 const [recent,setRecent]=useState<string[]>([])
 async function choose(id:string|null){
  if(!data)return
  setBusy(true);setMessage('')
  try{
   const response=await fetch(endpoint,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({handoutId:id,expectedRevision:data.revision})})
   const result=await response.json()
   if(!response.ok)throw new Error(result.error??'Não foi possível alterar a imagem.')
   setRecent(prev=>id?[id,...prev.filter(value=>value!==id)].slice(0,12):prev)
   await mutate()
  }catch(e){setMessage(e instanceof Error?e.message:'Falha ao compartilhar imagem.');await mutate()}finally{setBusy(false)}
 }
 const images=(data?.images??[]).filter(image=>[image.title,image.fileName].some(v=>v.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))))
 const ordered=[...images].sort((a,b)=>recent.indexOf(a.id)===-1?1:recent.indexOf(b.id)===-1?-1:recent.indexOf(a.id)-recent.indexOf(b.id))
 return <div className="flex flex-col gap-3">
  {error&&<p role="alert" className="text-red-400 text-sm">{error.message}</p>}
  {message&&<p role="alert" className="text-red-400 text-sm">{message}</p>}
  <div className={compact?'rounded-lg border border-border min-h-40 overflow-hidden flex items-center justify-center':'rounded-lg border border-border min-h-80 overflow-hidden flex items-center justify-center'} style={{background:'#100e11'}}>
   {data?.active?<div className="w-full flex flex-col items-center gap-2 p-2"><img key={data.active.id} src={data.active.url} alt={data.active.title} className={compact?'max-h-52 max-w-full object-contain':'max-h-[65dvh] max-w-full object-contain'}/><p className="text-xs text-muted-foreground">{data.active.title}</p></div>:<p className="p-5 text-sm text-muted-foreground text-center">{data?'Nenhuma imagem compartilhada.':'Carregando mesa visual...'}</p>}
  </div>
  {data?.canManage&&<div className="rounded-lg border border-border p-3 flex flex-col gap-3">
   <div className="flex flex-wrap justify-between items-center gap-2"><strong>Catálogo de imagens da mesa</strong><button type="button" className="button-ghost" disabled={busy||!data.active} onClick={()=>void choose(null)}>Limpar mesa</button></div>
   <p className="text-xs text-muted-foreground">Imagens já importadas em Handouts. Compartilhe o arquivo com todos os jogadores antes de exibi-lo.</p>
   <input className="sheet-field" type="search" placeholder="Pesquisar mapas e imagens" value={search} onChange={e=>setSearch(e.target.value)}/>
   <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{ordered.map(image=><button type="button" key={image.id} disabled={busy} aria-pressed={data.active?.id===image.id} className="border border-border rounded p-2 flex flex-col gap-1 text-left hover:border-primary" onClick={()=>void choose(image.id)}><img src={image.url} alt="" loading="lazy" className="w-full h-20 object-contain"/><span className="text-xs break-words">{image.title}</span></button>)}</div>
   {!images.length&&<p className="text-sm text-muted-foreground">Nenhuma imagem na biblioteca. Importe PNG, JPG ou WebP em Handouts.</p>}
  </div>}
 </div>
}
