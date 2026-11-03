'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { CalendarClock, ChevronDown, CircleAlert, Dices, FolderKanban, Handshake, Layers, LockKeyhole, MoreVertical, Plus, Search, ShieldCheck, Target, Users, X } from 'lucide-react'

type CharacterOption={id:string;name:string}
type StakeOption={ownerType:'CHARACTER'|'COTERIE';ownerId:string;ownerName:string;trait:string;dots:number;reserved:number;available:number}
type StakeChoice={key:string;dots:number}
type Project={
 id:string;name:string;description:string;goalDescription:string;projectType:'PERSONAL'|'COTERIE'
 ownerCharacterId:string|null;ownerName:string|null;coterieId:string|null;coterieName:string|null
 status:'DRAFT'|'AWAITING_APPROVAL'|'ACTIVE'|'SUCCESS'|'FAILED'|'ABANDONED'
 targetTrait:string|null;currentDots:number|null;finalDots:number|null;scope:number|null
 incrementUnit:'DAY'|'WEEK'|'MONTH'|'YEAR'|null;incrementValue:number|null;projectDie:number|null
 launchPool:number|null;launchDifficulty:number|null;launchResult:{outcome?:string;stakeRequired?:number}|null
 goalRollRequested:boolean;createdByMe:boolean;revision:number
 participants:{characterId:string;name:string}[]
 npcParticipants:{campaignNpcId:string;name:string;role:string}[]
 stakes:{characterId:string|null;coterieId:string|null;trait:string;dots:number;releasedAt:string|null}[]
 events:{type:string;description:string;createdAt:string}[]
}
type Data={projects:Project[];characters:CharacterOption[];roster:CharacterOption[];coteries:CharacterOption[];canManage:boolean;archived:boolean}
const statuses:Record<Project['status'],string>={DRAFT:'Rascunho',AWAITING_APPROVAL:'Aguardando aprovação',ACTIVE:'Ativo',SUCCESS:'Concluído',FAILED:'Falhou',ABANDONED:'Abandonado'}
const statusStyle:Record<Project['status'],string>={
 DRAFT:'border-white/20 bg-white/5 text-muted-foreground',
 AWAITING_APPROVAL:'border-amber-500/50 bg-amber-500/10 text-amber-200',
 ACTIVE:'border-rose-500/50 bg-rose-950/50 text-rose-100',
 SUCCESS:'border-emerald-600/40 bg-emerald-950/40 text-emerald-200',
 FAILED:'border-red-900/60 bg-red-950/20 text-red-200',
 ABANDONED:'border-white/20 bg-white/5 text-muted-foreground'
}
const unitLabel:Record<string,string>={DAY:'dia(s)',WEEK:'semana(s)',MONTH:'mês(es)',YEAR:'ano(s)'}
const fetcher=async (url:string)=>{const r=await fetch(url,{cache:'no-store'});const body=await r.json();if(!r.ok)throw new Error(body.error??'Não foi possível consultar os projetos.');return body}
const numberOr=(value:string,fallback=0)=>value.trim()===''?fallback:Number(value)

