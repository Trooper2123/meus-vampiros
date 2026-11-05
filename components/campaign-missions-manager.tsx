'use client'

import Link from 'next/link'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, CirclePlus, RefreshCw, Save, XCircle } from 'lucide-react'

type Status = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
type Visibility = 'NARRATOR_ONLY' | 'ASSIGNED' | 'CAMPAIGN'
type Mission = {
  id: string
  title: string
  description: string
  narratorNotes: string | null
  status: Status
  visibility: Visibility
  revision: number
  characterIds: string[]
  npcIds: string[]
  updatedAt: string
  dueDate: string | null
  campaignEventId: string | null
  eventTitle: string | null
  eventDate: string | null
  eventFictionalYear: number | null
  eventFictionalMonth: string | null
}
type CalendarEvent = { id: string; title: string; eventDate: string | null; fictionalYear: number | null; fictionalMonth: string | null; visibility: 'master' | 'everyone' }
type CatalogItem = { id: string; name: string }
type Listing = { missions: Mission[]; canManage: boolean; timezone: string; characters: CatalogItem[]; npcs: CatalogItem[] }
type FormData = { title: string; description: string; narratorNotes: string; visibility: Visibility; characterIds: string; npcIds: string; dueDate: string; campaignEventId: string }
const emptyForm: FormData = { title: '', description: '', narratorNotes: '', visibility: 'NARRATOR_ONLY', characterIds: '', npcIds: '', dueDate: '', campaignEventId: '' }
const statuses: Record<Status, string> = { DRAFT: 'Rascunho', ACTIVE: 'Ativa', COMPLETED: 'Concluída', FAILED: 'Falhou', CANCELLED: 'Cancelada' }
const visibilityLabels: Record<Visibility, string> = { NARRATOR_ONLY: 'Apenas narrador', ASSIGNED: 'Personagens atribuídos', CAMPAIGN: 'Toda a mesa' }
const transitions: Record<Status, Status[]> = { DRAFT: ['ACTIVE', 'CANCELLED'], ACTIVE: ['COMPLETED', 'FAILED', 'CANCELLED'], COMPLETED: [], FAILED: [], CANCELLED: [] }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
function parseIds(value: string): string[] {
  const ids = value.split(/[\s,;]+/).map(item => item.trim()).filter(Boolean)
  if (ids.length > 100 || ids.some(id => !uuid.test(id)) || new Set(ids).size !== ids.length) throw new Error('Informe UUIDs válidos e únicos, separados por vírgula ou linha.')
  return ids
}

