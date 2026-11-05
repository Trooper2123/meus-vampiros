'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import type { NpcData } from '@/lib/npc-domain'

type Template={id:string;name:string;originalName:string|null;official:boolean;source:string;data:NpcData}
type Response={globalEnabled:boolean;templates:Template[]}
const fetcher=async(url:string):Promise<Response>=>{const r=await fetch(url,{cache:'no-store'});const b=await r.json();if(!r.ok)throw new Error(b.error??'Erro ao consultar NPCs.');return b}

export function ReadyNpcResearch({campaignId}:Readonly<{campaignId?:string}>) {
 const {data,error,isLoading}=useSWR<Response>(campaignId?`/api/npc-templates?campaignId=${encodeURIComponent(campaignId)}`:'/api/npc-templates',fetcher)
 const [query,setQuery]=useState('')
 const [kind,setKind]=useState('ALL')
 const [selected,setSelected]=useState<string|null>(null)
 const results=(data?.templates??[]).filter(t=>(kind==='ALL'||(kind==='OFFICIAL'?t.official:!t.official))&&[t.name,t.originalName,t.source,t.data.creatureType,t.data.role].some(v=>String(v??'').toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))))
 const active=results.find(t=>t.id===selected)
 return <section className="flex flex-col gap-4">
  <div className="flex flex-wrap gap-3">
   <label className="flex flex-col gap-1 text-sm flex-1 min-w-48"><span>Pesquisar por nome, tipo, papel ou fonte</span><input className="sheet-field" type="search" placeholder="Ex.: vampiro, antagonista, Chicago..." value={query} onChange={e=>setQuery(e.target.value)}/></label>
   <label className="flex flex-col gap-1 text-sm"><span>Origem</span><select className="select" value={kind} onChange={e=>setKind(e.target.value)}><option value="ALL">Todos os modelos</option><option value="OFFICIAL">Referências oficiais</option><option value="CUSTOM">Personalizados</option></select></label>
  </div>
  {isLoading&&<p className="text-sm">Carregando modelos de NPCs...</p>}
  {error&&<p role="alert" className="text-sm text-red-400">{error.message}</p>}
  {data&&!data.globalEnabled&&<p className="text-sm text-muted-foreground">O catálogo global está desativado nesta campanha; modelos pessoais disponíveis continuam visíveis.</p>}
  {data&&<p className="text-xs text-muted-foreground">{results.length} modelo(s) encontrado(s). Os modelos são referências reutilizáveis; a ficha de uma instância criada aparece na seção NPCs.</p>}
  <div className="grid gap-3 md:grid-cols-2">{results.map(t=><article key={t.id} className="rounded-lg border border-border p-4 flex flex-col gap-2">
   <div><strong className="font-serif text-lg">{t.name}</strong>{t.originalName&&<p className="text-xs text-muted-foreground" lang="en">{t.originalName}</p>}</div>
   <p className="text-xs text-muted-foreground">{t.official?'Referência oficial':'Modelo personalizado'} · {t.source}</p>
   <p className="text-sm">Ficha {t.data.sheetType==='FULL'?'completa':t.data.sheetType==='INTERMEDIATE'?'intermediária':'simples'} · {t.data.creatureType} · {t.data.role}</p>
   <button type="button" className="button-ghost self-start" aria-expanded={active?.id===t.id} onClick={()=>setSelected(current=>current===t.id?null:t.id)}> {active?.id===t.id?'Ocultar detalhes':'Ver ficha de referência'}</button>
   {active?.id===t.id&&<div className="border-t border-border pt-3 flex flex-col gap-2">
    <dl className="grid grid-cols-2 gap-2 text-sm">
     <div><dt className="text-muted-foreground">Ameaça</dt><dd>{String(t.data.threatLevel??'Não definida')}</dd></div>
     <div><dt className="text-muted-foreground">Tipo</dt><dd>{t.data.sheetType}</dd></div>
    </dl>
    <p className="text-xs text-muted-foreground">Dados do modelo original. Campos mecânicos ausentes não são preenchidos automaticamente.</p>
    <Link className="button-primary self-start" href={campaignId?`/campaigns/${campaignId}?view=npcs`:'/npcs'}>Criar NPC a partir deste modelo</Link>
    <p className="text-xs text-muted-foreground">Na criação, escolha este nome no campo “Modelo inicial”.</p>
   </div>}
  </article>)}</div>
  {data&&results.length===0&&<p className="text-sm text-muted-foreground">Nenhum modelo corresponde à pesquisa.</p>}
 </section>
}