export function CampaignProjectsPanel({campaignId}:Readonly<{campaignId:string}>) {
 const endpoint='/api/campaigns/'+campaignId+'/projects'
 const {data,error,mutate,isLoading}=useSWR<Data>(endpoint,fetcher)
 const [scope,setScope]=useState<'ALL'|'PERSONAL'|'COTERIE'|'NPC'>('ALL')
 const [status,setStatus]=useState('ALL')
 const [search,setSearch]=useState('')
 const [expanded,setExpanded]=useState<string|null>(null)
 const [createOpen,setCreateOpen]=useState(false)
 const [newType,setNewType]=useState<'PERSONAL'|'COTERIE'>('PERSONAL')
 const [newOwner,setNewOwner]=useState('')
 const [newName,setNewName]=useState('')
 const [newDescription,setNewDescription]=useState('')
 const [newGoal,setNewGoal]=useState('')
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 const [draft, setDraft]=useState<Record<string,string>>({})
 const [stakeOptions,setStakeOptions]=useState<StakeOption[]|null>(null)
 const [stakeChoices,setStakeChoices]=useState<StakeChoice[]>([])
 const [pendingKey,setPendingKey]=useState<string|null>(null)
 const projects=data?.projects??[]
 const counts={all:projects.length,personal:projects.filter(p=>p.projectType==='PERSONAL').length,coterie:projects.filter(p=>p.projectType==='COTERIE').length,npc:projects.filter(p=>p.npcParticipants.length>0).length}
 const filtered=useMemo(()=>projects.filter(p=>{
  if(scope==='PERSONAL'&&p.projectType!=='PERSONAL')return false
  if(scope==='COTERIE'&&p.projectType!=='COTERIE')return false
  if(scope==='NPC'&&!p.npcParticipants.length)return false
  if(status!=='ALL'&&p.status!==status)return false
  const q=search.trim().toLocaleLowerCase('pt-BR')
  return !q||[p.name,p.goalDescription,p.ownerName,p.coterieName,...p.participants.map(part=>part.name),...p.npcParticipants.map(npc=>npc.name)].some(value=>value?.toLocaleLowerCase('pt-BR').includes(q))
 }),[projects,scope,status,search])
 const selected=projects.find(p=>p.id===expanded)
 const isStakePending=(p:Project)=>p.status==='AWAITING_APPROVAL'&&p.launchResult?.outcome==='WIN'
 const isCreator=(p:Project)=>Boolean(data?.canManage||p.createdByMe||p.projectType==='PERSONAL'&&data?.characters.some(ch=>ch.id===p.ownerCharacterId))
 const readStake=async(projectId:string)=>{
  setStakeOptions(null);setStakeChoices([])
  try {const result:{options:StakeOption[]}=await fetcher(endpoint+'/stakes?projectId='+encodeURIComponent(projectId));setStakeOptions(result.options.filter(o=>o.available>0))}
  catch(e){setMessage(e instanceof Error?e.message:'Não foi possível carregar Backgrounds.')}
 }
 const openProject=(projectId:string)=>{
  const next=expanded===projectId?null:projectId
  setExpanded(next);setDraft({});setMessage('');setStakeOptions(null);setStakeChoices([]);setPendingKey(null)
  const p=projects.find(item=>item.id===next)
  if(p&&isStakePending(p)&&data?.canManage)void readStake(p.id)
 }
 async function command(action:string,project?:Project,extra:Record<string,unknown>={}) {
  if(busy||!data)return
  const key=pendingKey??crypto.randomUUID()
  setPendingKey(key);setBusy(true);setMessage('')
  try{
   const payload={action,idempotencyKey:key,...(project?{projectId:project.id,expectedRevision:project.revision}:{}),...extra}
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
   const body=await response.json().catch(()=>null)
   if(!response.ok){if(response.status<500)setPendingKey(null);throw new Error(body?.error??'Operação rejeitada pelo servidor.')}
   setPendingKey(null);setCreateOpen(false);setMessage(action==='COMMIT_STAKE'?'Pontos de Stake reservados com sucesso.':'Operação registrada no histórico do projeto.')
   await mutate()
   if(action==='COMMIT_STAKE')setStakeOptions(null)
   if(action==='CREATE')setExpanded(body.projectId)
  }catch(e){setMessage(e instanceof Error?e.message:'Falha de conexão. Reenvie a mesma operação.')}
  finally{setBusy(false)}
 }
 const selectedChoices=stakeChoices.flatMap(choice=>{
  const o=stakeOptions?.find(option=>option.ownerType+':'+option.ownerId+':'+option.trait===choice.key)
  return o&&choice.dots>0?[{...(o.ownerType==='CHARACTER'?{characterId:o.ownerId}:{coterieId:o.ownerId}),trait:o.trait,dots:choice.dots}]:[]
 })
 const required=selected?.launchResult?.stakeRequired??0
 const totalStake=selectedChoices.reduce((sum,s)=>sum+s.dots,0)
 const canCreate=(data?.characters.length??0)>0||(data?.coteries.length??0)>0
 return <section className="campaign-projects" aria-label="Projetos da mesa">
  <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-5">
   <div className="flex min-w-0 items-center gap-3">
    <Layers className="size-7 shrink-0 text-rose-500" aria-hidden="true"/>
    <div><p className="eyebrow">Projects · SPEC-SESSION-011</p><h2 className="font-serif text-2xl sm:text-3xl">{data?.canManage?'Projetos da Mesa':'Meus Projetos'}</h2>
    <p className="mt-1 text-sm text-muted-foreground">{data?.canManage?'Projetos de personagens e Coteries da campanha.':'Projetos do seu personagem, parcerias e Coteries das quais participa.'}</p></div>
   </div>
   {!data?.archived&&canCreate&&<button type="button" className="button-primary inline-flex items-center gap-2" onClick={()=>{setCreateOpen(v=>!v);setNewOwner('');setMessage('');setExpanded(null)}}><Plus className="size-4"/>Novo Projeto</button>}
  </header>
  {error&&<p className="my-4 text-sm text-red-300" role="alert">{error.message}</p>}
  {isLoading&&<p className="py-8 text-center text-sm text-muted-foreground">Consultando os Projects da crônica…</p>}
  {message&&<p className="my-3 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm" role="status" aria-live="polite">{message}</p>}
  {createOpen&&data&&<form className="my-5 space-y-4 rounded-xl border border-primary/50 bg-card p-5" onSubmit={e=>{e.preventDefault();void command('CREATE',undefined,{name:newName,description:newDescription,goalDescription:newGoal,...(newType==='PERSONAL'?{ownerCharacterId:newOwner}:{coterieId:newOwner})})}}>
   <div className="flex items-center justify-between"><h3 className="font-serif text-xl">Novo Projeto</h3><button type="button" aria-label="Fechar novo projeto" onClick={()=>setCreateOpen(false)}><X className="size-5"/></button></div>
   <div className="grid gap-3 sm:grid-cols-2">
    <label className="flex flex-col gap-1 text-sm">Tipo<select className="input" value={newType} onChange={e=>{setNewType(e.target.value as 'PERSONAL'|'COTERIE');setNewOwner('')}}><option value="PERSONAL">Projeto pessoal</option><option value="COTERIE">Projeto de Coterie</option></select></label>
    <label className="flex flex-col gap-1 text-sm">{newType==='PERSONAL'?'Personagem proprietário':'Coterie proprietária'}<select className="input" required value={newOwner} onChange={e=>setNewOwner(e.target.value)}><option value="">Selecione…</option>{(newType==='PERSONAL'?data.characters:data.coteries).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
   </div>
   <label className="flex flex-col gap-1 text-sm">Nome do Projeto<input className="input" value={newName} maxLength={140} required onChange={e=>setNewName(e.target.value)}/></label>
   <label className="flex flex-col gap-1 text-sm">Objetivo narrativo<input className="input" value={newGoal} maxLength={1000} required onChange={e=>setNewGoal(e.target.value)}/></label>
   <label className="flex flex-col gap-1 text-sm">Descrição<textarea className="input min-h-24" value={newDescription} maxLength={2000} onChange={e=>setNewDescription(e.target.value)}/></label>
   <p className="text-xs text-muted-foreground">O Project começa como rascunho. Scope, Launch Roll e Stake dependem da aprovação do Narrador.</p>
   <button type="submit" className="button-primary" disabled={busy||!newOwner||!newName.trim()||!newGoal.trim()}>{busy?'Salvando…':'Criar projeto'}</button>
  </form>}
  {data&&<div className="mt-5 space-y-4">
   <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/70 p-3">
    <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo de projeto">
     {([{id:'ALL',label:'Todos',count:counts.all},{id:'PERSONAL',label:'Pessoais',count:counts.personal},{id:'COTERIE',label:'Da Coterie',count:counts.coterie},{id:'NPC',label:'Com NPCs',count:counts.npc}] as const).map(item=><button key={item.id} type="button" aria-pressed={scope===item.id} onClick={()=>setScope(item.id)} className={'rounded-full border px-4 py-2 text-xs font-medium transition '+(scope===item.id?'border-rose-500 bg-red-950/70 text-rose-100 shadow-[0_0_12px_#9f123944]':'border-border bg-background/60 text-muted-foreground hover:text-foreground')}>{item.label} ({item.count})</button>)}
    </div>
    <div className="flex flex-wrap gap-2">
     <label className="relative"><span className="sr-only">Filtrar status</span><select className="input min-w-44 pr-8 text-sm" value={status} onChange={e=>setStatus(e.target.value)}><option value="ALL">Status: Todos</option>{Object.entries(statuses).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select><ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-3 size-4 opacity-50"/></label>
     <label className="relative"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden="true"/><span className="sr-only">Buscar projeto, proprietário ou participante</span><input className="input min-w-48 pl-9 text-sm" placeholder="Buscar projeto…" value={search} onChange={e=>setSearch(e.target.value)}/></label>
    </div>
   </div>
   <div className="overflow-x-auto rounded-xl border border-border bg-card/70">
    <table className="w-full min-w-[860px] border-collapse text-left text-sm">
     <thead className="border-b border-border bg-background/60 text-xs text-muted-foreground"><tr><th scope="col" className="px-4 py-3 font-medium">Projeto</th><th scope="col" className="px-4 py-3 font-medium">Proprietário</th><th scope="col" className="px-3 py-3 font-medium">Tipo</th><th scope="col" className="px-3 py-3 font-medium">Progresso</th><th scope="col" className="px-3 py-3 font-medium">Die</th><th scope="col" className="px-3 py-3 font-medium">Próximo Increment</th><th scope="col" className="px-3 py-3 font-medium">Status</th><th scope="col" className="px-3 py-3 text-right font-medium">Ações</th></tr></thead>
     <tbody className="divide-y divide-border/60">{filtered.map(p=>{
      const progress=p.status==='SUCCESS'?10:p.projectDie?Math.max(0,10-p.projectDie):0
      const statusLabel=isStakePending(p)?'Stake pendente':statuses[p.status]
      return <tr key={p.id} className={expanded===p.id?'bg-primary/10':'hover:bg-white/[0.035]'}>
       <td className="max-w-xs px-4 py-3"><div className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-lg border border-red-900/50 bg-red-950/45 text-rose-300">{p.projectType==='COTERIE'?<Users className="size-5"/>:<Handshake className="size-5"/>}</span><div className="min-w-0"><button type="button" onClick={()=>openProject(p.id)} className="block max-w-64 truncate text-left font-medium hover:text-rose-300" title={p.name}>{p.name}</button><p className="truncate text-xs text-muted-foreground">{p.targetTrait??p.goalDescription}{p.currentDots!=null&&p.finalDots!=null?' · '+p.currentDots+' → '+p.finalDots+' dots':''}</p></div></div></td>
       <td className="px-4 py-3 text-xs">{p.projectType==='COTERIE'?(p.coterieName??'Coterie'):(p.ownerName??'Personagem')}{p.participants.length>1&&<span className="text-muted-foreground"> +{p.participants.length-1}</span>}{p.npcParticipants.length>0&&<p className="text-muted-foreground">NPC: {p.npcParticipants.map(x=>x.name).join(', ')}</p>}</td>
       <td className="px-3 py-3"><span className="rounded-md border border-border bg-background px-2 py-1 text-xs">{p.projectType==='COTERIE'?'Coterie':'Pessoal'}</span></td>
       <td className="px-3 py-3"><span className="text-xs">{progress} / 10</span><div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-rose-500" style={{width:String(progress*10)+'%'}}/></div></td>
       <td className="px-3 py-3">{p.projectDie??'—'}</td><td className="whitespace-nowrap px-3 py-3 text-xs">{p.status==='ACTIVE'&&p.incrementUnit?String(p.incrementValue??1)+' '+unitLabel[p.incrementUnit]:'—'}</td>
       <td className="px-3 py-3"><span className={'inline-flex rounded-full border px-3 py-1 text-xs '+statusStyle[p.status]}>{statusLabel}</span></td>
       <td className="px-3 py-3 text-right"><button type="button" aria-label={'Detalhes de '+p.name} aria-expanded={expanded===p.id} onClick={()=>openProject(p.id)} className="rounded-lg p-2 hover:bg-primary/15"><MoreVertical className="size-4"/></button></td>
      </tr>})}</tbody>
    </table>
    {!filtered.length&&<div className="p-10 text-center text-sm text-muted-foreground"><FolderKanban className="mx-auto mb-3 size-9 opacity-50"/>{projects.length?'Nenhum projeto corresponde aos filtros.':'Nenhum projeto cadastrado nesta mesa.'}</div>}
   </div>
  </div>}
  {selected&&<section className="mt-5 space-y-4 rounded-xl border border-primary/40 bg-card p-5" aria-label={'Detalhes de '+selected.name}>
   <header className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">Dossiê do Project</p><h3 className="font-serif text-2xl">{selected.name}</h3><p className="mt-1 text-sm text-muted-foreground">{selected.goalDescription}</p></div><button className="button-ghost" type="button" onClick={()=>openProject(selected.id)}><X className="size-4"/>Fechar</button></header>
   {selected.description&&<p className="text-sm">{selected.description}</p>}
   <div className="grid gap-3 text-sm sm:grid-cols-3">
    <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Scope</p><strong>{selected.scope??'A definir'}</strong></div>
    <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Project Die</p><strong>{selected.projectDie??'—'}</strong></div>
    <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Stake comprometido</p><strong>{selected.stakes.filter(s=>!s.releasedAt).reduce((sum,s)=>sum+s.dots,0)} pontos</strong></div>
   </div>
   <div className="text-sm"><p className="font-semibold"><Users className="mr-2 inline size-4"/>Participantes</p><p className="mt-1 text-muted-foreground">{selected.participants.map(p=>p.name).concat(selected.npcParticipants.map(p=>p.name+' (NPC)')).join(', ')||'Nenhum participante definido.'}</p></div>
   {selected.stakes.length>0&&<div className="rounded-lg border border-border/70 p-3"><h4 className="font-semibold">Pontos em Stake</h4><ul className="mt-2 space-y-1 text-xs">{selected.stakes.map((s,i)=><li key={i}>{s.trait} · {s.dots} ponto(s) · {s.characterId?'Personagem':'Coterie'} · {s.releasedAt?'Liberado':'Reservado'}</li>)}</ul><p className="mt-2 text-xs text-muted-foreground"><LockKeyhole className="mr-1 inline size-3"/>Pontos reservados não podem ser comprometidos em outro Project. Perdas definitivas dependem da resolução de regras.</p></div>}
   {selected.status==='DRAFT'&&isCreator(selected)&&<div className="rounded-lg border border-border p-4">
    <h4 className="mb-3 font-semibold">Personagens em parceria</h4>
    <p className="mb-3 text-xs text-muted-foreground">Selecione os personagens envolvidos antes de enviar ou lançar o projeto. A presença na lista permite acompanhar a evolução; não transfere a propriedade.</p>
    <div className="grid max-h-44 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
     {(data?.roster??[]).map(person=><label key={person.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={(draft.participants??selected.participants.map(p=>p.characterId).join(',')).split(',').includes(person.id)} disabled={busy||selected.projectType==='PERSONAL'&&person.id===selected.ownerCharacterId} onChange={e=>{
      const values=(draft.participants??selected.participants.map(p=>p.characterId).join(',')).split(',').filter(Boolean)
      const next=e.target.checked?[...values,person.id]:values.filter(id=>id!==person.id)
      setDraft(d=>({...d,participants:[...new Set(next)].join(',')}))
     }}/>{person.name}</label>)}
    </div>
    <button type="button" className="button-ghost mt-3" disabled={busy} onClick={()=>void command('SET_PARTICIPANTS',selected,{participantIds:(draft.participants??selected.participants.map(p=>p.characterId).join(',')).split(',').filter(Boolean)})}>Salvar participantes</button>
    {data?.canManage&&<p className="mt-2 text-xs text-muted-foreground">Parceiros NPC devem ser vinculados pelo Narrador a NPCs cadastrados nesta mesa; a integração visual de seleção de NPCs será adicionada à edição avançada.</p>}
   </div>}
   {selected.status==='DRAFT'&&isCreator(selected)&&<div className="flex flex-wrap gap-2">
    <button className="button-primary" type="button" disabled={busy} onClick={()=>void command('SUBMIT',selected)}><ShieldCheck className="size-4"/>Enviar para aprovação</button>
   </div>}
   {data?.canManage&&selected.status==='AWAITING_APPROVAL'&&!selected.launchResult&&<form className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2" onSubmit={e=>{e.preventDefault();void command('APPROVE',selected,{targetTrait:draft.targetTrait??'Influence',currentDots:numberOr(draft.currentDots??'0'),finalDots:numberOr(draft.finalDots??'1'),incrementUnit:draft.incrementUnit??'MONTH',incrementValue:numberOr(draft.incrementValue??'1'),launchPool:numberOr(draft.launchPool??'4')})}}>
    <h4 className="sm:col-span-2 font-semibold">Aprovação mecânica pelo Narrador</h4>
    {([{name:'targetTrait',label:'Característica alvo',initial:'Influence'},{name:'currentDots',label:'Pontos atuais',initial:'0'},{name:'finalDots',label:'Pontos desejados',initial:'1'},{name:'incrementValue',label:'Valor do Increment',initial:'1'},{name:'launchPool',label:'Pool de Launch',initial:'4'}] as const).map(f=><label key={f.name} className="flex flex-col gap-1 text-xs">{f.label}<input className="input" type={f.name==='targetTrait'?'text':'number'} min={f.name==='targetTrait'?undefined:0} value={draft[f.name]??f.initial} onChange={e=>setDraft(d=>({...d,[f.name]:e.target.value}))}/></label>)}
    <label className="flex flex-col gap-1 text-xs">Unidade do Increment<select className="input" value={draft.incrementUnit??'MONTH'} onChange={e=>setDraft(d=>({...d,incrementUnit:e.target.value}))}><option value="DAY">Dias</option><option value="WEEK">Semanas</option><option value="MONTH">Meses</option><option value="YEAR">Anos</option></select></label>
    <button className="button-primary sm:col-span-2" type="submit" disabled={busy}>Aprovar Scope e Increment</button>
   </form>}
   {data?.canManage&&selected.status==='AWAITING_APPROVAL'&&selected.launchDifficulty!=null&&!isStakePending(selected)&&<button className="button-primary" type="button" disabled={busy} onClick={()=>void command('LAUNCH',selected,{rollingCharacterId:selected.participants[0]?.characterId??selected.ownerCharacterId})}><Dices className="size-4"/>Launch Roll · dificuldade {selected.launchDifficulty}</button>}
   {data?.canManage&&isStakePending(selected)&&<div className="space-y-3 rounded-lg border border-amber-800/50 bg-amber-950/10 p-4">
    <h4 className="font-semibold text-amber-200">Confirmar Stake após o Launch Roll</h4><p className="text-sm">O resultado exige <strong>{required}</strong> ponto(s), sujeitos à disponibilidade dos Backgrounds participantes.</p>
    {!stakeOptions&&<button className="button-ghost" type="button" onClick={()=>void readStake(selected.id)}>Consultar pontos disponíveis</button>}
    {stakeOptions&&<div className="space-y-2">{stakeOptions.map(o=>{
      const key=o.ownerType+':'+o.ownerId+':'+o.trait;const chosen=stakeChoices.find(row=>row.key===key)?.dots??0
      return <label key={key} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background/50 p-2 text-sm"><span>{o.ownerName} · {o.trait} <span className="text-xs text-muted-foreground">({o.dots} totais, {o.reserved} reservados, {o.available} disponíveis)</span></span><input className="input w-20" type="number" min={0} max={o.available} step={1} aria-label={'Pontos de '+o.trait+' de '+o.ownerName} value={chosen} onChange={e=>setStakeChoices(rows=>[...rows.filter(row=>row.key!==key),{key,dots:Math.max(0,Math.min(o.available,Number(e.target.value)||0))}])}/></label>
    })}<p className="text-sm">Selecionados: <strong>{totalStake}</strong> / {required} pontos mínimos do lançamento. Para projetos cooperativos, podem existir exigências adicionais de participação.</p><button className="button-primary" type="button" disabled={busy||!selectedChoices.length||totalStake!==required} onClick={()=>void command('COMMIT_STAKE',selected,{stakes:selectedChoices})}><LockKeyhole className="size-4"/>Reservar Stake e iniciar Project</button></div>}
   </div>}
   {selected.status==='ACTIVE'&&<div className="flex flex-wrap gap-2">
    {data?.canManage&&<button className="button-ghost" type="button" disabled={busy} onClick={()=>void command('INCREMENT',selected,{reason:'Increment ficcional realizado'})}><CalendarClock className="size-4"/>Registrar Increment</button>}
    {!selected.goalRollRequested&&<button className="button-ghost" type="button" disabled={busy} onClick={()=>void command('REQUEST_GOAL',selected)}><Target className="size-4"/>Solicitar Goal Roll</button>}
    {data?.canManage&&selected.goalRollRequested&&<button className="button-primary" type="button" disabled={busy} onClick={()=>void command('RESOLVE_GOAL',selected,{rollingCharacterId:selected.participants[0]?.characterId??selected.ownerCharacterId,goalPool:numberOr(draft.goalPool??'4')})}><Dices className="size-4"/>Resolver Goal Roll</button>}
    {data?.canManage&&selected.goalRollRequested&&<label className="flex items-center gap-2 text-xs">Pool do Goal Roll<input className="input w-20" type="number" min={1} max={50} value={draft.goalPool??'4'} onChange={e=>setDraft(d=>({...d,goalPool:e.target.value}))}/></label>}
   </div>}
   {selected.events.length>0&&<details className="rounded-lg border border-border p-3"><summary className="cursor-pointer text-sm font-semibold">Histórico do Project ({selected.events.length})</summary><ol className="mt-3 space-y-2 text-xs">{selected.events.map((entry,i)=><li key={i} className="border-l-2 border-primary/50 pl-3"><strong>{entry.type}</strong> · {entry.description}</li>)}</ol></details>}
  </section>}
  <p className="mt-5 flex items-start gap-2 text-xs text-muted-foreground"><CircleAlert className="size-4 shrink-0"/><span>Stake bloqueia pontos de Background para outros projetos. O ponto não é removido permanentemente ao reservar; o Narrador resolve perdas conforme o Goal Roll e as regras V5. Projects não são missões narrativas.</span></p>
 </section>
}
