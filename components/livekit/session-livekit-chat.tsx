'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useChat, useLocalParticipant } from '@livekit/components-react'
import { Send } from 'lucide-react'

/**
 * Renders inside the LiveKitRoom provider and portals only its UI to the
 * Narrator's fixed chat column. No second room connection or storage.
 * LiveKit clears chat messages on disconnect, as intended for session chat.
 */
export function SessionLiveKitChat({ targetId }: Readonly<{ targetId: string }>) {
  const { chatMessages, send, isSending } = useChat()
  const { localParticipant } = useLocalParticipant()
  const [target, setTarget] = useState<HTMLElement | null>(null)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTarget(document.getElementById(targetId))
  }, [targetId])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [chatMessages])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const message = draft.trim()
    if (!message || isSending) return
    setError('')
    try {
      await send(message)
      setDraft('')
    } catch {
      setError('Não foi possível enviar a mensagem. Confira a conexão e tente novamente.')
    }
  }

  if (!target) return null

  return createPortal(
    <div className="session-livekit-chat" aria-label="Mensagens do LiveKit">
      <div className="session-livekit-chat-status" role="status">
        <span aria-hidden="true" className="session-livekit-online" />
        Conectado ao chat da sala · mensagens temporárias
      </div>
      <div ref={logRef} className="session-chat-log session-livekit-chat-log" role="log" aria-live="polite" aria-relevant="additions">
        {chatMessages.length === 0 && <p className="session-chat-empty">Nenhuma mensagem ainda. Envie a primeira mensagem da sessão.</p>}
        {chatMessages.map((entry, index) => {
          const ownMessage = entry.from?.identity === localParticipant.identity
          const author = ownMessage ? 'Você' : (entry.from?.name || entry.from?.identity || 'Participante')
          return <article key={`${entry.timestamp}-${index}`} className={`session-livekit-message ${ownMessage ? 'session-livekit-message-own' : ''}`}>
            <div className="session-livekit-message-meta"><strong>{author}</strong><time>{new Date(entry.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time></div>
            <p>{entry.message}</p>
          </article>
        })}
      </div>
      <form className="session-livekit-compose" onSubmit={event => void submit(event)}>
        <label className="sr-only" htmlFor="session-livekit-chat-input">Mensagem da mesa</label>
        <textarea id="session-livekit-chat-input" value={draft} onChange={event => setDraft(event.target.value)} rows={2} maxLength={2000} placeholder="Digite uma mensagem..." onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit() } }} />
        <button type="submit" aria-label="Enviar mensagem" disabled={!draft.trim() || isSending}><Send className="size-4" aria-hidden="true"/></button>
      </form>
      {error && <p className="session-chat-error" role="alert">{error}</p>}
    </div>,
    target,
  )
}
