'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { ChevronLeft, ChevronRight, CircleCheck, HelpCircle, Lightbulb } from 'lucide-react'
import type { AvailabilityEntry, AvailabilityStatus } from '@/lib/availability'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Não foi possível carregar o calendário.')
  return response.json()
}
const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const statuses: { value: AvailabilityStatus; label: string }[] = [
  { value: 'disponível', label: 'Disponível' },
  { value: 'talvez', label: 'Talvez' },
  { value: 'indisponível', label: 'Indisponível' },
]

function dateKey(year: number, month: number, day: number) { return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` }

type Schedule = { startTime: string | null; endTime: string | null }

export function DateAvailabilityCalendar({ campaignId, master = false }: { campaignId: string; master?: boolean }) {
  const { data, error: loadError, mutate } = useSWR<{ currentUserId: string; entries: AvailabilityEntry[]; schedule: Schedule }>(`/api/campaign-availability?campaignId=${campaignId}`, fetcher)
  const [draft, setDraft] = useState<{ startTime: string; endTime: string } | null>(null)
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const schedule = data?.schedule ?? { startTime: null, endTime: null }
  const [current, setCurrent] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const entries = data?.entries ?? []
  const summary = useMemo(() => (data?.entries ?? []).reduce<Record<string, { available: number; maybe: number; suggested: boolean }>>((summaryByDate, entry) => {
    const item = summaryByDate[entry.date] ?? { available: 0, maybe: 0, suggested: false }
    if (entry.status === 'disponível') item.available++
    if (entry.status === 'talvez') item.maybe++
    item.suggested ||= entry.suggested
    summaryByDate[entry.date] = item
    return summaryByDate
  }, {}), [data?.entries])
  const own = selectedDate ? entries.find((entry) => entry.date === selectedDate && entry.userId === data?.currentUserId) : null
  const year = current.getFullYear(); const month = current.getMonth(); const firstDay = new Date(year, month, 1).getDay(); const days = new Date(year, month + 1, 0).getDate()
  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(current)

  async function save(status: AvailabilityStatus, suggested = false) {
    if (!selectedDate) return
    await update('POST', { campaignId, date: selectedDate, status, suggested })
  }
  async function suggest() {
    if (!selectedDate) return
    await update('PATCH', { campaignId, date: selectedDate })
  }

  async function saveSchedule() {
    if (!activeStartTime || !activeEndTime || activeStartTime >= activeEndTime) return
    if (await update('PATCH', { campaignId, action: 'schedule', startTime: activeStartTime, endTime: activeEndTime })) setDraft(null)
  }

  async function update(method: string, payload: Record<string, unknown>) {
    setSavingSchedule(true)
    setError(null)
    try {
      const response = await fetch('/api/campaign-availability', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!response.ok) throw new Error('Não foi possível salvar. Tente novamente.')
      const result = await response.json()
      if (!result || typeof result !== 'object' || (payload.action === 'schedule' ? !result.schedule : method === 'POST' ? !result.entry : result.ok !== true)) throw new Error('Resposta inválida. Tente novamente.')
      await mutate()
      return true
    } catch {
      setError('Não foi possível atualizar o calendário. Seus campos foram preservados; tente novamente.')
      return false
    } finally {
      setSavingSchedule(false)
    }
  }

  const activeStartTime = draft?.startTime ?? schedule.startTime ?? '18:00'
  const activeEndTime = draft?.endTime ?? schedule.endTime ?? '23:00'

  return <section className="border border-border bg-card p-5 sm:p-6" aria-label="Calendário de disponibilidade da mesa">
    {(error || loadError) && <p role="alert" className="mb-4 text-sm text-primary">{error ?? 'Não foi possível carregar o calendário. Tente novamente.'}</p>}
    <div className="flex flex-col justify-between gap-4 border-b border-border pb-4 sm:flex-row sm:items-start">
      <div><p className="eyebrow">Próximo encontro</p><h4 className="mt-1 font-serif text-2xl uppercase tracking-[0.06em]">Disponibilidade</h4><p className="mt-1 text-xs text-muted-foreground">Indique os dias viáveis para a próxima sessão.</p>{(activeStartTime && activeEndTime) && <p className="mt-2 font-mono text-[10px] uppercase text-primary">Janela prevista: {activeStartTime} — {activeEndTime}</p>}</div>
      <div className="flex items-center gap-2"><button type="button" className="button-ghost px-2" aria-label="Mês anterior" onClick={() => setCurrent(new Date(year, month - 1, 1))}><ChevronLeft className="size-4" /></button><span className="min-w-32 text-center font-mono text-xs uppercase">{monthLabel}</span><button type="button" className="button-ghost px-2" aria-label="Próximo mês" onClick={() => setCurrent(new Date(year, month + 1, 1))}><ChevronRight className="size-4" /></button></div>
    </div>
    {master && <div className="mt-4 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="font-mono text-[10px] uppercase">Janela de horário</p><p className="mt-1 text-xs text-muted-foreground">Defina o período previsto para a sessão.</p></div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 font-mono text-[10px] uppercase text-muted-foreground">Início<input disabled={savingSchedule} aria-label="Horário de início" type="time" value={activeStartTime} onChange={(event) => setDraft({ startTime: event.target.value, endTime: activeEndTime })} className="input h-9 w-28 text-xs" /></label>
        <span className="pb-2 text-muted-foreground">—</span>
        <label className="flex flex-col gap-1 font-mono text-[10px] uppercase text-muted-foreground">Fim<input disabled={savingSchedule} aria-label="Horário de fim" type="time" value={activeEndTime} onChange={(event) => setDraft({ startTime: activeStartTime, endTime: event.target.value })} className="input h-9 w-28 text-xs" /></label>
        <button type="button" onClick={saveSchedule} disabled={savingSchedule || !activeStartTime || !activeEndTime || activeStartTime >= activeEndTime} className="button-primary h-9 px-3 text-xs">{savingSchedule ? 'Salvando...' : 'Salvar horário'}</button>
      </div>
    </div>}
    <div className="mt-5 grid grid-cols-7 gap-px border border-border bg-border">
      {weekdays.map((day) => <div key={day} className="bg-background px-1 py-2 text-center font-mono text-[10px] uppercase text-muted-foreground">{day}</div>)}
      {Array.from({ length: firstDay }).map((_, index) => <div key={`empty-${index}`} className="min-h-20 bg-background/60 sm:min-h-24" />)}
      {Array.from({ length: days }, (_, index) => { const day = index + 1; const key = dateKey(year, month, day); const item = summary[key]; const selected = selectedDate === key; return <button type="button" key={key} onClick={() => setSelectedDate(key)} className={`relative min-h-20 bg-background p-2 text-left transition-colors hover:bg-muted sm:min-h-24 ${selected ? 'ring-2 ring-inset ring-ring' : ''}`}><span className="font-mono text-xs">{day}</span>{item && <span className="mt-3 flex flex-col gap-1 text-[10px] text-muted-foreground"><span className="text-foreground">{item.available} disponível{item.available === 1 ? '' : 'is'}</span>{item.maybe > 0 && <span>{item.maybe} talvez</span>}</span>}{item?.suggested && <Lightbulb className="absolute right-2 top-2 size-3.5 text-primary" aria-label="Data sugerida pelo mestre" />}</button> })}
    </div>
    {selectedDate && <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-mono text-xs uppercase">{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(`${selectedDate}T12:00:00`))}</p><p className="mt-1 text-xs text-muted-foreground">{summary[selectedDate]?.available ?? 0} disponíveis · {summary[selectedDate]?.maybe ?? 0} talvez</p></div><div className="flex flex-wrap gap-2">{statuses.map((status) => <button key={status.value} type="button" disabled={savingSchedule} onClick={() => save(status.value)} className={`button-ghost inline-flex items-center gap-1.5 px-3 py-2 text-xs ${own?.status === status.value ? 'border-primary text-primary' : ''}`}>{status.value === 'disponível' ? <CircleCheck className="size-3.5" /> : <HelpCircle className="size-3.5" />}{status.label}</button>)}{master && <button type="button" disabled={savingSchedule} onClick={suggest} className="button-primary inline-flex items-center gap-1.5 px-3 py-2 text-xs"><Lightbulb className="size-3.5" /> {summary[selectedDate]?.suggested ? 'Remover sugestão' : 'Sugerir data'}</button>}</div></div>}
    <p className="mt-4 text-[11px] text-muted-foreground">As marcações são compartilhadas com todos os participantes da mesa.</p>
  </section>
}
