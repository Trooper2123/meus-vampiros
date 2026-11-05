'use client'

import { useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import { BookOpen, ChevronDown, Clock3, FolderKanban, Handshake, Landmark, MoreVertical, Plus, ScrollText, ShieldCheck, Users, X } from 'lucide-react'

type Item={id:string;name:string}
type Project={
 id:string; name:string; description:string; goalDescription:string; projectType:'PERSONAL'|'COTERIE';
 ownerName:string|null; ownerCharacterId:string|null; coterieName:string|null; coterieId:string|null;
 playerRelation:'MINE'|'PARTNER'|'COTERIE'|null;
 status:'DRAFT'|'AWAITING_APPROVAL'|'ACTIVE'|'SUCCESS'|'FAILED'|'ABANDONED';
 targetTrait:string|null; currentDots:number|null; finalDots:number|null;
 projectDie:number|null; incrementValue:number|null; incrementUnit:string|null;
 goalRollRequested:boolean; revision:number; createdByMe:boolean;
 participants:{characterId:string;name:string}[]; npcParticipants:{campaignNpcId:string;name:string;role:string}[];
 stakes:{trait:string;dots:number;releasedAt:string|null}[];
 events:{type:string;description:string;createdAt:string}[];
}
type Response={projects:Project[];characters:Item[];coteries:Item[];canManage:boolean;archived:boolean}
type Filter='ALL'|'MINE'|'PARTNER'|'COTERIE'
const statuses:Record<Project['status'],string>={DRAFT:'Rascunho',AWAITING_APPROVAL:'Aguardando aprovação',ACTIVE:'Ativo',SUCCESS:'Concluído',FAILED:'Falhou',ABANDONED:'Abandonado'}
const tones:Record<Project['status'],string>={
 ACTIVE:'border-rose-800/70 bg-rose-950/45 text-rose-100',
 AWAITING_APPROVAL:'border-amber-700/60 bg-amber-950/35 text-amber-100',
 DRAFT:'border-white/20 bg-white/5 text-muted-foreground',
 SUCCESS:'border-emerald-700/60 bg-emerald-950/30 text-emerald-100',
 FAILED:'border-red-900/60 bg-red-950/30 text-red-200',
 ABANDONED:'border-white/20 bg-white/5 text-muted-foreground'
}
const units:Record<string,string>={DAY:'dia(s)',WEEK:'semana(s)',MONTH:'mês(es)',YEAR:'ano(s)'}
const get=async(url:string):Promise<Response>=>{
 const response=await fetch(url,{cache:'no-store'})
 const body=await response.json().catch(()=>null)
 if(!response.ok)throw new Error(body?.error??'Falha ao consultar projetos.')
 return body
}
export function PlayerProjectsPanel({campaignId}:Readonly<{campaignId:string}>) {
 const endpoint='/api/campaigns/'+campaignId+'/projects'
 const {data,error,isLoading,mutate}=useSWR<Response>(endpoint,get,{refreshInterval:20000})
 const [filter,setFilter]=useState<Filter>('ALL')
 const [status,setStatus]=useState('ALL')
 const [opened,setOpened]=useState<string|null>(null)
 const [creating,setCreating]=useState(false)
 const [projectType,setProjectType]=useState<'PERSONAL'|'COTERIE'>('PERSONAL')
 const [owner,setOwner]=useState('')
 const [name,setName]=useState('')
 const [goal,setGoal]=useState('')
 const [description,setDescription]=useState('')
 const [editing,setEditing]=useState(false)
 const [details,setDetails]=useState({name:'',goal:'',description:''})
 const [busy,setBusy]=useState(false)
 const [notice,setNotice]=useState('')
 const retry=useRef<{action:string;idempotencyKey:string;[key:string]:unknown}|null>(null)
 const [retryRequest,setRetryRequest]=useState<{action:string;idempotencyKey:string;[key:string]:unknown}|null>(null)
 const projects=data?.projects??[]
 const counts={ALL:projects.length,MINE:projects.filter(p=>p.playerRelation==='MINE').length,PARTNER:projects.filter(p=>p.playerRelation==='PARTNER').length,COTERIE:projects.filter(p=>p.playerRelation==='COTERIE').length}
 const visible=useMemo(()=>projects.filter(p=>(filter==='ALL'||p.playerRelation===filter)&&(status==='ALL'||p.status===status)),[projects,filter,status])
 const canEdit=(p:Project)=>p.status==='DRAFT'&&(p.playerRelation==='MINE'||p.projectType==='COTERIE'&&p.createdByMe&&p.playerRelation==='COTERIE')
 const canCreate=Boolean(data&&!data.archived&&(data.characters.length||data.coteries.length))
 const clearRetry=()=>{retry.current=null;setRetryRequest(null)}
 const open=(p:Project)=>{setOpened(opened===p.id?null:p.id);setEditing(false);setDetails({name:p.name,goal:p.goalDescription,description:p.description});setNotice('');clearRetry()}
 async function send(action:string,project?:Project,extra:Record<string,unknown>={}) {
  if(busy||!data||data.archived)return
  const request=retry.current??{action,idempotencyKey:crypto.randomUUID(),...(project?{projectId:project.id,expectedRevision:project.revision}:{}),...extra}
  retry.current=request;setRetryRequest(request);setBusy(true);setNotice('')
  try{
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request)})
   const result=await response.json().catch(()=>null)
   if(!response.ok){if(response.status<500)clearRetry();throw new Error(result?.error??'Operação não realizada.')}
   clearRetry();await mutate()
   if(action==='CREATE'){setCreating(false);setOpened(result.projectId);setName('');setGoal('');setDescription('');setOwner('')}
   if(action==='UPDATE_DRAFT')setEditing(false)
   setNotice(action==='SUBMIT'?'Projeto enviado ao Narrador para aprovação.':action==='REQUEST_GOAL'?'Solicitação de Goal Roll registrada.':'Projeto atualizado com sucesso.')
  }catch(e){setNotice(e instanceof Error?e.message:'Falha de rede. Reenvie a mesma operação.')}
  finally{setBusy(false)}
 }
 return <section className="space-y-4" aria-label="Meus projetos">
  <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-4">
   <div className="flex items-center gap-3"><FolderKanban className="size-6 text-rose-500" aria-hidden="true"/><div><h2 className="font-serif text-2xl">Meus Projetos</h2><p className="mt-0.5 text-xs text-muted-foreground">Projetos criados por você, em que você participa ou da sua Coterie.</p></div></div>
   {canCreate&&<button className="button-primary flex items-center gap-2 text-sm" type="button" onClick={()=>{setCreating(v=>!v);setOpened(null);setNotice('');clearRetry()}}><Plus className="size-4"/>Novo Projeto</button>}
  </header>
  {error&&<p role="alert" className="rounded-lg border border-red-800/60 p-3 text-sm text-red-300">{error.message}</p>}
  {isLoading&&<p className="py-10 text-center text-sm text-muted-foreground">Consultando os projetos da crônica…</p>}
  {notice&&<p role="status" aria-live="polite" className="rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm">{notice}</p>}
  {data&&<>
   {data.archived&&<p className="rounded-lg border border-amber-700/40 p-3 text-xs text-amber-200">Esta mesa está arquivada. Seus projetos permanecem disponíveis para consulta.</p>}
   {creating&&<form className="space-y-3 rounded-xl border border-primary/50 bg-card p-4" onSubmit={e=>{e.preventDefault();void send('CREATE',undefined,{name,goalDescription:goal,description,...(projectType==='PERSONAL'?{ownerCharacterId:owner}:{coterieId:owner})})}}>
    <div className="flex items-center justify-between"><h3 className="font-serif text-xl">Criar Projeto</h3><button type="button" aria-label="Fechar formulário" onClick={()=>setCreating(false)}><X className="size-4"/></button></div>
    <div className="grid gap-3 sm:grid-cols-2">
     <label className="flex flex-col gap-1 text-xs">Tipo<select className="input" value={projectType} onChange={e=>{setProjectType(e.target.value as 'PERSONAL'|'COTERIE');setOwner('');clearRetry()}}><option value="PERSONAL">Pessoal</option><option value="COTERIE">Da Coterie</option></select></label>
     <label className="flex flex-col gap-1 text-xs">{projectType==='PERSONAL'?'Personagem':'Coterie'}<select className="input" required value={owner} onChange={e=>{setOwner(e.target.value);clearRetry()}}><option value="">Selecione…</option>{(projectType==='PERSONAL'?data.characters:data.coteries).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    </div>
    <label className="flex flex-col gap-1 text-xs">Nome do projeto<input className="input" required maxLength={140} value={name} onChange={e=>{setName(e.target.value);clearRetry()}}/></label>
    <label className="flex flex-col gap-1 text-xs">Objetivo<input className="input" required maxLength={1000} value={goal} onChange={e=>{setGoal(e.target.value);clearRetry()}}/></label>
    <label className="flex flex-col gap-1 text-xs">Descrição<textarea className="input min-h-20" maxLength={2000} value={description} onChange={e=>{setDescription(e.target.value);clearRetry()}}/></label>
    <p className="text-xs text-muted-foreground">O projeto nasce como rascunho. Após o envio, o Narrador aprova a mecânica de Scope, Launch e Stake.</p>
    <button className="button-primary" type="submit" disabled={busy||!owner||!name.trim()||!goal.trim()}>{busy?'Salvando…':'Criar rascunho'}</button>
   </form>}
   <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/70 p-2.5">
    <div role="group" aria-label="Relação com os projetos" className="flex flex-wrap gap-1.5">{([
      {id:'ALL',label:'Todos'},{id:'MINE',label:'Meus'},{id:'PARTNER',label:'Em parceria'},{id:'COTERIE',label:'Da Coterie'}
    ] as const).map(item=><button key={item.id} type="button" aria-pressed={filter===item.id} onClick={()=>{setFilter(item.id);setOpened(null)}} className={'rounded-full border px-3 py-1.5 text-xs transition '+(filter===item.id?'border-rose-600/70 bg-red-950/70 text-rose-100 shadow-[0_0_14px_#9f123944]':'border-border/70 bg-background/50 text-muted-foreground hover:border-rose-800 hover:text-foreground')}>{item.label} ({counts[item.id]})</button>)}</div>
    <label className="relative flex items-center gap-2"><span className="sr-only">Filtrar por status</span><select className="input min-w-40 pr-8 text-xs" value={status} onChange={e=>{setStatus(e.target.value);setOpened(null)}}><option value="ALL">Status: Todos</option>{Object.entries(statuses).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select><ChevronDown className="pointer-events-none absolute right-2 size-3.5 text-muted-foreground" aria-hidden="true"/></label>
   </div>
   <div className="space-y-2.5">{visible.map(p=>{
    const Icon=p.playerRelation==='COTERIE'?Users:p.playerRelation==='PARTNER'?Handshake:p.status==='DRAFT'?BookOpen:Landmark
    const progress=p.status==='SUCCESS'?10:p.projectDie===null?0:Math.max(0,10-p.projectDie)
    const relation=p.playerRelation==='COTERIE'?'Coterie: '+(p.coterieName??'—'):p.playerRelation==='PARTNER'?'Projeto em parceria':'Projeto pessoal'
    const projectDots=p.currentDots!=null&&p.finalDots!=null?' · '+p.currentDots+' → '+p.finalDots+' dots':''
    return <article key={p.id} className={'rounded-xl border bg-card/90 shadow-sm transition '+(opened===p.id?'border-rose-600/80 shadow-[0_0_16px_#991b1b33]':'border-border/80 hover:border-rose-900/70')}>
     <div className="flex items-center gap-3 p-3">
      <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-red-900/50 bg-red-950/50 text-rose-300"><Icon className="size-5" aria-hidden="true"/></div>
      <button className="min-w-0 flex-1 text-left" type="button" onClick={()=>open(p)} aria-expanded={opened===p.id}>
       <strong className="block truncate text-sm font-semibold">{p.name}</strong>
       <span className="block truncate text-[11px] text-muted-foreground">{relation} · {p.targetTrait??p.goalDescription}{projectDots}</span>
       <span className="mt-2 flex items-center gap-3"><span className="h-1.5 w-full max-w-60 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-rose-500" style={{width:progress*10+'%'}}/></span><span className="shrink-0 text-[11px] text-muted-foreground">{progress} / 10 increments</span></span>
      </button>
      <div className="flex shrink-0 items-center gap-2"><span className="hidden text-xs text-muted-foreground sm:block">{p.projectDie!=null?'Die: '+p.projectDie:'—'}</span><span className={'rounded-full border px-2.5 py-1 text-[11px] '+tones[p.status]}>{statuses[p.status]}</span><button className="rounded-md p-1.5 hover:bg-primary/10" type="button" aria-label={'Ações de '+p.name} onClick={()=>open(p)} aria-expanded={opened===p.id}><MoreVertical className="size-4"/></button></div>
     </div>
     {opened===p.id&&<div className="space-y-3 border-t border-border/70 p-4 text-sm">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">Objetivo do projeto</p><p>{p.goalDescription}</p></div><button type="button" aria-label="Fechar detalhes" onClick={()=>setOpened(null)}><X className="size-4"/></button></div>
      {p.description&&<p className="text-muted-foreground">{p.description}</p>}
      <div className="grid gap-2 text-xs sm:grid-cols-3"><div className="rounded-lg border border-border p-2"><span className="text-muted-foreground">Project Die</span><p className="font-semibold">{p.projectDie??'—'}</p></div><div className="rounded-lg border border-border p-2"><span className="text-muted-foreground">Próximo Increment</span><p className="font-semibold">{p.incrementUnit?p.incrementValue+' '+(units[p.incrementUnit]??p.incrementUnit):'A definir'}</p></div><div className="rounded-lg border border-border p-2"><span className="text-muted-foreground">Stake reservado</span><p className="font-semibold">{p.stakes.filter(s=>!s.releasedAt).reduce((sum,s)=>sum+Number(s.dots),0)} ponto(s)</p></div></div>
      <p className="text-xs"><Users className="mr-1 inline size-4" aria-hidden="true"/>Participantes: {p.participants.map(x=>x.name).concat(p.npcParticipants.map(x=>x.name+' (NPC)')).join(', ')||'Não definidos'}</p>
      {p.status==='DRAFT'&&canEdit(p)&&!data.archived&&<div className="flex flex-wrap items-center gap-2">
       <button type="button" className="button-primary" disabled={busy} onClick={()=>void send('SUBMIT',p)}><ShieldCheck className="size-4"/>Enviar ao Narrador</button>
       <button type="button" className="button-ghost" onClick={()=>setEditing(v=>!v)} disabled={busy}>Editar rascunho</button>
      </div>}
      {editing&&canEdit(p)&&p.status==='DRAFT'&&<form className="space-y-2 rounded-lg border border-border p-3" onSubmit={e=>{e.preventDefault();void send('UPDATE_DRAFT',p,{name:details.name,goalDescription:details.goal,description:details.description})}}>
       <label className="flex flex-col gap-1 text-xs">Nome<input required maxLength={140} className="input" value={details.name} onChange={e=>{setDetails(d=>({...d,name:e.target.value}));clearRetry()}}/></label>
       <label className="flex flex-col gap-1 text-xs">Objetivo<input required maxLength={1000} className="input" value={details.goal} onChange={e=>{setDetails(d=>({...d,goal:e.target.value}));clearRetry()}}/></label>
       <label className="flex flex-col gap-1 text-xs">Descrição<textarea maxLength={2000} className="input" value={details.description} onChange={e=>{setDetails(d=>({...d,description:e.target.value}));clearRetry()}}/></label>
       <button className="button-primary" type="submit" disabled={busy||!details.name.trim()||!details.goal.trim()}>Salvar alterações</button>
      </form>}
      {p.status==='ACTIVE'&&!p.goalRollRequested&&!data.archived&&<button type="button" className="button-ghost" disabled={busy} onClick={()=>void send('REQUEST_GOAL',p)}><ScrollText className="size-4"/>Solicitar Goal Roll ao Narrador</button>}
      {p.goalRollRequested&&<p className="flex items-center gap-2 text-amber-200"><Clock3 className="size-4"/>Goal Roll solicitado. Aguardando resolução pelo Narrador.</p>}
      {p.status==='AWAITING_APPROVAL'&&<p className="text-amber-200">Aguardando aprovação, lançamento ou confirmação de Stake pelo Narrador.</p>}
      {p.events.length>0&&<details className="rounded-lg border border-border/70 p-3"><summary className="cursor-pointer text-xs font-semibold">Histórico ({p.events.length})</summary><ol className="mt-2 space-y-2">{p.events.map((event,i)=><li key={i} className="border-l-2 border-rose-900 pl-2 text-xs">{event.description||event.type}</li>)}</ol></details>}
     </div>}
    </article>
   })}
   {!visible.length&&<div className="rounded-xl border border-border/70 bg-card/60 py-10 text-center text-sm text-muted-foreground"><FolderKanban className="mx-auto mb-3 size-9 opacity-60" aria-hidden="true"/>{projects.length?'Nenhum projeto corresponde aos filtros.':'Você ainda não possui projetos relacionados a esta mesa.'}</div>}
   </div>
   <p className="text-xs text-muted-foreground">Os pontos de Stake de cada personagem são reservados pelo Narrador após o Launch Roll. Você pode acompanhar o compromisso, mas não debitar ou alterar pontos diretamente.</p>
   {retryRequest&&!busy&&<button className="button-ghost text-xs" type="button" onClick={()=>void send(retryRequest.action,undefined,{})}>Reenviar operação pendente</button>}
  </>}
 </section>
}
