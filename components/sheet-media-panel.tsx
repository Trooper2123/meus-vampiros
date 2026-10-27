'use client'

import { useEffect,useState } from 'react'
import useSWR from 'swr'
import { upload } from '@vercel/blob/client'
import { SHEET_VISIBILITIES } from '@/lib/npc-options'
import type { SubjectType } from '@/lib/sheet-access'

export type SheetMediaView={id:string;title:string;description:string;category:string;isPortrait:boolean;positionX:number;positionY:number;visibility:keyof typeof SHEET_VISIBILITIES;revision:number;url:string;canEdit:boolean;global?:boolean}
type Metadata=Pick<SheetMediaView,'title'|'description'|'category'|'isPortrait'|'positionX'|'positionY'|'visibility'>
const metadata=(item:SheetMediaView):Metadata=>({title:item.title,description:item.description,category:item.category,isPortrait:item.isPortrait,positionX:item.positionX,positionY:item.positionY,visibility:item.visibility})
async function json(url:string,body?:object,method='POST'){const response=await fetch(url,body?{method,headers:{'content-type':'application/json'},body:JSON.stringify(body),cache:'no-store'}:{cache:'no-store'});const result=await response.json();if(!response.ok){ throw new Error(result.error??'Não foi possível carregar as imagens.'); }return result}
export function SheetMediaPanel({subjectType,subjectId,campaignId,compact=false}:Readonly<{subjectType:SubjectType;subjectId:string;campaignId?:string;compact?:boolean}>){
  const url=campaignId?`/api/campaigns/${campaignId}/sheets?subjectType=${subjectType}&subjectId=${subjectId}`:`/api/sheet-media?subjectType=${subjectType}&subjectId=${subjectId}`
  const {data,error,mutate}=useSWR<{media:SheetMediaView[];portrait:SheetMediaView|null;canEdit:boolean;isNarrator?:boolean;storageConfigured:boolean}>(url,json,{revalidateOnFocus:false})
  const [file,setFile]=useState<File|null>(null),[preview,setPreview]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[editing,setEditing]=useState<SheetMediaView|null>(null),[pending,setPending]=useState(''),[global,setGlobal]=useState(!campaignId)
  const [form,setForm]=useState<Metadata>({title:'',description:'',category:'',isPortrait:!campaignId,positionX:50,positionY:50,visibility:'OWNER_ONLY'})
  useEffect(()=>{if(!file){setPreview('');return}const objectUrl=URL.createObjectURL(file);setPreview(objectUrl);return()=>URL.revokeObjectURL(objectUrl)},[file])
  function reset(){setFile(null);setEditing(null);setPending('');setForm({title:'',description:'',category:'',isPortrait:!campaignId,positionX:50,positionY:50,visibility:'OWNER_ONLY'})}
  async function submit(event:React.FormEvent){event.preventDefault();setBusy(true);setMessage('');try{
    if(editing){await json(`/api/sheet-media/${editing.id}`,{action:'EDIT',expectedRevision:editing.revision,data:form},'PATCH')}
    else {
      await saveImageUpload()
    }
    reset();await mutate();setMessage('Imagem salva.')
  }catch(error){setMessage(error instanceof Error?error.message:'Não foi possível salvar a imagem.')}finally{setBusy(false)}

async function saveImageUpload() {
    let uploadId=pending
    if(!uploadId) {
      if(!file) { throw new Error('Escolha uma imagem.')} 
      if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024) { throw new Error('Envie JPEG, PNG ou WebP de até 5 MB.')} 
      const prepared=await json('/api/sheet-media',{ action: 'PREPARE',subjectType,subjectId,campaignId: global? null:campaignId,data: { ...form,isPortrait: global? true:form.isPortrait } })
      await upload(prepared.pathname,file,{ access: 'private',handleUploadUrl: '/api/sheet-media/upload',clientPayload: JSON.stringify({ uploadId: prepared.uploadId }),contentType: file.type })
      uploadId=prepared.uploadId; setPending(uploadId)
    }
    await json('/api/sheet-media',{ action: 'CONFIRM',uploadId })
  }
}
  async function remove(item:SheetMediaView){if(!window.confirm('Remover esta imagem? O acesso será revogado.')){ return; }setBusy(true);try{await json(`/api/sheet-media/${item.id}`,{expectedRevision:item.revision},'DELETE');await mutate();setMessage('Imagem removida.')}catch(error){setMessage(error instanceof Error?error.message:'Não foi possível remover a imagem.')}finally{setBusy(false)}}
  const portrait=data?.portrait
  return <section className="flex flex-col gap-4" aria-label={compact?'Retrato da ficha':'Galeria da ficha'}>
    {portrait?<div className="flex flex-col gap-3 sm:flex-row sm:items-center"><img src={portrait.url} alt={portrait.title} className="h-48 w-48 border border-border object-cover" style={{objectPosition:`${portrait.positionX}% ${portrait.positionY}%`}}/><div><p className="font-serif text-xl">{portrait.title}</p>{portrait.global&&campaignId&&<p className="text-xs text-muted-foreground">Retrato global da ficha</p>}</div></div>:<div className="flex h-36 w-36 items-center justify-center border border-border bg-card text-sm text-muted-foreground">Sem retrato</div>}
    {error&&<p role="alert" className="text-sm text-primary">{error.message}</p>}{message&&<output  className="block text-sm text-muted-foreground">{message}</output>}
    {!compact&&<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data?.media.map(item=><article key={item.id} className="flex flex-col gap-3 border border-border bg-card p-4"><a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${item.title} em nova guia`}><img loading="lazy" src={item.url} alt={item.title} className="h-48 w-full object-contain"/></a><h3 className="font-serif text-xl">{item.title}</h3><p className="whitespace-pre-wrap text-sm">{item.description}</p><p className="text-xs text-muted-foreground">{SHEET_VISIBILITIES[item.visibility]}{item.category&&` · ${item.category}`}</p>{item.canEdit&&<div className="flex flex-wrap gap-3"><button type="button" className="button-ghost" disabled={busy} onClick={()=>{setEditing(item);setForm(metadata(item));setFile(null);setGlobal(item.global??false)}}>Editar imagem</button><button type="button" className="button-ghost" disabled={busy} onClick={()=>void remove(item)}>Remover imagem</button></div>}</article>)}</div>}
    {data?.canEdit&&<details open={!!editing||!!pending} className="border border-border p-4"><summary className="cursor-pointer font-serif text-lg">{mediaFormTitle(!!editing,compact)}</summary><form className="mt-4 flex flex-col gap-4" onSubmit={submit} aria-busy={busy}>
      {!data.storageConfigured&&<p className="text-sm text-muted-foreground">O envio de imagens ainda não foi habilitado neste ambiente.</p>}
      {!editing&&<><label className="sheet-field"><span>Imagem JPEG, PNG ou WebP · até 5 MB</span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy||!!pending||!data.storageConfigured} onChange={e=>{const next=e.target.files?.[0]??null;setFile(next);if(next&&!form.title){ setForm({...form,title:next.name.replace(/\.[^.]+$/,'')}) }}}/></label>{campaignId&&<label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={global} disabled={busy||!!pending} onChange={e=>{setGlobal(e.target.checked);if(e.target.checked){ setForm({...form,isPortrait:true,visibility:'OWNER_ONLY'}) }}}/>Usar como retrato global da ficha</label>}</>}
      <label className="sheet-field"><span>Título</span><input required maxLength={120} disabled={busy||!!pending} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label className="sheet-field"><span>Descrição</span><textarea maxLength={2000} disabled={busy||!!pending} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><label className="sheet-field"><span>Categoria</span><input maxLength={120} disabled={busy||!!pending} value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/></label>
      <label className="sheet-field"><span>Visibilidade</span><select className="select" disabled={busy||!!pending} value={form.visibility} onChange={e=>setForm({...form,visibility:e.target.value as Metadata['visibility']})}>{Object.entries(SHEET_VISIBILITIES).filter(([key])=>global?['OWNER_ONLY','CAMPAIGN_VISIBLE'].includes(key):key!=='GM_ONLY'||data.isNarrator).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      {!global&&<label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={form.isPortrait} disabled={busy||!!pending} onChange={e=>setForm({...form,isPortrait:e.target.checked})}/>Usar como retrato nesta mesa</label>}
      {(form.isPortrait||global)&&<><p className="text-sm text-muted-foreground">Enquadramento do retrato: mova a imagem sem alterar o arquivo original.</p>{(preview||editing?.url)&&<img src={preview||editing!.url} alt="Prévia do enquadramento" className="h-48 w-48 border border-border object-cover" style={{objectPosition:`${form.positionX}% ${form.positionY}%`}}/>}{(['positionX','positionY'] as const).map((axis,i)=><label className="sheet-field" key={axis}><span>{i===0?'Posição horizontal':'Posição vertical'} · {form[axis]}%</span><input type="range" min={0} max={100} disabled={busy||!!pending} value={form[axis]} onChange={e=>setForm({...form,[axis]:Number(e.target.value)})}/></label>)}</>}
      <div className="flex flex-wrap gap-3"><button type="submit" className="button-primary" disabled={busy||!data.storageConfigured&&!editing}>{mediaSubmitLabel(busy,!!pending,!!editing)}</button><button className="button-ghost" type="button" disabled={busy} onClick={reset}>Cancelar edição</button></div>
    </form></details>}
  </section>
}

function mediaFormTitle(editing:boolean,compact:boolean){
  if(editing){ return 'Editar metadados e enquadramento' }
  if(compact){ return 'Enviar ou substituir retrato' }
  return 'Adicionar imagem'
}
function mediaSubmitLabel(busy:boolean,pending:boolean,editing:boolean){
  if(busy){ return 'Salvando…' }
  if(pending){ return 'Confirmar envio novamente' }
  if(editing){ return 'Salvar alterações' }
  return 'Enviar imagem'
}
