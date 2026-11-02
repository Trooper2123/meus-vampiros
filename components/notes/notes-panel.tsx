'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useUser } from '@auth0/nextjs-auth0/client'
import useSWR, { SWRConfig, useSWRConfig } from 'swr'
import { SheetMediaPanel } from '@/components/sheet-media-panel'
import type { getNote, notesContext, NoteLink } from '@/lib/notes'

type NoteView = Awaited<ReturnType<typeof getNote>>
type Context = Awaited<ReturnType<typeof notesContext>>
const fetcher = async (url: string) => {
  const response = await fetch(url)
  const body = await response.json()
  if (!response.ok) { throw Object.assign(new Error(body.error ?? 'Não foi possível acessar as anotações.'), { status: response.status }) }
  return body
}
const provider = () => new Map()

export function NotesPanel({ actorId, link, initialCampaignId = '' }: Readonly<{ actorId: string; link?: NoteLink; initialCampaignId?: string }>) {
  const { user, isLoading } = useUser()
  const changedUser = actorId === 'dev|local' ? Boolean(user?.sub && user.sub !== actorId) : user?.sub !== actorId
  if (changedUser) { return <output>{isLoading ? 'Validando sessão...' : 'Sua sessão mudou. Recarregue para continuar.'}</output> }
  return <SWRConfig key={`${actorId}:${initialCampaignId}`} value={{ provider }}><NotesEditor link={link} initialCampaignId={initialCampaignId} /></SWRConfig>
}