export function CampaignMissionsManager({ campaignId }: Readonly<{ campaignId: string }>) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [searchCharacter, setSearchCharacter] = useState('')
  const [searchNpc, setSearchNpc] = useState('')
  const [timezoneInput, setTimezoneInput] = useState('UTC')
  const [filter, setFilter] = useState<'ALL' | Status>('ALL')
  const url = `/api/campaigns/${encodeURIComponent(campaignId)}/missions`

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      const response = await fetch(url, { cache: 'no-store' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? 'Não foi possível carregar as missões.')
      setListing(body as Listing)
      setTimezoneInput((body as Listing).timezone ?? 'UTC')
      setError('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Erro ao carregar missões.') }
    finally { setLoading(false) }
  }, [url])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    let active = true
    void fetch(`/api/campaign-events?campaignId=${encodeURIComponent(campaignId)}`, { cache: 'no-store' })
      .then(async response => { if (!response.ok) throw new Error('Eventos indisponíveis.'); return response.json() })
      .then(data => { if (active) setEvents(data.events ?? []) })
      .catch(() => { if (active) setEvents([]) })
    return () => { active = false }
  }, [campaignId])

  async function command(body: Record<string, unknown>, message: string) {
    setPending(true); setError(''); setNotice('')
    try {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Não foi possível salvar a missão.')
      setNotice(message)
      setEditing(null)
      setForm(emptyForm)
      await load(true)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Erro ao salvar missão.') }
    finally { setPending(false) }
  }

  function edit(mission: Mission) {
    setEditing(mission.id)
    setForm({
      title: mission.title, description: mission.description, narratorNotes: mission.narratorNotes ?? '',
      visibility: mission.visibility, characterIds: mission.characterIds.join(', '), npcIds: mission.npcIds.join(', '), dueDate: mission.dueDate ?? '', campaignEventId: mission.campaignEventId ?? '',
    })
    setError(''); setNotice('')
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      const characterIds = parseIds(form.characterIds)
      const npcIds = parseIds(form.npcIds)
      const existing = listing?.missions.find(mission => mission.id === editing)
      await command({
        action: existing ? 'UPDATE' : 'CREATE',
        ...(existing ? { missionId: existing.id, expectedRevision: existing.revision } : {}),
        title: form.title, description: form.description, narratorNotes: form.narratorNotes,
        visibility: form.visibility, characterIds, npcIds, dueDate: form.dueDate || null, campaignEventId: form.campaignEventId || null,
      }, existing ? 'Missão atualizada.' : 'Missão criada.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Dados inválidos.') }
  }

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: listing?.timezone ?? 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const daysUntil = (date: string) => Math.round((Date.parse(date + 'T12:00:00Z') - Date.parse(today + 'T12:00:00Z')) / 86400000)
  const reminders = (listing?.missions ?? []).filter(m => m.status === 'ACTIVE' && ((m.dueDate && daysUntil(m.dueDate) <= 7) || (m.eventDate && daysUntil(m.eventDate) <= 7)))
  const visible = (listing?.missions ?? []).filter(mission => filter === 'ALL' || mission.status === filter)
  return <div className="campaign-module-body flex flex-col gap-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="font-serif text-xl">Missões da crônica</h3><p className="text-sm text-muted-foreground">Planeje objetivos, atribua participantes e acompanhe o progresso.</p></div>
      <div className="flex flex-wrap gap-2">
        <button className="button-ghost" type="button" disabled={pending || loading} onClick={() => void load()}><RefreshCw className="size-4" aria-hidden="true" />Atualizar</button>
        {listing?.canManage && <button className="button-primary" type="button" disabled={pending} onClick={() => { setEditing('NEW'); setForm(emptyForm); setError(''); setNotice('') }}><CirclePlus className="size-4" aria-hidden="true" />Nova missão</button>}
      </div>
    </div>
    {reminders.length > 0 && <section className="campaign-module-subsection flex flex-col gap-2" aria-label="Lembretes de prazos de missões">
      <h4 className="font-serif text-lg">Prazos e eventos próximos</h4>
      <p className="text-xs text-muted-foreground">Avisos exibidos ao acessar a campanha. Apenas missões permitidas para sua conta.</p>
      {reminders.map(mission => { const deadlines = [mission.dueDate, mission.eventDate].filter((date): date is string => Boolean(date)); const nearest = deadlines.sort()[0]; const days = daysUntil(nearest); return <p key={mission.id} className="text-sm"><a className="underline" href={`#mission-${mission.id}`}>{mission.title}</a>: {days < 0 ? `prazo vencido há ${-days} dia(s)` : days === 0 ? 'vence hoje' : `faltam ${days} dia(s)`}</p> })}
    </section>}
    {listing?.canManage && <div className="campaign-module-subsection flex flex-wrap items-end gap-3"><label className="flex flex-col gap-1 text-sm"><span>Fuso horário da campanha (IANA)</span><input className="sheet-field" value={timezoneInput} onChange={event => setTimezoneInput(event.target.value)} list="campaign-timezones" placeholder="America/Sao_Paulo" /></label><datalist id="campaign-timezones"><option value="America/Sao_Paulo"/><option value="America/Manaus"/><option value="America/Rio_Branco"/><option value="America/New_York"/><option value="Europe/Lisbon"/><option value="UTC"/></datalist><button type="button" className="button-ghost" disabled={pending} onClick={() => void command({action:'SET_TIMEZONE',timezone:timezoneInput},'Fuso horário atualizado.')}>Salvar fuso</button></div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {notice && <p role="status" className="text-sm">{notice}</p>}
    {loading && <p role="status">Carregando missões…</p>}
    {listing && <div className="flex flex-wrap gap-2 items-center">
      <label htmlFor="campaign-missions-filter" className="text-sm">Filtrar por estado</label>
      <select id="campaign-missions-filter" className="sheet-field" value={filter} onChange={event => setFilter(event.target.value as typeof filter)}>
        <option value="ALL">Todas</option>
        {Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
      <span className="text-sm text-muted-foreground">{visible.length} {visible.length === 1 ? 'missão' : 'missões'}</span>
    </div>}
    {listing?.canManage && editing && <form className="campaign-module-subsection flex flex-col gap-3" onSubmit={event => void submit(event)}>
      <h4 className="font-serif text-lg">{editing === 'NEW' ? 'Criar missão' : 'Editar missão'}</h4>
      <label className="sheet-field"><span>Título</span><input required maxLength={180} value={form.title} onChange={event => setForm(prev => ({ ...prev, title: event.target.value }))} /></label>
      <label className="sheet-field"><span>Descrição</span><textarea rows={4} maxLength={10000} value={form.description} onChange={event => setForm(prev => ({ ...prev, description: event.target.value }))} /></label>
      <label className="sheet-field"><span>Visibilidade</span><select value={form.visibility} onChange={event => setForm(prev => ({ ...prev, visibility: event.target.value as Visibility }))}>{Object.entries(visibilityLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label className="sheet-field"><span>Data da missão (calendário real, opcional)</span><input type="date" value={form.dueDate} onChange={event => setForm(prev => ({ ...prev, dueDate: event.target.value }))} /></label>
      <label className="sheet-field"><span>Vincular a evento da campanha (opcional)</span><select value={form.campaignEventId} onChange={event => setForm(prev => ({ ...prev, campaignEventId: event.target.value }))}><option value="">Nenhum evento</option>{events.map(event => <option key={event.id} value={event.id}>{event.title}{event.eventDate ? ` — ${event.eventDate}` : event.fictionalYear !== null ? ` — ${event.fictionalMonth ?? ''} ${event.fictionalYear}` : ''}</option>)}</select><span className="text-xs text-muted-foreground">Eventos fictícios ou personalizados mantêm sua data no calendário original. Para criá-los, acesse Calendário.</span></label>
      <ParticipantPicker label="Personagens atribuídos" options={listing.characters} selected={parseIds(form.characterIds)} search={searchCharacter} onSearch={setSearchCharacter} onChange={ids => setForm(prev => ({ ...prev, characterIds: ids.join(',') }))} />
      <ParticipantPicker label="NPCs relacionados" options={listing.npcs} selected={parseIds(form.npcIds)} search={searchNpc} onSearch={setSearchNpc} onChange={ids => setForm(prev => ({ ...prev, npcIds: ids.join(',') }))} />
      <label className="sheet-field"><span>Notas exclusivas do narrador</span><textarea rows={3} maxLength={10000} value={form.narratorNotes} onChange={event => setForm(prev => ({ ...prev, narratorNotes: event.target.value }))} /></label>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="button-primary" disabled={pending}><Save className="size-4" aria-hidden="true" />{pending ? 'Salvando…' : 'Salvar missão'}</button>
        <button type="button" className="button-ghost" disabled={pending} onClick={() => { setEditing(null); setError('') }}>Cancelar</button>
      </div>
    </form>}
    {!loading && listing && visible.length === 0 && <div className="campaign-module-subsection"><p className="text-sm text-muted-foreground">Nenhuma missão encontrada para este filtro.</p></div>}
    {visible.map(mission => <article id={`mission-${mission.id}`} key={mission.id} className="campaign-module-subsection flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><h4 className="font-serif text-xl">{mission.title}</h4><p className="text-xs text-muted-foreground">{statuses[mission.status]} · {visibilityLabels[mission.visibility]}</p></div>
        {listing?.canManage && <button type="button" className="button-ghost" disabled={pending} onClick={() => edit(mission)}>Editar</button>}
      </div>
      {(mission.dueDate || mission.eventTitle) && <p className="text-xs text-muted-foreground">{mission.dueDate ? `Data: ${mission.dueDate}` : ''}{mission.dueDate && mission.eventTitle ? ' · ' : ''}{mission.eventTitle ? `Evento: ${mission.eventTitle}${mission.eventDate ? ` (${mission.eventDate})` : ''}` : ''}</p>}
      {mission.campaignEventId && <Link className="button-ghost self-start" href={`/campaigns/${campaignId}?view=calendar&eventId=${mission.campaignEventId}`}>Ver evento no calendário</Link>}
      {mission.description && <p className="text-sm whitespace-pre-wrap">{mission.description}</p>}
      {listing?.canManage && mission.narratorNotes && <div className="border-l-2 pl-3"><p className="text-xs font-semibold">Notas do narrador</p><p className="text-sm whitespace-pre-wrap">{mission.narratorNotes}</p></div>}
      {mission.characterIds.length > 0 && <p className="text-xs text-muted-foreground">Personagens atribuídos: {mission.characterIds.length}</p>}
      {listing?.canManage && mission.npcIds.length > 0 && <p className="text-xs text-muted-foreground">NPCs relacionados: {mission.npcIds.length}</p>}
      {listing?.canManage && transitions[mission.status].length > 0 && <div className="flex flex-wrap gap-2">
        {transitions[mission.status].map(next => <button key={next} type="button" className="button-ghost" disabled={pending} onClick={() => void command({ action: 'TRANSITION', missionId: mission.id, expectedRevision: mission.revision, status: next }, `Missão: ${statuses[next].toLowerCase()}.`)}>
          {next === 'COMPLETED' ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <XCircle className="size-4" aria-hidden="true" />}{next === 'ACTIVE' ? 'Ativar' : statuses[next]}
        </button>)}
      </div>}
    </article>)}
  </div>
}

function ParticipantPicker({label,options,selected,search,onSearch,onChange}: Readonly<{label:string;options:CatalogItem[];selected:string[];search:string;onSearch:(value:string)=>void;onChange:(ids:string[])=>void}>) {
 const filtered=options.filter(item=>item.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))
 return <fieldset className="campaign-module-subsection flex flex-col gap-2"><legend className="font-semibold">{label}</legend>
  <input className="sheet-field" aria-label={`Buscar em ${label}`} placeholder="Buscar por nome" value={search} onChange={event=>onSearch(event.target.value)}/>
  <div className="max-h-48 overflow-y-auto flex flex-col gap-2">{filtered.map(item=><label key={item.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selected.includes(item.id)} onChange={event=>onChange(event.target.checked?[...selected,item.id]:selected.filter(id=>id!==item.id))}/><span>{item.name}</span></label>)}{filtered.length===0&&<p className="text-xs text-muted-foreground">Nenhum resultado.</p>}</div>
  <p className="text-xs text-muted-foreground">{selected.length} selecionado(s)</p>
 </fieldset>
}
