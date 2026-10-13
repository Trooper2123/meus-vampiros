'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import type { MasterPredatorTypeDto, PredatorTypeSettings } from '@/lib/vtm-v5/predator-types'

const fetcher = (url: string) => fetch(url).then((response) => response.json())

export function MasterPredatorCatalog({ campaignId }: { campaignId: string }) {
  const { data, error, isLoading, mutate } = useSWR<{ predatorTypes: MasterPredatorTypeDto[]; settings: PredatorTypeSettings }>(`/api/campaigns/${campaignId}/predator-types`, fetcher)
  const [query, setQuery] = useState('')
  const [source, setSource] = useState<'ALL' | 'COREBOOK' | 'PLAYERS_GUIDE'>('ALL')
  const [availability, setAvailability] = useState<'ALL' | 'ENABLED' | 'DISABLED'>('ALL')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const types = data?.predatorTypes ?? []
  const filtered = useMemo(() => types.filter((entry) => (source === 'ALL' || entry.source === source) && (availability === 'ALL' || entry.enabled === (availability === 'ENABLED')) && `${entry.name} ${entry.commonRisks.join(' ')} ${entry.disciplineOptions.join(' ')}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))), [types, source, availability, query])

  async function togglePlayersGuide(enabled: boolean) {
    if (!data) return
    setSaving(true); setMessage(null)
    const enabledSources = enabled ? ['COREBOOK', 'PLAYERS_GUIDE'] : ['COREBOOK']
    const response = await fetch(`/api/campaigns/${campaignId}/predator-types/settings`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data.settings, enabledSources }) })
    const body = await response.json().catch(() => ({})); setSaving(false)
    if (!response.ok) { setMessage(body.error ?? 'Não foi possível atualizar a configuração.'); return }
    setMessage(`Configuração salva. ${body.flaggedCharacters} ficha(s) com escolha existente foram preservadas.`); await mutate()
  }

  async function toggleCode(code: MasterPredatorTypeDto['code'], enabled: boolean) {
    if (!data) return
    setSaving(true); setMessage(null)
    const disabledCodes = enabled ? data.settings.disabledCodes.filter((entry) => entry !== code) : [...new Set([...data.settings.disabledCodes, code])]
    const definition = types.find((entry) => entry.code === code)
    const enabledCodes = enabled && definition && !data.settings.enabledSources.includes(definition.source)
      ? [...new Set([...(data.settings.enabledCodes ?? []), code])]
      : data.settings.enabledCodes
    const response = await fetch(`/api/campaigns/${campaignId}/predator-types/settings`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data.settings, enabledCodes, disabledCodes }) })
    const body = await response.json().catch(() => ({})); setSaving(false)
    if (!response.ok) { setMessage(body.error ?? 'Não foi possível atualizar o tipo.'); return }
    setMessage('Disponibilidade atualizada sem apagar escolhas existentes.'); await mutate()
  }

  const playersGuideEnabled = data?.settings.enabledSources.includes('PLAYERS_GUIDE') ?? false
  return <section className="border border-border bg-card p-5" aria-labelledby="master-predator-title"><p className="eyebrow">Regras da crônica</p><div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 id="master-predator-title" className="font-serif text-2xl">Tipos de predação</h2><p className="mt-2 text-sm text-muted-foreground">Configure fontes e consulte informações públicas, mecânicas e narrativas.</p></div><label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={playersGuideEnabled} disabled={saving || !data} onChange={(event) => void togglePlayersGuide(event.target.checked)} /> Habilitar Players Guide</label></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-3"><label className="sheet-field"><span>Buscar</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome, risco ou disciplina" /></label><label className="sheet-field"><span>Fonte</span><select className="select" value={source} onChange={(event) => setSource(event.target.value as typeof source)}><option value="ALL">Todas</option><option value="COREBOOK">Livro básico</option><option value="PLAYERS_GUIDE">Players Guide</option></select></label><label className="sheet-field"><span>Disponibilidade</span><select className="select" value={availability} onChange={(event) => setAvailability(event.target.value as typeof availability)}><option value="ALL">Todos</option><option value="ENABLED">Habilitados</option><option value="DISABLED">Desabilitados</option></select></label></div>
    {isLoading && <p className="mt-4 text-sm text-muted-foreground" role="status">Carregando catálogo...</p>}{error && <p className="mt-4 text-sm text-primary" role="alert">Não foi possível carregar o catálogo.</p>}{message && <p className="mt-4 text-sm text-muted-foreground" role="status">{message}</p>}
    <div className="mt-5 flex flex-col gap-3">{filtered.map((entry) => <details key={entry.code} className="border border-border p-4"><summary className="cursor-pointer font-serif text-lg">{entry.name} · {entry.enabled ? 'Habilitado' : 'Desabilitado'}</summary><div className="mt-4 flex justify-end"><label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={entry.enabled} disabled={saving} onChange={(event) => void toggleCode(entry.code, event.target.checked)} /> Disponível na campanha</label></div><div className="mt-4 grid gap-4 lg:grid-cols-3"><div><p className="eyebrow">Visível ao jogador</p><p className="mt-2 text-sm">{entry.summary}</p><p className="mt-2 text-xs text-muted-foreground">Rolagem: {entry.predatorRoll}</p></div><div><p className="eyebrow">Ajustes mecânicos</p><p className="mt-2 text-sm text-muted-foreground">Especialidades: {entry.specialtyOptions.join(' ou ')}</p><p className="mt-2 text-sm text-muted-foreground">Disciplinas: {entry.disciplineOptions.join(' ou ')}</p><p className="mt-2 text-xs">{[...entry.bonusOptions, ...entry.flawsOrCosts].map((option) => option.label).join(' · ') || 'Sem ajuste automático cadastrado.'}</p></div><div><p className="eyebrow">Notas do Mestre</p><p className="mt-2 text-sm">{entry.validationNotes}</p><p className="mt-2 text-xs text-muted-foreground">Riscos: {entry.commonRisks.join(', ') || 'Nenhum risco específico.'}</p></div></div></details>)}</div>
  </section>
}
