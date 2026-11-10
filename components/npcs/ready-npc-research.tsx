'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import type { NpcData } from '@/lib/npc-domain'
import { NPC_CREATURES } from '@/lib/npc-options'

type Template = {
  id:string;name:string;originalName:string|null;official:boolean;source:string;
  sourceBook?:string;sourcePage?:number;category?:string;data:NpcData
}
type Response = {globalEnabled:boolean;templates:Template[]}
const fetcher=async(url:string):Promise<Response>=>{
  const response=await fetch(url,{cache:'no-store'})
  const body=await response.json()
  if(!response.ok)throw new Error(body.error??'Erro ao consultar NPCs.')
  return body
}

async function importNpc(template:Template,campaignId?:string):Promise<string>{
  const response=await fetch('/api/npcs',{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({
      data:structuredClone(template.data),
      templateId:template.id,
      campaignId:campaignId??null,
      idempotencyKey:crypto.randomUUID(),
    }),
  })
  const body=await response.json().catch(()=>null)
  if(!response.ok)throw new Error(body?.error??'Não foi possível criar o NPC.')
  return String(body.id)
}

export function ReadyNpcResearch({campaignId}:Readonly<{campaignId?:string}>) {
  const {data,error,isLoading}=useSWR<Response>(
    campaignId?`/api/npc-templates?campaignId=${encodeURIComponent(campaignId)}`:'/api/npc-templates',
    fetcher,
  )
  const [query,setQuery]=useState('')
  const [kind,setKind]=useState('ALL')
  const [source,setSource]=useState('ALL')
  const [creature,setCreature]=useState('ALL')
  const [selected,setSelected]=useState<string|null>(null)
  const [picked,setPicked]=useState<string[]>([])
  const [busy,setBusy]=useState(false)
  const [feedback,setFeedback]=useState('')
  const [imported,setImported]=useState<Record<string,string>>({})

  const sources=[...new Set((data?.templates??[]).map(t=>t.sourceBook).filter((value):value is string=>Boolean(value)))].sort()
  const templates=data?.templates??[]
  const results=templates.filter(t=>{
    const category=kind==='ALL'||(kind==='OFFICIAL'?t.official:kind==='CUSTOM'?!t.official:t.category===kind)
    const book=source==='ALL'||t.sourceBook===source
    const type=creature==='ALL'||t.data.creatureType===creature
    const text=[t.name,t.originalName,t.source,t.data.concept,t.data.creatureType,t.data.role]
      .some(value=>String(value??'').toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')))
    return category&&book&&type&&text
  })
  const active=results.find(t=>t.id===selected)
  const pickedTemplates=templates.filter(t=>picked.includes(t.id)&&!imported[t.id])
  const toggle=(id:string,enabled:boolean)=>setPicked(current=>enabled?[...new Set([...current,id])]:current.filter(item=>item!==id))

  async function add(entries:Template[]){
    if(!entries.length||busy)return
    setBusy(true);setFeedback('')
    let success=0
    for(const item of entries){
      if(imported[item.id])continue
      try{
        const id=await importNpc(item,campaignId)
        setImported(current=>({...current,[item.id]:id}))
        setPicked(current=>current.filter(value=>value!==item.id))
        success++
      }catch(cause){
        setFeedback(`${success} NPC(s) criado(s). Falha em ${item.name}: ${cause instanceof Error?cause.message:'Erro desconhecido'}`)
        setBusy(false)
        return
      }
    }
    setFeedback(`${success} NPC(s) criado(s) ${campaignId?'na mesa':'no catálogo pessoal'}. A ficha é editável e não altera o modelo de origem.`)
    setBusy(false)
  }

  return <section className="flex flex-col gap-4" aria-label="Pesquisar e importar NPCs de referência">
    <div className="flex flex-wrap gap-3">
      <label className="flex flex-col gap-1 text-sm flex-1 min-w-48">
        <span>Pesquisar nome, conceito, tipo ou fonte</span>
        <input className="sheet-field" type="search" maxLength={120} placeholder="Ex.: caçador, Hecata, Sabbat..." value={query} onChange={e=>setQuery(e.target.value)}/>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>Categoria</span>
        <select className="select" value={kind} onChange={e=>setKind(e.target.value)}>
          <option value="ALL">Todos</option>
          <option value="ANTAGONIST">Antagonistas</option>
          <option value="OFFICIAL">Referências dos livros</option>
          <option value="CUSTOM">Modelos personalizados</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>Livro</span>
        <select className="select" value={source} onChange={e=>setSource(e.target.value)}>
          <option value="ALL">Todos os livros</option>
          {sources.map(book=><option key={book} value={book}>{book}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>Criatura</span>
        <select className="select" value={creature} onChange={e=>setCreature(e.target.value)}>
          <option value="ALL">Todas</option>
          {Object.entries(NPC_CREATURES).map(([id,label])=><option key={id} value={id}>{label}</option>)}
        </select>
      </label>
    </div>

    {isLoading&&<p role="status" className="text-sm">Carregando referências…</p>}
    {error&&<p role="alert" className="text-sm text-red-400">{error.message}</p>}
    {data&&!data.globalEnabled&&<p className="text-sm text-muted-foreground">Catálogo global desativado nesta mesa. Habilite-o nas configurações para acessar os modelos dos livros; os modelos pessoais continuam disponíveis.</p>}
    {data&&<p className="text-xs text-muted-foreground">{results.length} modelo(s) encontrado(s). As referências da biblioteca são adaptações narrativas simplificadas, não transcrições mecânicas integrais.</p>}
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className="button-primary" disabled={busy||pickedTemplates.length===0} onClick={()=>void add(pickedTemplates)}>
        {busy?'Importando…':`Importar selecionados (${pickedTemplates.length})`}
      </button>
      {picked.length>0&&<button type="button" className="button-ghost" disabled={busy} onClick={()=>setPicked([])}>Limpar seleção</button>}
      <p className="text-xs text-muted-foreground">{campaignId?'Os escolhidos serão criados apenas nesta campanha.':'Os escolhidos serão criados no seu catálogo, sem vinculação automática a qualquer campanha.'}</p>
    </div>
    {feedback&&<output className="text-sm text-muted-foreground" role="status">{feedback}</output>}

    <div className="grid gap-3 md:grid-cols-2">
      {results.map(t=><article key={t.id} className="rounded-lg border border-border p-4 flex flex-col gap-2">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" disabled={busy||Boolean(imported[t.id])} checked={picked.includes(t.id)} onChange={event=>toggle(t.id,event.target.checked)} aria-label={`Selecionar ${t.name}`}/>
          <span className="min-w-0">
            <strong className="font-serif text-lg">{t.name}</strong>
            {t.originalName&&<span className="block text-xs text-muted-foreground" lang="en">{t.originalName}</span>}
          </span>
        </label>
        <p className="text-xs text-muted-foreground">{t.sourceBook?`${t.sourceBook} · p. ${t.sourcePage}`:t.source}</p>
        <p className="text-sm">{t.data.concept||'Referência narrativa editável.'}</p>
        <p className="text-xs text-muted-foreground">{NPC_CREATURES[t.data.creatureType]} · {t.data.sheetType==='FULL'?'Ficha completa':t.data.sheetType==='INTERMEDIATE'?'Ficha intermediária':'Ficha simples'} · Ameaça adaptada {t.data.threatLevel??'a definir'}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="button-ghost" aria-expanded={active?.id===t.id} onClick={()=>setSelected(current=>current===t.id?null:t.id)}>
            {active?.id===t.id?'Ocultar referência':'Ver referência'}
          </button>
          {imported[t.id]
            ? <Link className="button-ghost" href={`/npcs/${imported[t.id]}`}>Abrir NPC criado</Link>
            : <button type="button" className="button-primary" disabled={busy} onClick={()=>void add([t])}>Adicionar NPC</button>}
        </div>
        {active?.id===t.id&&<div className="border-t border-border pt-3 text-sm">
          <p>{t.source}</p>
          <p className="mt-2 text-xs text-muted-foreground">O modelo original é preservado. Revise pools, disciplinas, recursos e outros dados na ficha antes de usar na sessão.</p>
        </div>}
      </article>)}
    </div>
    {data&&results.length===0&&<p className="text-sm text-muted-foreground">Nenhum modelo corresponde aos filtros.</p>}
  </section>
}
