'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function DuplicateCharacterButton({ characterId }: Readonly<{ characterId: string }>) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function duplicate() {
    setPending(true)
    setError(null)
    try {
      const response = await fetch(`/api/characters/${characterId}/duplicate`, { method: 'POST' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? 'Não foi possível duplicar a ficha.')
      router.push(`/characters/${body.id}/edit`)
      router.refresh()
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Não foi possível duplicar a ficha.')
    } finally {
      setPending(false)
    }
  }

  return <div className="mt-4 border-t border-border pt-4"><button type="button" className="button-ghost" disabled={pending} onClick={() => void duplicate()}>{pending ? 'Duplicando...' : 'Duplicar'}</button>{error && <p role="alert" className="mt-2 text-sm text-primary">{error}</p>}</div>
}
