'use client'

import useSWR from 'swr'
import { useState } from 'react'
import { Eye } from 'lucide-react'
import { SessionHandouts } from '@/components/game-session/session-handouts'

type Visual={canManage:boolean;revision:number;handout:{id:string;title:string;fileName:string;contentType:string|null;url:string}|null}
type Files={handouts:{id:string;fileName:string;shareMode:'PRIVATE'|'ALL'|'SELECTED'}[]}
const read=async(url:string)=>{const response=await fetch(url,{cache:'no-store'}),data=await response.json();if(!response.ok)throw new Error(data.error??'Não foi possível carregar a Mesa Visual.');return data}
export function SessionVisual({campaignId,sessionId}:{campaignId:string;sessionId:string}){
  const endpoint=`/api/sessions/${sessionId}/visual`,{data,error,mutate}=useSWR<Visual>(endpoint,read,{refreshInterval:3000})
  const {data:files}=useSWR<Files>(`/api/campaigns/${campaignId}/handouts`,read,{refreshInterval:5000})
  const [feedback,setFeedback]=useState('')
  async function select(event:React.ChangeEvent<HTMLSelectElement>){const handoutId=event.target.value||null,response=await fetch(endpoint,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({handoutId,expectedRevision:data?.revision??0})});if(response.ok){setFeedback('');await mutate()}else{const result=await response.json();setFeedback(result.error??'Não foi possível atualizar a Mesa Visual.')}}
  return <div className="session-visual-content">
    {error&&<p role="alert" className="text-sm text-primary">{error.message}</p>}
    {feedback&&<p role="alert" className="text-sm text-primary">{feedback}</p>}
    {data?.canManage&&<label className="sheet-field"><span>Handout visível para toda a mesa</span><select className="select" value={data.handout?.id??''} onChange={event=>void select(event)}><option value="">Nenhum conteúdo selecionado</option>{files?.handouts.filter(file=>file.shareMode==='ALL').map(file=><option key={file.id} value={file.id}>{file.fileName}</option>)}</select></label>}
    {data?.handout? <div className="mt-4"><p className="text-sm">{data.handout.title}</p>{['image/jpeg','image/png','image/webp','image/gif'].includes(data.handout.contentType??'')?<img src={data.handout.url} alt={data.handout.title} className="mt-3 max-h-[65vh] w-full rounded border border-border object-contain"/>:<a className="button-ghost mt-3 inline-flex" href={`/api/handouts/${data.handout.id}/file`} target="_blank" rel="noopener noreferrer">Abrir {data.handout.fileName}</a>}</div>:<div className="session-visual-stage mt-4"><Eye className="size-8 text-primary" aria-hidden="true"/><p className="mt-3 text-sm text-muted-foreground">O Narrador ainda não selecionou um material compartilhado.</p></div>}
    {data?.canManage&&<details className="mt-5"><summary className="cursor-pointer text-sm text-muted-foreground">Gerenciar handouts</summary><SessionHandouts campaignId={campaignId}/></details>}
  </div>
}