function NotesEditor({ link, initialCampaignId }: Readonly<{ link?: NoteLink; initialCampaignId: string }>) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [marker, setMarker] = useState('')
  const filters = `&search=${encodeURIComponent(search)}`
  const endpoint = link ? `/api/notes/links?targetType=${link.targetType}&targetId=${link.targetId}&page=${page}` : `/api/notes?page=${page}${initialCampaignId?`&campaignId=${initialCampaignId}`:""}${filters}`
  const { data, error, mutate } = useSWR<{ notes: NoteView[]; total: number }>(endpoint, fetcher, { refreshInterval: 5000 })
  const { data: context } = useSWR<Context>('/api/notes/context', fetcher)
  const [current, setCurrent] = useState<NoteView | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [campaignId, setCampaignId] = useState(initialCampaignId)
  const [visibility, setVisibility] = useState('PRIVATE')
  const [recipients, setRecipients] = useState<string[]>([])
  const [links, setLinks] = useState<NoteLink[]>(link?[link]:[])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const { cache } = useSWRConfig()
  const { error: accessError } = useSWR(current ? `/api/notes/${current.id}` : null, fetcher, { refreshInterval: 5000 })
  const creationKey = useRef(crypto.randomUUID())
  const campaign = context?.campaigns.find(entry => entry.id === campaignId)
  const targets = context?.targets.filter(target => target.campaignId === (campaignId || null)) ?? []

  function reset() { setCurrent(null); setTitle(''); setBody(''); setMarker(''); setCampaignId(initialCampaignId); setVisibility('PRIVATE'); setRecipients([]); setLinks(link?[link]:[]); setMessage(''); creationKey.current = crypto.randomUUID() }

  useEffect(() => {
    if ([error?.status, accessError?.status].some(status => [401, 403, 404].includes(status))) {
      if (current) { cache.delete(`/api/notes/${current.id}`) }
      setCurrent(null); setTitle(''); setBody(''); setRecipients([]); setLinks([]); setMessage('Acesso encerrado. O conteúdo privado foi removido deste editor.')
    }
  }, [error, accessError, current, cache])

  async function open(id: string) {
    if ((title || body) && !window.confirm('Abrir outra anotação e descartar alterações não salvas?')) { return }
    setBusy(true)
    try {
      const note: NoteView = await fetcher(`/api/notes/${id}`)
      setCurrent(note); setTitle(note.title); setBody(note.body ?? ''); setMarker(note.marker ?? ''); setCampaignId(note.campaignId ?? ''); setVisibility(note.visibility); setRecipients(note.recipientUserIds ?? []); setLinks((note.links ?? []).map(({ targetType, targetId }) => ({ targetType, targetId }))); setMessage('')
    } catch (error_) { setMessage(error_ instanceof Error ? error_.message : 'Não foi possível abrir a anotação.') }
    finally { setBusy(false) }
  }

  async function save(remove = false) {
    if (remove && !window.confirm('Excluir definitivamente esta anotação?')) { return }
    if (!remove && visibility === 'SHARED' && !window.confirm(`Confirmar compartilhamento somente leitura com: ${recipients.join(', ') || 'nenhum destinatário'}?`)) { return }
    setBusy(true)
    try {
      const url = current ? `/api/notes/${current.id}` : '/api/notes'
      const { requestMethod,payload }=prepareNoteRequest(title,body,marker,visibility,recipients,links,current,campaignId,creationKey,remove)
      const response = await fetch(url, { method: requestMethod, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const saved = await response.json()
      if (!response.ok) { throw new Error(saved.error ?? 'Não foi possível salvar. Seu texto foi preservado.') }
      if (remove) { reset() }
      else { setCurrent(saved); setVisibility(saved.visibility); setRecipients(saved.recipientUserIds ?? []); setLinks((saved.links ?? []).map(({ targetType, targetId }: Readonly<NoteLink>) => ({ targetType, targetId }))) }
      await mutate()
      setMessage(remove ? 'Anotação excluída.' : 'Anotação salva.')
    } catch (error_) { setMessage(error_ instanceof Error ? error_.message : 'Falha ao salvar. Seu texto foi preservado.') }
    finally { setBusy(false) }
  }

  const readOnly = busy || (current !== null && !current.canEdit)
  const folders = useMemo(() => {
    const grouped = new Map<string, NoteView[]>()
    for (const note of data?.notes ?? []) {
      const folder = note.marker?.trim() || 'Sem marcador'
      grouped.set(folder, [...(grouped.get(folder) ?? []), note])
    }
    return [...grouped.entries()].sort(([a], [b]) => a === 'Sem marcador' ? 1 : b === 'Sem marcador' ? -1 : a.localeCompare(b, 'pt-BR'))
  }, [data?.notes])
  if ([401, 403].includes(error?.status)) { return <p role="alert">Sua sessão não permite acessar as anotações. Recarregue após entrar novamente.</p> }
  return <div className="campaign-notes-workspace">
    <section className="campaign-notes-index">
      <div className="campaign-notes-index-heading"><div><p className="eyebrow">Arquivo de registros</p><h2>Suas anotações</h2></div><button type="button" className="button-primary" disabled={busy} onClick={() => { if (!(title || body) || window.confirm('Descartar alterações não salvas?')) { reset() } }}>+ Nova anotação</button></div>
      <label className="campaign-notes-search"><span>Pesquisar nas notas</span><input value={search} placeholder="Buscar por palavra no título, conteúdo ou marcador..." onChange={event => { setSearch(event.target.value); setPage(1) }}/></label>
      {error && <p role="alert">{error.message}</p>}{!data && !error && <output>Carregando...</output>}
      {data?.total === 0 && <p className="empty-state">Nenhuma anotação encontrada.</p>}
      <div className="campaign-note-folders">{folders.map(([folder, notes]) => <details key={folder} open className="campaign-note-folder"><summary><span>▸ 📁 {folder}</span><strong>{notes.length}</strong></summary><ul>{notes.map(note => <li key={note.id}><button type="button" className={current?.id === note.id ? 'is-active' : ''} disabled={busy} onClick={() => void open(note.id)}><span><strong>{note.title}</strong><small>{note.body?.slice(0, 90) || 'Sem conteúdo'}</small></span><span className="campaign-note-visibility">{note.visibility === 'PRIVATE' ? 'Privada' : note.visibility === 'SHARED' ? 'Compartilhada' : 'Narrador'}</span></button></li>)}</ul></details>)}</div>
      <div className="campaign-notes-pagination"><button type="button" className="button-ghost" disabled={busy || page === 1} onClick={() => setPage(value => value - 1)}>« Anterior</button><span>{page}</span><button type="button" className="button-ghost" disabled={busy || !data || page * 20 >= data.total} onClick={() => setPage(value => value + 1)}>Próxima »</button></div>
    </section>
    <section className="campaign-notes-editor">
      <div className="campaign-notes-editor-heading"><div><p className="eyebrow">{current ? 'Registro selecionado' : 'Novo registro'}</p><h2>{current ? 'Editar anotação' : 'Nova anotação'}</h2></div>{marker && <span className="campaign-note-marker">📁 {marker}</span>}</div>
      <form className="campaign-notes-form" onSubmit={event => { event.preventDefault(); void save() }}>
        <label className="sheet-field"><span>Título</span><input required maxLength={120} value={title} disabled={busy} readOnly={current !== null && !current.canEdit} onChange={event => setTitle(event.target.value)} /></label>
        <label className="sheet-field"><span>Pasta / marcador</span><input maxLength={80} value={marker} placeholder="Ex.: Elysium, Pistas, Príncipe" disabled={readOnly} onChange={event => setMarker(event.target.value)} /></label>
        <label className="sheet-field"><span>Texto</span><textarea rows={10} maxLength={20000} value={body} disabled={busy} readOnly={current !== null && !current.canEdit} onChange={event => setBody(event.target.value)} /></label>
        <div className="campaign-notes-meta-grid"><label className="sheet-field"><span>Mesa</span><select className="select" value={campaignId} disabled={readOnly || Boolean(current?.campaignId)} onChange={event => { setCampaignId(event.target.value); setRecipients([]); setLinks([]); setVisibility('PRIVATE') }}><option value="">Independente</option>{context?.campaigns.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
        <label className="sheet-field"><span>Quem pode ler</span><select className="select" value={visibility} disabled={readOnly || !!current?.reveal || current?.visibility === 'NARRATOR_ONLY'} onChange={event => { setVisibility(event.target.value); if (event.target.value !== 'SHARED') { setRecipients([]) } }}><option value="PRIVATE">Somente eu</option>{campaignId && <option value="SHARED">Destinatários escolhidos</option>}{campaign?.isNarrator && (!current || current.visibility === 'NARRATOR_ONLY') && <option value="NARRATOR_ONLY">Somente o Narrador atual</option>}</select></label></div>
        {visibility === 'SHARED' && <fieldset><legend>Destinatários autorizados</legend>{campaign?.recipients.map(user => <label key={user} className="mt-2 flex gap-2 text-sm"><input type="checkbox" disabled={readOnly} checked={recipients.includes(user)} onChange={event => setRecipients(values => event.target.checked ? [...values, user] : values.filter(value => value !== user))} />{user}</label>)}</fieldset>}
        <fieldset><legend>Vínculos</legend><p className="mb-3 text-xs text-muted-foreground">Opcional: relacione esta nota a elementos da crônica.</p><div className="campaign-note-links">{targets.map(target => <label key={`${target.targetType}:${target.targetId}`}><input type="checkbox" disabled={readOnly || !!current?.reveal} checked={links.some(link => link.targetId === target.targetId && link.targetType === target.targetType)} onChange={event => setLinks(values => event.target.checked ? [...values, { targetType: target.targetType, targetId: target.targetId }] : values.filter(link => link.targetId !== target.targetId))} /><span>+ {target.label}</span></label>)}</div></fieldset>
        <div className="campaign-notes-actions"><button className="button-primary" type="submit" disabled={readOnly || !title.trim()}>Salvar alterações</button>{current && <button className="button-ghost" type="button" disabled={busy} onClick={reset}>Cancelar</button>}{current?.canDelete && <button className="action-delete" type="button" disabled={busy} onClick={() => void save(true)}>Excluir</button>}</div>
        {message && <output className="block text-sm">{message}</output>}
      </form>
      {current&&<div className="campaign-note-media">{current.reveal&&<p className="mb-4 text-sm text-muted-foreground">Revelação {current.reveal.revealed?'revelada':'não revelada'} · controle de visibilidade na sessão.</p>}{current.reveal?.mediaId&&<img className="mb-4 max-h-96 w-full object-contain" src={`/api/sheet-media/${current.reveal.mediaId}`} alt={current.title}/>}<SheetMediaPanel key={current.id} subjectType="NOTE" subjectId={current.id}/></div>}
    </section>
  </div>
}

function prepareNoteRequest(title: string,body: string,marker: string,visibility: string,recipients: string[],links: NoteLink[],current: { recipientUserIds?: string[]; body?: string; links?: { label: string; targetType: "CHARACTER"|"NPC"|"EVENT"|"SESSION"; targetId: string }[]; id: string; title: string; campaignId: string|null; visibility: "PRIVATE"|"NARRATOR_ONLY"|"SHARED"; revision: number; createdAt: string; updatedAt: string; canEdit: boolean; canDelete: boolean; canShare: boolean }|null,campaignId: string,creationKey: {current:string},remove: boolean) {
  const fields={ title,body,marker: marker.trim() || null,visibility,recipientUserIds: recipients,links,...(!current?.campaignId? { campaignId: campaignId||null }:{}) }
  const revision=current? { expectedRevision: current.revision }:{ idempotencyKey: creationKey.current }
  const payload=remove? { expectedRevision: current?.revision }:{ ...fields,...revision }
  const requestMethod=noteRequestMethod(remove,current)
  return { requestMethod,payload }
}

function noteRequestMethod(remove: boolean,current: { recipientUserIds?: string[]; body?: string; links?: { label: string; targetType: "CHARACTER"|"NPC"|"EVENT"|"SESSION"; targetId: string }[]; id: string; title: string; campaignId: string|null; visibility: "PRIVATE"|"NARRATOR_ONLY"|"SHARED"; revision: number; createdAt: string; updatedAt: string; canEdit: boolean; canDelete: boolean; canShare: boolean }|null) {
  let requestMethod
  if(remove) {
    requestMethod='DELETE'
  } else if(current) {
    requestMethod='PATCH'
  } else {
    requestMethod='POST'
  }
  return requestMethod
}

export function NotesBacklinks({ targetType, targetId }: Readonly<NoteLink>) {
  return <section className="border border-border bg-card p-4"><h3 className="font-serif text-lg">Anotações relacionadas</h3><Link className="button-ghost mt-3 inline-flex" href={`/notes?targetType=${targetType}&targetId=${targetId}`}>Consultar vínculos autorizados</Link></section>
}
