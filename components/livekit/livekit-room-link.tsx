'use client'

import { Check, Copy, Video } from 'lucide-react'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { LiveKitRoom } from './livekit-room'

type RoomInfo = { roomName: string; roomUrl: string; isHost: boolean; token: string }
type CallStatus = { active: boolean; canSummon: boolean }
const fetcher = async (url: string): Promise<CallStatus> => {
  const response = await fetch(url)
  const body = await response.json()
  if (!response.ok) throw new Error(body.error ?? 'Não foi possível consultar a convocação.')
  return body
}

export function LiveKitRoomLink({ campaignId, master, campaignName }: { campaignId: string; master: boolean; campaignName?: string | null }) {
  return <RoomPanel key={campaignId} campaignId={campaignId} master={master} campaignName={campaignName} />
}

function RoomPanel({ campaignId, master, campaignName }: { campaignId: string; master: boolean; campaignName?: string | null }) {
  const endpoint = `/api/campaigns/${campaignId}/call`
  const { data: status, error: statusError, mutate } = useSWR(endpoint, fetcher, { refreshInterval: 5000 })
  const [room, setRoom] = useState<RoomInfo | null>(null)
  const [joined, setJoined] = useState(false)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canEnter = Boolean(status && !statusError && (status.canSummon || status.active))

  useEffect(() => {
    if (!canEnter) { setJoined(false); setRoom(null) }
  }, [canEnter])

  async function enterRoom() {
    if (loading || !canEnter) return
    setLoading(true)
    setError(null)
    try {
      const method = status?.canSummon ? 'POST' : 'GET'
      const response = await fetch(method === 'GET' ? `/api/livekit/room?campaignId=${encodeURIComponent(campaignId)}` : '/api/livekit/room', { method, headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined, body: method === 'POST' ? JSON.stringify({ campaignId }) : undefined })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? 'Não foi possível acessar a sala virtual.')
      setRoom(body)
      setJoined(true)
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Falha de conexão. Tente novamente.') }
    finally { setLoading(false) }
  }

  async function summon() {
    if (loading || !status?.canSummon) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(endpoint, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !status.active }) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? 'Não foi possível alterar a convocação.')
      await mutate(body, { revalidate: false })
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Falha de conexão. Tente novamente.') }
    finally { setLoading(false) }
  }

  return <section aria-labelledby={`virtual-room-${campaignId}`} className="border border-border bg-card p-6">
    <p className="eyebrow">Comunicação</p><h2 id={`virtual-room-${campaignId}`} className="mt-2 font-serif text-2xl">Mesa virtual{campaignName ? ` · ${campaignName}` : ''}</h2>
    <p className="mt-2 text-sm text-muted-foreground">{status?.active ? 'O Narrador convocou os participantes para a sessão da mesa.' : 'Aguardando convocação do Narrador.'}</p>
    {(error || statusError) && <p role="alert" className="mt-4 text-sm text-primary">{error ?? statusError.message}</p>}
    <div className="mt-5 flex flex-wrap gap-3">
      {status?.canSummon && <button type="button" className="button-ghost" disabled={loading} onClick={() => void summon()}>{status.active ? 'Encerrar convocação' : 'Convocar jogadores'}</button>}
      {!joined && <button type="button" className="button-primary inline-flex items-center gap-2" onClick={() => void enterRoom()} disabled={loading || !canEnter}><Video className="size-4" aria-hidden="true" />{loading ? 'Preparando sala...' : status?.canSummon || master ? 'Entrar como host' : 'Entrar na sessão da mesa'}</button>}
      <button type="button" className="button-ghost inline-flex items-center gap-2" onClick={async () => {
        try { await navigator.clipboard.writeText(`${window.location.origin}/characters`); setCopied(true); window.setTimeout(() => setCopied(false), 1800) }
        catch { setError('Não foi possível copiar o link.') }
      }}><Copy className="size-4" aria-hidden="true" />{copied ? <><Check className="size-4" aria-hidden="true" /> Link copiado</> : 'Copiar link para participantes'}</button>
    </div>
    {joined && canEnter && room && <div className="mt-6"><LiveKitRoom token={room.token} serverUrl={room.roomUrl} onDisconnected={() => { setJoined(false); setRoom(null) }} /></div>}
    {status?.canSummon && <p className="mt-3 text-xs text-muted-foreground">Prepare a sala entrando como host. Encerrar a convocação bloqueia novas entradas, mas não revoga tokens já emitidos.</p>}
  </section>
}
