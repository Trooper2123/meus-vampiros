'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Crown, ImageIcon, Trash2 } from 'lucide-react'

export function CampaignCover({ campaignId, hasCover, variant = 'sidebar' }: Readonly<{ campaignId: string; hasCover: boolean; variant?: 'sidebar' | 'banner' }>) {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [available, setAvailable] = useState(hasCover)
  const [version, setVersion] = useState(0)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const url = `/api/campaigns/${encodeURIComponent(campaignId)}/cover`

  useEffect(() => { setAvailable(hasCover) }, [hasCover])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  async function upload(file?: File) {
    if (!file) return
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setMessage('Selecione uma imagem JPEG, PNG ou WebP de até 5 MB.')
      return
    }
    setBusy(true)
    setMessage('')
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    try {
      const response = await fetch(url, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file, cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Falha no envio.')
      setAvailable(true)
      setVersion(current => current + 1)
      setMessage('Capa atualizada.')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha no envio.')
    } finally {
      setPreview(null)
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  async function remove() {
    if (!window.confirm('Remover a capa desta mesa?')) return
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch(url, { method: 'DELETE', cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Falha ao remover.')
      setAvailable(false)
      setVersion(current => current + 1)
      setMessage('Capa removida.')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao remover.')
    } finally { setBusy(false) }
  }

  const image = preview ?? (available ? `${url}?v=${version}` : null)
  return <div className={variant === 'sidebar' ? 'campaign-cover-editor' : 'campaign-cover-editor campaign-cover-editor-banner'}>
    {variant === 'sidebar' && <div className="campaign-approved-cover-art campaign-cover-preview">
      {image ? <img src={image} alt="Capa da mesa" className="campaign-cover-image" /> : <Crown className="size-7" aria-hidden="true" />}
    </div>}
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Selecionar capa da mesa" onChange={event => void upload(event.target.files?.[0])} disabled={busy} />
    <div className="campaign-cover-actions">
      <button type="button" className="button-ghost" disabled={busy} onClick={() => input.current?.click()}><ImageIcon className="size-4" />{busy ? 'Enviando…' : image ? 'Trocar imagem da mesa' : 'Adicionar imagem da mesa'}</button>
      {available && <button type="button" className="button-ghost" disabled={busy} onClick={() => void remove()}><Trash2 className="size-4" />Remover</button>}
    </div>
    {message && <p role="status" aria-live="polite" className="mt-2 text-xs text-muted-foreground">{message}</p>}
  </div>
}
