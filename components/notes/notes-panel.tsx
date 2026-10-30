'use client'

import { useEffect, useRef, useState } from 'react'
import { useUser } from '@auth0/nextjs-auth0/client'
import useSWR, { SWRConfig, useSWRConfig } from 'swr'
import Link from 'next/link'
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
  const endpoint = link ? `/api/notes/links?targetType=${link.targetType}&targetId=${link.targetId}&page=${page}` : `/api/notes?page=${page}${initialCampaignId?`&campaignId=${initialCampaignId}`:""}`
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

  function reset() { setCurrent(null); setTitle(''); setBody(''); setCampaignId(initialCampaignId); setVisibility('PRIVATE'); setRecipients([]); setLinks(link?[link]:[]); setMessage(''); creationKey.current = crypto.randomUUID() }

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
      setCurrent(note); setTitle(note.title); setBody(note.body ?? ''); setCampaignId(note.campaignId ?? ''); setVisibility(note.visibility); setRecipients(note.recipientUserIds ?? []); setLinks((note.links ?? []).map(({ targetType, targetId }) => ({ targetType, targetId }))); setMessage('')
    } catch (error_) { setMessage(error_ instanceof Error ? error_.message : 'Não foi possível abrir a anotação.') }
    finally { setBusy(false) }
  }

  async function save(remove = false) {
    if (remove && !window.confirm('Excluir definitivamente esta anotação?')) { return }
    if (!remove && visibility === 'SHARED' && !window.confirm(`Confirmar compartilhamento somente leitura com: ${recipients.join(', ') || 'nenhum destinatário'}?`)) { return }
    setBusy(true)
    try {
      const url = current ? `/api/notes/${current.id}` : '/api/notes'
      const { requestMethod,payload }=prepareNoteRequest(title,body,visibility,recipients,links,current,campaignId,creationKey,remove)
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
  if ([401, 403].includes(error?.status)) { return <p role="alert">Sua sessão não permite acessar as anotações. Recarregue após entrar novamente.</p> }
  return <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
    <section className="border border-border bg-card p-5"><h2 className="font-serif text-xl">Suas anotações</h2><p className="mt-2 text-sm text-muted-foreground">Privadas por padrão, sem acesso implícito do Narrador.</p>
      <button type="button" className="button-ghost mt-4" disabled={busy} onClick={() => { if (!(title || body) || window.confirm('Descartar alterações não salvas?')) { reset() } }}>Nova anotação</button>
      {error && <p role="alert">{error.message}</p>}{!data && !error && <output>Carregando...</output>}{data?.total === 0 && <p className="empty-state mt-4">Nenhuma anotação disponível.</p>}
      <ul className="mt-4 flex flex-col gap-2">{data?.notes.map(note => {
        let visibilityLabel
        if (note.visibility === 'PRIVATE') {
          visibilityLabel = 'Privada'
        } else if (note.visibility === 'SHARED') {
          visibilityLabel = 'Compartilhada'
        } else {
          visibilityLabel = 'Exclusiva do Narrador'
        }
        return <li key={note.id}><button type="button" className="button-ghost w-full text-left" disabled={busy} onClick={() => void open(note.id)}>{note.title} · {visibilityLabel}</button></li>
      })}</ul>
      <div className="mt-4 flex gap-3"><button type="button" className="button-ghost" disabled={busy || page === 1} onClick={() => setPage(value => value - 1)}>Anterior</button><button type="button" className="button-ghost" disabled={busy || !data || page * 20 >= data.total} onClick={() => setPage(value => value + 1)}>Próxima</button></div>
      {link && <Link className="button-ghost mt-3 inline-flex" href="/notes">Ver todas as anotações</Link>}
    </section>
    <section className="border border-border bg-card p-5"><h2 className="font-serif text-xl">{current ? 'Anotação selecionada' : 'Nova anotação'}</h2><form className="mt-4 flex flex-col gap-4" onSubmit={event => { event.preventDefault(); void save() }}>
      <label className="sheet-field"><span>Título</span><input required maxLength={120} value={title} disabled={busy} readOnly={current !== null && !current.canEdit} onChange={event => setTitle(event.target.value)} /></label>
      <label className="sheet-field"><span>Texto</span><textarea rows={8} maxLength={20000} value={body} disabled={busy} readOnly={current !== null && !current.canEdit} onChange={event => setBody(event.target.value)} /></label>
      <label className="sheet-field"><span>Mesa</span><select className="select" value={campaignId} disabled={readOnly || Boolean(current?.campaignId)} onChange={event => { setCampaignId(event.target.value); setRecipients([]); setLinks([]); setVisibility('PRIVATE') }}><option value="">Independente</option>{context?.campaigns.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
      <label className="sheet-field"><span>Quem pode ler</span><select className="select" value={visibility} disabled={readOnly || !!current?.reveal || current?.visibility === 'NARRATOR_ONLY'} onChange={event => { setVisibility(event.target.value); if (event.target.value !== 'SHARED') { setRecipients([]) } }}><option value="PRIVATE">Somente eu</option>{campaignId && <option value="SHARED">Destinatários escolhidos (somente leitura)</option>}{campaign?.isNarrator && (!current || current.visibility === 'NARRATOR_ONLY') && <option value="NARRATOR_ONLY">Somente o Narrador atual da mesa</option>}</select></label>
      {visibility === 'SHARED' && <fieldset><legend>Destinatários autorizados</legend>{campaign?.recipients.map(user => <label key={user} className="mt-2 flex gap-2 text-sm"><input type="checkbox" disabled={readOnly} checked={recipients.includes(user)} onChange={event => setRecipients(values => event.target.checked ? [...values, user] : values.filter(value => value !== user))} />{user}</label>)}</fieldset>}
      <fieldset><legend>Vínculos</legend><p className="mb-3 text-xs text-muted-foreground">Opcional: salve a anotação mesmo sem marcar vínculos.</p>{targets.map(target => <label key={`${target.targetType}:${target.targetId}`} className="mt-2 flex gap-2 text-sm"><input type="checkbox" disabled={readOnly || !!current?.reveal} checked={links.some(link => link.targetId === target.targetId && link.targetType === target.targetType)} onChange={event => setLinks(values => event.target.checked ? [...values, { targetType: target.targetType, targetId: target.targetId }] : values.filter(link => link.targetId !== target.targetId))} />{target.label}</label>)}</fieldset>
      <div className="flex flex-wrap gap-3"><button className="button-primary" type="submit" disabled={readOnly || !title.trim()}>Salvar</button>{current?.canDelete && <button className="action-delete" style={{ minHeight: 40, flex: 'none' }} type="button" disabled={busy} onClick={() => void save(true)}>Excluir</button>}</div>
      {message && <output className="block text-sm">{message}</output>}
    </form>{current&&<div className="mt-6 border-t border-border pt-5">{current.reveal&&<p className="mb-4 text-sm text-muted-foreground">Revelação {current.reveal.revealed?'revelada':'não revelada'} · controle de visibilidade na sessão.</p>}{current.reveal?.mediaId&&<img className="mb-4 max-h-96 w-full object-contain" src={`/api/sheet-media/${current.reveal.mediaId}`} alt={current.title}/>}<SheetMediaPanel key={current.id} subjectType="NOTE" subjectId={current.id}/></div>}{!current&&<p className="mt-4 text-sm text-muted-foreground">Salve a anotação para adicionar imagens.</p>}</section>
  </div>
}

function prepareNoteRequest(title: string,body: string,visibility: string,recipients: string[],links: NoteLink[],current: { recipientUserIds?: string[]; body?: string; links?: { label: string; targetType: "CHARACTER"|"NPC"|"EVENT"|"SESSION"; targetId: string }[]; id: string; title: string; campaignId: string|null; visibility: "PRIVATE"|"NARRATOR_ONLY"|"SHARED"; revision: number; createdAt: string; updatedAt: string; canEdit: boolean; canDelete: boolean; canShare: boolean }|null,campaignId: string,creationKey: {current:string},remove: boolean) {
  const fields={ title,body,visibility,recipientUserIds: recipients,links,...(!current?.campaignId? { campaignId: campaignId||null }:{}) }
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
