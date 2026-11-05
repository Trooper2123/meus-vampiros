'use client'

import { useEffect, useState } from 'react'
import { mutate } from 'swr'

type Settings = { enabled: boolean; canManage: boolean }

export function CampaignNpcCatalogSettings({ campaignId }: Readonly<{ campaignId: string }>) {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const url = `/api/campaigns/${encodeURIComponent(campaignId)}/npc-catalog-settings`

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    fetch(url, { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error ?? 'Não foi possível consultar a configuração.')
        if (!controller.signal.aborted) setSettings(body as Settings)
      })
      .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Erro ao carregar configuração.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [url])

  async function update(enabled: boolean) {
    if (!settings?.canManage || saving) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? 'Não foi possível salvar a configuração.')
      setSettings(previous => previous ? { ...previous, enabled: body.enabled === true } : previous)
      await mutate(`/api/npc-templates?campaignId=${encodeURIComponent(campaignId)}`)
      setNotice(enabled ? 'Catálogo global habilitado para esta mesa.' : 'Catálogo global desabilitado para esta mesa.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Erro ao salvar a configuração.')
    } finally {
      setSaving(false)
    }
  }

  return <section className="campaign-module-subsection" aria-labelledby="npc-catalog-settings-heading">
    <p className="eyebrow">NPCs e antagonistas</p>
    <h3 id="npc-catalog-settings-heading" className="mt-2 font-serif text-xl">Catálogo global de NPCs</h3>
    <p className="mt-2 text-sm text-muted-foreground">Permite utilizar os modelos globais de NPCs e antagonistas ao criar personagens nesta mesa. Os modelos originais permanecem imutáveis; cada importação gera uma cópia independente. Modelos pessoais e NPCs já vinculados não são removidos ao desabilitar esta opção.</p>
    {loading ? <p className="mt-4 text-sm" role="status">Carregando configuração...</p> : settings && (
      <label className="mt-4 flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-1 size-4 accent-red-700" checked={settings.enabled} disabled={!settings.canManage || saving} onChange={event => void update(event.target.checked)} />
        <span><strong>Permitir catálogo global nesta mesa</strong><span className="mt-1 block text-muted-foreground">{settings.enabled ? 'Habilitado: modelos globais disponíveis para importação.' : 'Desabilitado: somente modelos pessoais e criação do zero.'}</span></span>
      </label>
    )}
    {error && <p className="mt-3 text-sm text-red-400" role="alert">{error}</p>}
    {notice && <p className="mt-3 text-sm text-green-400" role="status">{notice}</p>}
  </section>
}
