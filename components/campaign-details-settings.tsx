'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function CampaignDetailsSettings({campaignId,name,theme,principios}:Readonly<{campaignId:string;name:string;theme:string|null;principios:string|null}>) {
 const router=useRouter()
 const [title,setTitle]=useState(name)
 const [currentTheme,setTheme]=useState(theme??'')
 const [tenets,setTenets]=useState(principios??'')
 const [pending,setPending]=useState(false)
 const [error,setError]=useState('')
 const [saved,setSaved]=useState(false)
 async function save(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();setPending(true);setError('');setSaved(false)
  try{
   const response=await fetch(`/api/campaigns/${campaignId}/details`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:title,theme:currentTheme,principios:tenets})})
   const data=await response.json()
   if(!response.ok)throw new Error(data.error??'Não foi possível salvar.')
   setSaved(true);router.refresh()
  }catch(e){setError(e instanceof Error?e.message:'Erro ao salvar.')}finally{setPending(false)}
 }
 return <form onSubmit={save} className="campaign-module-subsection flex flex-col gap-4">
  <div><p className="eyebrow">Identidade da crônica</p><h3 className="font-serif text-xl">Informações da mesa</h3></div>
  <label className="sheet-field"><span>Nome da mesa</span><input required maxLength={200} value={title} onChange={e=>setTitle(e.target.value)}/></label>
  <label className="sheet-field"><span>Conceito / tema</span><textarea rows={3} maxLength={2000} value={currentTheme} onChange={e=>setTheme(e.target.value)}/></label>
  <label className="sheet-field"><span>Resumo e princípios da crônica</span><textarea rows={5} maxLength={10000} value={tenets} onChange={e=>setTenets(e.target.value)}/></label>
  {error&&<p role="alert" className="text-destructive">{error}</p>}
  {saved&&<p role="status">Informações atualizadas.</p>}
  <button className="button-primary self-start" type="submit" disabled={pending}>{pending?'Salvando...':'Salvar informações'}</button>
 </form>
}
