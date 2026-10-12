'use client'

import { Check, Copy, Video } from 'lucide-react'
import { useState } from 'react'
import { LiveKitRoom } from './livekit-room'

type RoomInfo = { roomName: string; roomUrl: string; hostUserId: string; isHost: boolean; token: string }

export function LiveKitRoomLink({ campaignId, master }: { campaignId: string; master: boolean }) {
  const [room, setRoom] = useState<RoomInfo | null>(null)
  const [joined, setJoined] = useState(false)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadRoom(method: 'GET' | 'POST') {
    setLoading(true)
    setError(null)
    const response = await fetch(method === 'GET' ? `/api/livekit/room?campaignId=${encodeURIComponent(campaignId)}` : '/api/livekit/room', { method, headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined, body: method === 'POST' ? JSON.stringify({ campaignId }) : undefined })
    const body = await response.json().catch(() => ({}))
    setLoading(false)
    if (!response.ok) { setError(body.error ?? 'Não foi possível acessar a sala virtual.'); return null }
    setRoom(body)
    return body as RoomInfo
  }

  async function enterRoom() {
    const roomInfo = room ?? await loadRoom(master ? 'POST' : 'GET')
    if (roomInfo) setJoined(true)
  }

  const shareUrl = typeof window === 'undefined' ? '' : `${window.location.origin}/campaigns/${campaignId}`

  return <section aria-labelledby="virtual-room-title" className="border border-border p-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="eyebrow">Comunicação</p><h2 id="virtual-room-title" className="mt-2 font-serif text-2xl">Mesa virtual</h2><p className="mt-2 text-sm text-muted-foreground">Sala exclusiva para participantes desta campanha.</p></div>{room?.isHost && <span className="status active"><span className="status-dot" /> Você é o host</span>}</div>{error && <p role="alert" className="mt-4 text-sm text-primary">{error}</p>}{!joined ? <div className="mt-5 flex flex-wrap gap-3"><button type="button" className="button-primary inline-flex items-center gap-2" onClick={() => void enterRoom()} disabled={loading}><Video className="size-4" /> {loading ? 'Preparando sala...' : master ? 'Entrar como host' : 'Entrar na sala'}</button><button type="button" className="button-ghost inline-flex items-center gap-2" onClick={async () => { await navigator.clipboard.writeText(shareUrl); setCopied(true); window.setTimeout(() => setCopied(false), 1800) }}><Copy className="size-4" /> {copied ? <><Check className="size-4" /> Link copiado</> : 'Copiar link da mesa'}</button></div> : room && <div className="mt-6"><LiveKitRoom token={room.token} serverUrl={room.roomUrl} onDisconnected={() => setJoined(false)} /></div>}</section>
}
