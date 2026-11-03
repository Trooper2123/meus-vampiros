'use client'

import Link from 'next/link'
import { useState, useRef } from 'react'
import useSWR from 'swr'
import { BookOpen, Castle, ChevronDown, ChevronRight, Crown, FolderKanban, Handshake, Home, Landmark, MapPin, Plus, ScrollText, Shield, Sparkles, Target, Users, X } from 'lucide-react'

type CoterieType={id:string;code:string;name:string;description:string;source:string;suggestedMechanics:Record<string,unknown>}
type Member={id:string;characterId:string;name:string;role:string|null}
type Background={id:string;code:string;dots:number;description:string;source:string}
type Advantage={id:string;catalogItemId:string|null;customName:string|null;dots:number;kind:'ADVANTAGE'|'FLAW';notes:string}
type HavenTrait={id:string;havenId:string;catalogItemId:string|null;customName:string|null;kind:'MERIT'|'FLAW';dots:number}
type Haven={id:string;name:string;description:string;location:string;isPrimary:boolean;traits:HavenTrait[]}
type Boon={id:string;type:'BOON_OWED_TO_COTERIE'|'BOON_OWED_BY_COTERIE'|'DEBT';counterparty:string;level:number;description:string;status:string}
type Goal={id:string;title:string;description:string;status:string;projectId:string|null}
type Coterie={
 id:string;name:string;typeId:string|null;typeName:string|null;chronicle:string|null;city:string|null;description:string
 hasDomain:boolean;domainDescription:string;chasse:number;lien:number;portillon:number;domainResonance:string;chronicleTenets:string;revision:number
 members:Member[];backgrounds:Background[];advantages:Advantage[];havens:Haven[];boons:Boon[];goals:Goal[]
 projectCounts:{total:number;active:number}|null
}
type Data={canManage:boolean;archived:boolean;coteries:Coterie[];types:CoterieType[];roster:{id:string;name:string}[]}
type Action='CREATE'|'UPDATE'|'ADD_MEMBER'|'REMOVE_MEMBER'|'ADD_BACKGROUND'|'ADD_ADVANTAGE'|'ADD_HAVEN'|'ADD_HAVEN_TRAIT'|'ADD_BOON'|'ADD_GOAL'|'GOAL_TO_PROJECT'
type FormState=Record<string,string>
const backgrounds=['ALLY','CONTACTS','HAVEN','HERD','INFLUENCE','MASK','MAWLA','RESOURCES','RETAINERS','STATUS','ADVERSARY','ENEMY'] as const
const boons:{value:Boon['type'];label:string}[]=[
 {value:'BOON_OWED_TO_COTERIE',label:'Favor devido à Coterie'},
 {value:'BOON_OWED_BY_COTERIE',label:'Favor devido pela Coterie'},
 {value:'DEBT',label:'Dívida'}
]
const defaultForm:FormState={name:'',typeId:'',description:'',chronicle:'',city:'',hasDomain:'false',domainDescription:'',chasse:'0',lien:'0',portillon:'0',domainResonance:'',chronicleTenets:'',characterId:'',role:'',backgroundCode:'CONTACTS',dots:'1',kind:'ADVANTAGE',customName:'',catalogItemId:'',havenId:'',location:'',isPrimary:'false',counterparty:'',level:'1',title:'',goalId:'',source:'CUSTOM'}
const get=async(url:string):Promise<Data>=>{
 const response=await fetch(url,{cache:'no-store'})
 const data=await response.json().catch(()=>null)
 if(!response.ok)throw new Error(data?.error??'Não foi possível consultar as Coteries.')
 return data
}
function Dots({value}:Readonly<{value:number}>){
 return <span aria-label={value+' de 5 pontos'} className="inline-flex gap-1"><span className="sr-only">{value} de 5 pontos</span>{[0,1,2,3,4].map(dot=><span aria-hidden="true" key={dot} className={'size-2 rounded-full border '+(dot<value?'border-rose-400 bg-rose-500':'border-muted-foreground/50 bg-transparent')}/>)}</span>
}
function Section({title,icon:Icon,children,action}:Readonly<{title:string;icon:typeof Users;children:React.ReactNode;action?:React.ReactNode}>){
 return <section className="rounded-xl border border-border/80 bg-card/80 p-4 sm:p-5">
  <div className="mb-4 flex items-center justify-between gap-3 border-b border-border/60 pb-3"><h3 className="flex items-center gap-2 font-serif text-lg sm:text-xl"><Icon aria-hidden="true" className="size-5 text-rose-500"/>{title}</h3>{action}</div>{children}
 </section>
}
function Empty({children}:Readonly<{children:React.ReactNode}>){return <p className="text-sm text-muted-foreground">{children}</p>}
export function CampaignCoteriePanel({campaignId}:Readonly<{campaignId:string}>){
 const endpoint='/api/campaigns/'+campaignId+'/coteries'
 const {data,error,isLoading,mutate}=useSWR<Data>(endpoint,get,{refreshInterval:30000})
 const [selectedId,setSelectedId]=useState<string|null>(null)
 const [action,setAction]=useState<Action|null>(null)
 const [form,setForm]=useState<FormState>({...defaultForm})
 const [busy,setBusy]=useState(false)
 const [feedback,setFeedback]=useState('')
 const pending=useRef<{action:Action;idempotencyKey:string;[key:string]:unknown}|null>(null)
 const selected=data?.coteries.find(co=>co.id===selectedId)??data?.coteries[0]??null
 const canManage=Boolean(data?.canManage&&!data.archived)
 const canPropose=Boolean(selected&&!data?.archived)
 const set=(name:string,value:string)=>{setForm(previous=>({...previous,[name]:value}));pending.current=null}
 const openForm=(next:Action,co?:Coterie,preselect?:FormState)=>{
  setAction(next);setFeedback('');pending.current=null
  setForm({...defaultForm,...(next==='UPDATE'&&co?{
    name:co.name,typeId:co.typeId??'',description:co.description,chronicle:co.chronicle??'',city:co.city??'',
    hasDomain:String(co.hasDomain),domainDescription:co.domainDescription,chasse:String(co.chasse),lien:String(co.lien),portillon:String(co.portillon),
    domainResonance:co.domainResonance,chronicleTenets:co.chronicleTenets
  }:{}),...preselect})
 }
 const submit=async(targetAction:Action,payload:Record<string,unknown>,co?:Coterie)=>{
  if(busy||data?.archived)return
  if(!pending.current)pending.current={action:targetAction,idempotencyKey:crypto.randomUUID(),...(targetAction==='CREATE'?{}:{coterieId:co?.id}),...(targetAction==='UPDATE'?{expectedRevision:co?.revision}:{}),...payload}
  setBusy(true);setFeedback('')
  try{
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(pending.current)})
   const result=await response.json().catch(()=>null)
   if(!response.ok){if(response.status<500)pending.current=null;throw new Error(result?.error??'Operação rejeitada.')}
   pending.current=null;setAction(null);await mutate()
   if(targetAction==='CREATE')setSelectedId(result.coterieId)
   setFeedback(targetAction==='GOAL_TO_PROJECT'?'Projeto da Coterie criado como rascunho.':'Alteração registrada na Coterie.')
  }catch(e){setFeedback(e instanceof Error?e.message:'Falha de conexão. Reenvie a operação com a mesma chave.')}
  finally{setBusy(false)}
 }
 const submitForm=()=>{
  if(!action)return
  const payload:Record<string,unknown>={}
  if(action==='CREATE'||action==='UPDATE')Object.assign(payload,{name:form.name,typeId:form.typeId||null,description:form.description,chronicle:form.chronicle,city:form.city})
  if(action==='UPDATE')Object.assign(payload,{hasDomain:form.hasDomain==='true',domainDescription:form.domainDescription,chasse:Number(form.chasse),lien:Number(form.lien),portillon:Number(form.portillon),domainResonance:form.domainResonance,chronicleTenets:form.chronicleTenets})
  if(action==='ADD_MEMBER')Object.assign(payload,{characterId:form.characterId,role:form.role})
  if(action==='ADD_BACKGROUND')Object.assign(payload,{backgroundCode:form.backgroundCode,dots:Number(form.dots),description:form.description,source:form.source})
  if(action==='ADD_ADVANTAGE')Object.assign(payload,{kind:form.kind,customName:form.customName,catalogItemId:form.catalogItemId,dots:Number(form.dots),description:form.description})
  if(action==='ADD_HAVEN')Object.assign(payload,{name:form.name,description:form.description,location:form.location,isPrimary:form.isPrimary==='true'})
  if(action==='ADD_HAVEN_TRAIT')Object.assign(payload,{havenId:form.havenId,kind:form.kind,catalogItemId:form.catalogItemId,customName:form.customName,dots:Number(form.dots)})
  if(action==='ADD_BOON')Object.assign(payload,{kind:form.kind,counterparty:form.counterparty,level:Number(form.level),description:form.description})
  if(action==='ADD_GOAL')Object.assign(payload,{title:form.title,description:form.description})
  void submit(action,payload,selected??undefined)
 }
 const button=(label:string,next:Action,preselect?:FormState)=>canManage?<button type="button" className="button-ghost text-xs" onClick={()=>openForm(next,selected??undefined,preselect)}><Plus className="size-3.5"/>{label}</button>:null
 const isEditorAction=action!==null&&action!=='GOAL_TO_PROJECT'
 return <div className="space-y-5" aria-label="Página de Coterie">
  <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-5">
   <div className="flex items-center gap-3"><Users className="size-7 text-rose-500" aria-hidden="true"/><div><p className="eyebrow">SPEC-SESSION-011 · Coterie</p><h2 className="font-serif text-2xl sm:text-3xl">Coterie da Mesa</h2><p className="mt-1 text-sm text-muted-foreground">Personagens, domínio, refúgios, recursos e objetivos compartilhados.</p></div></div>
   {canManage&&<button type="button" className="button-primary" onClick={()=>openForm('CREATE')}><Plus className="size-4"/>Nova Coterie</button>}
  </header>
  {error&&<p role="alert" className="rounded-lg border border-red-800/60 p-3 text-sm text-red-300">{error.message}</p>}
  {isLoading&&<p className="py-8 text-center text-muted-foreground">Consultando Coteries da campanha…</p>}
  {feedback&&<p role="status" aria-live="polite" className="rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm">{feedback}</p>}
  {data?.archived&&<p className="text-sm text-amber-200">Mesa arquivada: as Coteries permanecem disponíveis somente para consulta.</p>}
  {data&&data.coteries.length>1&&<div className="flex flex-wrap gap-2" role="group" aria-label="Escolher Coterie">{data.coteries.map(co=><button key={co.id} type="button" aria-pressed={selected?.id===co.id} onClick={()=>{setSelectedId(co.id);setAction(null);setFeedback('')}} className={'rounded-lg border px-4 py-2 text-sm '+(selected?.id===co.id?'border-rose-600 bg-red-950/55 text-rose-100':'border-border bg-card text-muted-foreground hover:text-foreground')}>{co.name}</button>)}</div>}
  {data&&!selected&&!isEditorAction&&<div className="rounded-xl border border-border bg-card/70 p-10 text-center"><Users className="mx-auto mb-3 size-10 text-rose-600"/><p>{canManage?'Nenhuma Coterie foi criada nesta campanha.':'Você ainda não integra uma Coterie desta mesa.'}</p>{canManage&&<button type="button" className="button-primary mt-4" onClick={()=>openForm('CREATE')}>Criar Coterie</button>}</div>}
  {selected&&<>
   <div className="rounded-xl border border-red-900/60 bg-gradient-to-br from-card via-card to-red-950/30 p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">{selected.typeName??'Tipo não definido'} · {selected.city||'Cidade não informada'}</p><h3 className="mt-2 font-serif text-2xl sm:text-3xl">{selected.name}</h3><p className="mt-2 max-w-3xl text-sm text-muted-foreground">{selected.description||'A história e os propósitos desta Coterie ainda serão registrados.'}</p></div>{canManage&&<button type="button" className="button-ghost" onClick={()=>openForm('UPDATE',selected)}><ScrollText className="size-4"/>Editar Coterie</button>}</div>
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
     {[{label:'Integrantes',value:selected.members.length},{label:'Backgrounds',value:selected.backgrounds.reduce((sum,b)=>sum+b.dots,0)},{label:'Projetos',value:selected.projectCounts?.total??0},{label:'Refúgios',value:selected.havens.length}].map(item=><div key={item.label} className="rounded-lg border border-border/70 bg-background/55 p-3"><p className="text-xs text-muted-foreground">{item.label}</p><strong className="font-serif text-2xl">{item.value}</strong></div>)}
    </div>
    <div className="mt-4 flex flex-wrap gap-2"><Link href={'/campaigns/'+campaignId+'/projects'} className="button-ghost"><FolderKanban className="size-4"/>Projetos da Coterie <ChevronRight className="size-4"/></Link>{selected.chronicle&&<span className="rounded-full border border-border px-3 py-2 text-xs text-muted-foreground">{selected.chronicle}</span>}</div>
   </div>
   <div className="grid gap-4 xl:grid-cols-2">
    <Section title="Integrantes" icon={Users} action={button('Adicionar', 'ADD_MEMBER')}>
     {selected.members.length?<div className="space-y-3">{selected.members.map(member=><div key={member.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/35 p-3">
      <div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-lg border border-rose-900/60 bg-rose-950/30 text-rose-300"><Crown className="size-4"/></span><div><p className="font-medium">{member.name}</p><p className="text-xs text-muted-foreground">{member.role||'Integrante da Coterie'}</p></div></div>
      {canManage&&<button className="button-ghost text-xs" type="button" disabled={busy} onClick={()=>{if(window.confirm('Desvincular '+member.name+' desta Coterie?'))void submit('REMOVE_MEMBER',{memberId:member.id},selected)}}>Retirar</button>}
     </div>)}</div>:<Empty>O Narrador ainda não vinculou personagens a esta Coterie.</Empty>}
    </Section>
    <Section title="Domain · Domínio" icon={MapPin} action={button('Configurar','UPDATE')}>
     <p className="mb-3 text-sm text-muted-foreground">{selected.hasDomain?(selected.domainDescription||'Área de influência sem descrição.'):'Esta Coterie não possui Domain declarado.'}</p>
     <div className="grid grid-cols-3 gap-2">{([{label:'Chasse',dots:selected.chasse},{label:'Lien',dots:selected.lien},{label:'Portillon',dots:selected.portillon}] as const).map(item=><div key={item.label} className="rounded-lg border border-border/70 bg-background/40 p-2.5 text-center"><p className="mb-2 font-serif">{item.label}</p><div className="flex justify-center"><Dots value={item.dots}/></div></div>)}</div>
     {selected.domainResonance&&<p className="mt-3 text-xs text-muted-foreground"><Sparkles className="mr-1 inline size-3.5"/>Ressonância: {selected.domainResonance}</p>}
     {selected.chronicleTenets&&<p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">Princípios: {selected.chronicleTenets}</p>}
    </Section>
    <Section title="Backgrounds compartilhados" icon={Shield} action={button('Adicionar','ADD_BACKGROUND')}>
     {selected.backgrounds.length?<div className="space-y-2">{selected.backgrounds.map(b=><div key={b.id} className="flex items-center justify-between gap-3 border-b border-border/50 py-2"><div><p className="font-medium">{b.code}</p>{b.description&&<p className="text-xs text-muted-foreground">{b.description}</p>}</div><Dots value={b.dots}/></div>)}</div>:<Empty>Nenhum Background coletivo registrado.</Empty>}
     <p className="mt-3 text-xs text-muted-foreground">Os dots comprometidos em Stake são reservados pelo Narrador no módulo Projetos. A apresentação aqui mostra o total cadastrado.</p>
    </Section>
    <Section title="Vantagens e Defeitos" icon={Sparkles} action={button('Adicionar','ADD_ADVANTAGE')}>
     {selected.advantages.length?<div className="space-y-2">{selected.advantages.map(v=><div key={v.id} className="flex items-center justify-between gap-3 border-b border-border/50 py-2"><div><p className="font-medium">{v.customName||v.catalogItemId}</p><p className="text-xs text-muted-foreground">{v.kind==='ADVANTAGE'?'Vantagem':'Defeito'}{v.notes?' · '+v.notes:''}</p></div><Dots value={v.dots}/></div>)}</div>:<Empty>Vantagens e Defeitos coletivos não registrados.</Empty>}
    </Section>
    <Section title="Havens · Refúgios" icon={Home} action={button('Adicionar','ADD_HAVEN')}>
     {selected.havens.length?<div className="space-y-3">{selected.havens.map(h=><div key={h.id} className="rounded-lg border border-border/70 bg-background/35 p-3"><div className="flex items-center justify-between gap-2"><p className="font-medium">{h.name}{h.isPrimary&&<span className="ml-2 rounded-full border border-rose-700/60 px-2 py-0.5 text-xs text-rose-200">Principal</span>}</p>{canManage&&<button type="button" className="button-ghost text-xs" onClick={()=>openForm('ADD_HAVEN_TRAIT',selected,{havenId:h.id,kind:'MERIT'})}>+ Mérito/Defeito</button>}</div><p className="text-xs text-muted-foreground">{h.location||'Local não informado'}{h.description?' · '+h.description:''}</p>{h.traits?.map(t=><div key={t.id} className="mt-2 flex justify-between gap-3 text-xs"><span>{t.kind==='MERIT'?'Mérito':'Defeito'}: {t.customName||t.catalogItemId}</span><Dots value={t.dots}/></div>)}</div>)}</div>:<Empty>Nenhum refúgio compartilhado cadastrado.</Empty>}
    </Section>
    <Section title="Favores e Dívidas" icon={Handshake} action={button('Adicionar','ADD_BOON')}>
     {selected.boons.length?<div className="space-y-2">{selected.boons.map(b=><div key={b.id} className="rounded-lg border border-border/60 p-3"><div className="flex justify-between gap-2"><strong className="text-sm">{b.counterparty}</strong><span className="text-xs text-muted-foreground">{b.status==='OPEN'?'Em aberto':b.status}</span></div><p className="mt-1 text-xs text-muted-foreground">{boons.find(x=>x.value===b.type)?.label} · nível {b.level}{b.description?' · '+b.description:''}</p></div>)}</div>:<Empty>A Coterie não possui favores ou dívidas registrados.</Empty>}
    </Section>
   </div>
   <Section title="Objetivos da Coterie" icon={Target} action={canPropose?<button className="button-ghost text-xs" type="button" onClick={()=>openForm('ADD_GOAL',selected)}><Plus className="size-3.5"/>Propor objetivo</button>:null}>
    {selected.goals.length?<div className="space-y-3">{selected.goals.map(g=><div key={g.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/35 p-3"><div className="min-w-0 flex-1"><p className="font-medium">{g.title}</p><p className="text-xs text-muted-foreground">{g.description||'Sem descrição'} · {g.status==='OPEN'?'Aberto':g.status}</p></div>{g.projectId?<Link className="button-ghost text-xs" href={'/campaigns/'+campaignId+'/projects'}><FolderKanban className="size-4"/>Ver Project</Link>:!data.archived&&g.status==='OPEN'?<button className="button-ghost text-xs" disabled={busy} type="button" onClick={()=>void submit('GOAL_TO_PROJECT',{goalId:g.id},selected)}><FolderKanban className="size-4"/>Criar Project</button>:null}</div>)}</div>:<Empty>Nenhum objetivo coletivo proposto. Integrantes podem sugerir objetivos; a transformação em Project é explícita.</Empty>}
   </Section>
  </>}
  {isEditorAction&&<div className="rounded-xl border border-primary/50 bg-card p-4 sm:p-5">
   <div className="mb-4 flex items-center justify-between"><h3 className="font-serif text-xl">{({CREATE:'Nova Coterie',UPDATE:'Editar Coterie',ADD_MEMBER:'Adicionar integrante',REMOVE_MEMBER:'Retirar integrante',ADD_BACKGROUND:'Adicionar Background',ADD_ADVANTAGE:'Adicionar vantagem/defeito',ADD_HAVEN:'Adicionar Haven',ADD_HAVEN_TRAIT:'Mérito/defeito de Haven',ADD_BOON:'Registrar favor ou dívida',ADD_GOAL:'Propor objetivo',GOAL_TO_PROJECT:'Criar Project'} satisfies Record<Action,string>)[action!]}</h3><button type="button" aria-label="Fechar formulário" onClick={()=>{setAction(null);pending.current=null}}><X className="size-5"/></button></div>
   <form onSubmit={e=>{e.preventDefault();submitForm()}} className="grid gap-3 sm:grid-cols-2">
    {(action==='CREATE'||action==='UPDATE'||action==='ADD_HAVEN')&&<label className="flex flex-col gap-1 text-xs">Nome<input className="input" maxLength={140} required value={form.name} onChange={e=>set('name',e.target.value)}/></label>}
    {(action==='CREATE'||action==='UPDATE')&&<label className="flex flex-col gap-1 text-xs">Tipo de Coterie<select className="input" value={form.typeId} onChange={e=>set('typeId',e.target.value)}><option value="">Sem tipo definido</option>{data?.types.map(type=><option value={type.id} key={type.id}>{type.name}</option>)}</select></label>}
    {(action==='CREATE'||action==='UPDATE')&&<><label className="flex flex-col gap-1 text-xs">Cidade<input className="input" maxLength={140} value={form.city} onChange={e=>set('city',e.target.value)}/></label><label className="flex flex-col gap-1 text-xs">Crônica<input className="input" maxLength={140} value={form.chronicle} onChange={e=>set('chronicle',e.target.value)}/></label></>}
    {action==='UPDATE'&&<>
     <label className="flex flex-col gap-1 text-xs">Possui Domain?<select className="input" value={form.hasDomain} onChange={e=>set('hasDomain',e.target.value)}><option value="false">Não</option><option value="true">Sim</option></select></label>
     {form.hasDomain==='true'&&<>{(['chasse','lien','portillon'] as const).map(d=><label className="flex flex-col gap-1 text-xs" key={d}>{d[0].toUpperCase()+d.slice(1)}<input className="input" type="number" min={0} max={5} value={form[d]} onChange={e=>set(d,e.target.value)} required/></label>)}<label className="flex flex-col gap-1 text-xs sm:col-span-2">Descrição do Domain<textarea className="input min-h-20" maxLength={2000} value={form.domainDescription} onChange={e=>set('domainDescription',e.target.value)}/></label><label className="flex flex-col gap-1 text-xs">Ressonância<input className="input" maxLength={200} value={form.domainResonance} onChange={e=>set('domainResonance',e.target.value)}/></label></>}
     <label className="flex flex-col gap-1 text-xs sm:col-span-2">Princípios da crônica<textarea className="input min-h-20" maxLength={2000} value={form.chronicleTenets} onChange={e=>set('chronicleTenets',e.target.value)}/></label>
    </>}
    {action==='ADD_MEMBER'&&<><label className="flex flex-col gap-1 text-xs">Personagem<select className="input" required value={form.characterId} onChange={e=>set('characterId',e.target.value)}><option value="">Selecione…</option>{data?.roster.filter(ch=>!selected?.members.some(m=>m.characterId===ch.id)).map(ch=><option key={ch.id} value={ch.id}>{ch.name}</option>)}</select></label><label className="flex flex-col gap-1 text-xs">Papel na Coterie<input className="input" value={form.role} maxLength={80} onChange={e=>set('role',e.target.value)}/></label></>}
    {action==='ADD_BACKGROUND'&&<><label className="flex flex-col gap-1 text-xs">Background<select className="input" value={form.backgroundCode} onChange={e=>set('backgroundCode',e.target.value)}>{backgrounds.map(b=><option key={b} value={b}>{b}</option>)}</select></label><label className="flex flex-col gap-1 text-xs">Fonte<input className="input" value={form.source} onChange={e=>set('source',e.target.value)} maxLength={160}/></label></>}
    {(action==='ADD_ADVANTAGE'||action==='ADD_HAVEN_TRAIT')&&<><label className="flex flex-col gap-1 text-xs">Tipo<select className="input" value={form.kind} onChange={e=>set('kind',e.target.value)}><option value={action==='ADD_HAVEN_TRAIT'?'MERIT':'ADVANTAGE'}>Vantagem/Mérito</option><option value="FLAW">Defeito</option></select></label><label className="flex flex-col gap-1 text-xs">Nome personalizado<input className="input" maxLength={160} value={form.customName} onChange={e=>set('customName',e.target.value)}/></label><label className="flex flex-col gap-1 text-xs">Código do catálogo (opcional)<input className="input" value={form.catalogItemId} maxLength={160} onChange={e=>set('catalogItemId',e.target.value)}/></label></>}
    {action==='ADD_HAVEN_TRAIT'&&<label className="flex flex-col gap-1 text-xs">Haven<select className="input" required value={form.havenId} onChange={e=>set('havenId',e.target.value)}><option value="">Selecione…</option>{selected?.havens.map(h=><option value={h.id} key={h.id}>{h.name}</option>)}</select></label>}
    {action==='ADD_HAVEN'&&<><label className="flex flex-col gap-1 text-xs">Localização<input className="input" maxLength={250} value={form.location} onChange={e=>set('location',e.target.value)}/></label><label className="flex flex-col gap-1 text-xs">Refúgio principal?<select className="input" value={form.isPrimary} onChange={e=>set('isPrimary',e.target.value)}><option value="false">Não</option><option value="true">Sim</option></select></label></>}
    {action==='ADD_BOON'&&<><label className="flex flex-col gap-1 text-xs">Tipo<select className="input" value={form.kind} onChange={e=>set('kind',e.target.value)}>{boons.map(b=><option key={b.value} value={b.value}>{b.label}</option>)}</select></label><label className="flex flex-col gap-1 text-xs">Contraparte<input className="input" required maxLength={160} value={form.counterparty} onChange={e=>set('counterparty',e.target.value)}/></label><label className="flex flex-col gap-1 text-xs">Nível<input className="input" type="number" min={1} max={5} value={form.level} onChange={e=>set('level',e.target.value)}/></label></>}
    {action==='ADD_GOAL'&&<label className="flex flex-col gap-1 text-xs sm:col-span-2">Objetivo<input className="input" required maxLength={180} value={form.title} onChange={e=>set('title',e.target.value)}/></label>}
    {['ADD_BACKGROUND','ADD_ADVANTAGE','ADD_HAVEN_TRAIT'].includes(action!)&&<label className="flex flex-col gap-1 text-xs">Pontos<input className="input" type="number" min={1} max={5} required value={form.dots} onChange={e=>set('dots',e.target.value)}/></label>}
    {['CREATE','UPDATE','ADD_BACKGROUND','ADD_ADVANTAGE','ADD_HAVEN','ADD_BOON','ADD_GOAL'].includes(action!)&&<label className="flex flex-col gap-1 text-xs sm:col-span-2">Descrição / Observações<textarea className="input min-h-20" value={form.description} maxLength={action==='CREATE'||action==='UPDATE'||action==='ADD_HAVEN'||action==='ADD_GOAL'?2000:1000} onChange={e=>set('description',e.target.value)}/></label>}
    <button type="submit" className="button-primary sm:col-span-2" disabled={busy||action==='ADD_MEMBER'&&!form.characterId||['ADD_ADVANTAGE','ADD_HAVEN_TRAIT'].includes(action!)&&!form.customName.trim()&&!form.catalogItemId.trim()}>{busy?'Salvando…':'Salvar'}</button>
   </form>
  </div>}
  {pending.current&&!busy&&<button className="button-ghost" type="button" onClick={()=>{const request=pending.current;if(request)void submit(request.action,request,selected??undefined)}}>Reenviar operação pendente</button>}
 </div>
}
