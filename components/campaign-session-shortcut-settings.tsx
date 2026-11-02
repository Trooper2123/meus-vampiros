'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { DEFAULT_SHORTCUTS, SHORTCUT_CODES, SHORTCUT_LABELS, type ShortcutCode } from '@/lib/session-shortcut-options'

const fetcher=async(url:string):Promise<{shortcuts:ShortcutCode[]}>=>{
 const response=await fetch(url)
 const data=await response.json()
 if(!response.ok) throw new Error(data.error??'Não foi possível carregar os atalhos.')
 return data
}
export function CampaignSessionShortcutSettings({campaignId}:Readonly<{campaignId:string}>){
 const url=`/api/campaigns/${campaignId}/session-shortcuts`
 const {data,error,mutate}=useSWR<{shortcuts:ShortcutCode[]}>(url,fetcher)
 const [selected,setSelected]=useState<ShortcutCode[]>(DEFAULT_SHORTCUTS)
 const [saving,setSaving]=useState(false)
 const [message,setMessage]=useState('')
 useEffect(()=>{if(data)setSelected(data.shortcuts)},[data])
 const dirty=JSON.stringify(selected)!==JSON.stringify(data?.shortcuts??DEFAULT_SHORTCUTS)
 const toggle=(code:ShortcutCode)=>setSelected(current=>current.includes(code)?current.filter(item=>item!==code):[...current,code])
 const move=(index:number,step:number)=>setSelected(current=>{const next=[...current];const target=index+step;if(target<0||target>=next.length)return current;[next[index],next[target]]=[next[target],next[index]];return next})
 async function save(){
  setSaving(true);setMessage('')
  try {
   const response=await fetch(url,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({shortcuts:selected})})
   const result=await response.json()
   if(!response.ok)throw new Error(result.error??'Não foi possível salvar os atalhos.')
   await mutate(result,{revalidate:false});setMessage('Atalhos salvos. O Hub da Sessão será atualizado automaticamente.')
  }catch(e){setMessage(e instanceof Error?e.message:'Falha ao salvar atalhos.')}finally{setSaving(false)}
 }
 return <section className="campaign-module-subsection campaign-shortcuts-settings">
  <p className="eyebrow">Personalização do Narrador</p><h3 className="font-serif text-xl">Acesso rápido da Sessão</h3>
  <p className="mt-2 text-sm text-muted-foreground">Marque os módulos desejados. Use as setas para definir a ordem de exibição no Hub.</p>
  {error&&<p role="alert" className="mt-3 text-primary">{error.message}</p>}
  {!data&&!error&&<output className="mt-3 block text-sm">Carregando opções...</output>}
  {data&&<><div className="campaign-shortcuts-options">
   {SHORTCUT_CODES.map(code=><label key={code}><input type="checkbox" checked={selected.includes(code)} disabled={saving} onChange={()=>toggle(code)}/><span>{SHORTCUT_LABELS[code]}</span></label>)}
  </div>
  <div className="campaign-shortcuts-order"><p className="eyebrow">Ordem de exibição</p>
   {selected.length===0&&<p className="text-sm text-muted-foreground">Nenhum atalho selecionado.</p>}
   {selected.map((code,index)=><div key={code}><span>{index+1}. {SHORTCUT_LABELS[code]}</span><div><button type="button" disabled={saving||index===0} onClick={()=>move(index,-1)} aria-label={`Subir ${SHORTCUT_LABELS[code]}`}>↑</button><button type="button" disabled={saving||index===selected.length-1} onClick={()=>move(index,1)} aria-label={`Descer ${SHORTCUT_LABELS[code]}`}>↓</button></div></div>)}
  </div>
  <div className="mt-5 flex flex-wrap items-center gap-3"><button type="button" className="button-primary" disabled={saving||!dirty} onClick={()=>void save()}>{saving?'Salvando...':'Salvar atalhos'}</button><button type="button" className="button-ghost" disabled={saving} onClick={()=>{setSelected([...DEFAULT_SHORTCUTS]);setMessage('')}}>Restaurar seleção padrão</button></div>
  {message&&<p role="status" className="mt-3 text-sm">{message}</p>}</>}
 </section>
}
