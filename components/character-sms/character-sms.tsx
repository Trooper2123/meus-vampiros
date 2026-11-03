'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { MessageSquareText, Send, Shield, UserRound, Users, RefreshCw } from 'lucide-react'

type Contact = {id:string;name:string;characterType:string;owned:boolean}
type Thread = {id:string;kind:string;updatedAt:string;characterA:string;characterB:string;unreadCount:number}
type Message = {id:string;body:string;senderCharacterId:string;senderName:string;createdAt:string;narratorOperated:boolean|null}
type Inbox = {enabled:boolean;isNarrator:boolean;threads:Thread[]}
type Contacts = {enabled:boolean;isNarrator:boolean;characters:Contact[]}
type History = {enabled:boolean;isNarrator:boolean;thread:{id:string;characterA:string;characterB:string;characterAId:string;characterBId:string};messages:Message[]}
const get = async (url:string) => {
  const r=await fetch(url,{cache:'no-store'})
  const body=await r.json().catch(()=>({}))
  if(!r.ok)throw new Error(body.error??'Não foi possível acessar as mensagens.')
  return body
}
function displayError(error:unknown){return error instanceof Error?error.message:'Não foi possível concluir a operação.'}

export function CharacterSms({campaignId,mode='player'}:Readonly<{campaignId:string;mode?:'player'|'narrator'}>) {
  const base=`/api/campaigns/${campaignId}/character-sms`
  const viewSuffix=mode==='player'?'?view=player':''
  const threadUrl=useCallback((id:string)=>base+'/'+id+viewSuffix,[base,viewSuffix])
  const contactsUrl=base+'/contacts'+viewSuffix
  const inboxUrl=base+viewSuffix
  const [threadId,setThreadId]=useState<string|null>(null)
  const [senderId,setSenderId]=useState('')
  const [recipientId,setRecipientId]=useState('')
  const [body,setBody]=useState('')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const {data:inbox,error:inboxError,mutate:refreshInbox}=useSWR<Inbox>(inboxUrl,get,{refreshInterval:10000})
  const {data:contacts,error:contactsError}=useSWR<Contacts>(contactsUrl,get,{refreshInterval:30000})
  const {data:history,error:historyError,mutate:refreshHistory}=useSWR<History>(threadId?threadUrl(threadId):null,get,{refreshInterval:10000})
  const isNarrator=mode==='narrator' && inbox?.isNarrator===true
  const allContacts=contacts?.characters??[]
  const senders=isNarrator?allContacts:allContacts.filter(c=>c.owned&&c.characterType==='PLAYER_VAMPIRE')
  const currentSender=senders.some(c=>c.id===senderId)?senderId:(senders[0]?.id??'')
  const recipients=allContacts.filter(c=>c.id!==currentSender)
  const selectedRecipient=recipients.some(c=>c.id===recipientId)?recipientId:(recipients[0]?.id??'')
  const replySenders=isNarrator?senders:senders.filter(c=>history?.thread && [history.thread.characterAId,history.thread.characterBId].includes(c.id))
  const replySender=replySenders.some(c=>c.id===senderId)?senderId:(replySenders[0]?.id??'')
  const count=useMemo(()=>inbox?.threads.reduce((sum,t)=>sum+Number(t.unreadCount??0),0)??0,[inbox])
  const messages=history?.messages??[]
  const latestMessageId=messages.at(-1)?.id

  useEffect(()=>{
    if(!threadId||!latestMessageId||!inbox?.enabled)return
    let active=true
    async function markRead(){
      const response=await fetch(threadUrl(threadId),{method:'PATCH',headers:{'Content-Type':'application/json'},body:'{}'})
      if(active&&response.ok)void refreshInbox()
    }
    void markRead()
    return ()=>{active=false}
  },[threadId,latestMessageId,threadUrl,inbox?.enabled,refreshInbox])

  async function createConversation(){
    if(!currentSender||!selectedRecipient||busy)return
    setBusy(true);setError('')
    try{
      const response=await fetch(inboxUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({senderCharacterId:currentSender,recipientCharacterId:selectedRecipient})})
      const data=await response.json().catch(()=>({}))
      if(!response.ok)throw new Error(data.error??'Não foi possível criar a conversa.')
      setThreadId(data.id);setBody('')
      await refreshInbox()
    }catch(e){setError(displayError(e))}finally{setBusy(false)}
  }

  async function send(){
    if(!threadId||!replySender||!body.trim()||busy)return
    setBusy(true);setError('')
    try{
      const response=await fetch(threadUrl(threadId),{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({senderCharacterId:replySender,body:body.trim(),idempotencyKey:crypto.randomUUID()})})
      const data=await response.json().catch(()=>({}))
      if(!response.ok)throw new Error(data.error==='SMS_DISABLED'?'Mensagens desativadas pelo Narrador.':data.error??'Não foi possível enviar.')
      setBody('');await Promise.all([refreshInbox(),refreshHistory()])
    }catch(e){setError(displayError(e))}finally{setBusy(false)}
  }

  const disabled=inbox?.enabled===false
  return <section className="sms-shell" aria-label={isNarrator?'Mensagens da Mesa':'Mensagens entre personagens'}>
    <header className="sms-heading"><div><p className="eyebrow">SMS da crônica</p><h2><MessageSquareText className="size-6"/>Mensagens entre personagens</h2><p>{isNarrator?'Todas as conversas da campanha e respostas como NPCs ou outros personagens.':'Conversas dos seus personagens, incluindo mensagens enviadas pelo Narrador usando a identidade deles.'}</p></div><button type="button" className="button-ghost" onClick={()=>{void refreshInbox();void refreshHistory()}} aria-label="Atualizar mensagens"><RefreshCw className="size-4"/></button></header>
    <p className="sms-privacy"><Shield className="size-4"/>O Narrador pode consultar todas as conversas da campanha, inclusive as diretas.</p>
    {disabled&&<p className="sms-disabled" role="status">Mensagens desativadas pelo Narrador. O histórico permanece disponível somente para leitura.</p>}
    {inboxError&&<p role="alert" className="sms-error">{displayError(inboxError)}</p>}
    {contactsError&&<p role="alert" className="sms-error">{displayError(contactsError)}</p>}
    <div className="sms-layout">
      <aside className="sms-inbox"><h3>Conversas {count>0&&!disabled&&<span className="sms-unread">{count}</span>}</h3>
        {!inbox&&!inboxError&&<p className="sms-muted">Carregando...</p>}
        {inbox&&inbox.threads.length===0&&<p className="sms-muted">Nenhuma conversa disponível.</p>}
        {inbox?.threads.map(t=><button key={t.id} type="button" className={threadId===t.id?'sms-thread active':'sms-thread'} onClick={()=>{setThreadId(t.id);setError('')}}><UserRound className="size-5"/><span><strong>{t.characterA} · {t.characterB}</strong><small>{new Date(t.updatedAt).toLocaleString('pt-BR')}</small></span>{Number(t.unreadCount)>0&&!disabled&&<b className="sms-unread">{t.unreadCount}</b>}</button>)}
      </aside>
      <div className="sms-conversation">
        <div className="sms-compose-new">
          <h3>Nova conversa direta</h3>
          <div className="sms-fields">
            <label>Falar como <select value={currentSender} onChange={e=>setSenderId(e.target.value)} disabled={disabled||busy}>{senders.map(c=><option key={c.id} value={c.id}>{c.name}{isNarrator?' · '+c.characterType:''}</option>)}</select></label>
            <label>Enviar para <select value={selectedRecipient} onChange={e=>setRecipientId(e.target.value)} disabled={disabled||busy}>{recipients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <button type="button" className="button-ghost" disabled={disabled||busy||!currentSender||!selectedRecipient} onClick={()=>void createConversation()}>Abrir conversa</button>
          </div>
          <p className="sms-muted"><Users className="size-4"/>Mensagens para toda a Coterie serão disponibilizadas quando o módulo de membros da Coterie estiver ativo.</p>
        </div>
        {threadId&&<div className="sms-thread-content">
          <h3>{history?.thread.characterA} · {history?.thread.characterB}</h3>
          {historyError&&<p role="alert" className="sms-error">{displayError(historyError)}</p>}
          {!history&&!historyError&&<p className="sms-muted">Carregando conversa...</p>}
          <div className="sms-messages" role="log" aria-live="polite">
            {history&&messages.length===0&&<p className="sms-muted">Envie a primeira mensagem.</p>}
            {messages.map(m=><article key={m.id} className={m.senderCharacterId===replySender?'sms-bubble mine':'sms-bubble'}><strong>{m.senderName}</strong><p>{m.body}</p><small>{new Date(m.createdAt).toLocaleString('pt-BR')}{isNarrator&&m.narratorOperated?' · Enviado pelo Narrador':''}</small></article>)}
          </div>
          <form className="sms-write" onSubmit={e=>{e.preventDefault();void send()}}>
            <label className="sms-reply-as">Falar como <select value={replySender} onChange={e=>setSenderId(e.target.value)} disabled={disabled||busy}>{replySenders.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label className="sr-only" htmlFor="sms-draft">Mensagem</label>
            <textarea id="sms-draft" value={body} onChange={e=>setBody(e.target.value)} disabled={disabled||busy} maxLength={2000} placeholder={disabled?'Mensagens desativadas':'Escreva uma mensagem como o personagem selecionado...'} rows={3}/>
            <button type="submit" className="button-primary" disabled={disabled||busy||!body.trim()||!replySender}><Send className="size-4"/>Enviar</button>
          </form>
        </div>}
        {!threadId&&<p className="sms-muted sms-placeholder">Selecione uma conversa ou inicie uma nova.</p>}
        {error&&<p role="alert" className="sms-error">{error}</p>}
      </div>
    </div>
  </section>
}
