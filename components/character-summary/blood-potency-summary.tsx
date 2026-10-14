'use client'

import useSWR from 'swr'
import { calculateBloodPotencyEffects, type BloodPotencyEffects } from '@/lib/vtm-v5/blood-potency'

const fetcher = async (url: string): Promise<BloodPotencyEffects> => {
  const response = await fetch(url)
  const body = await response.json()
  if (!response.ok) throw new Error(body.error ?? 'Não foi possível calcular os efeitos do sangue.')
  return body
}

export function BloodPotencySummary({ characterId, draft }: { characterId?: string; draft?: Record<string, unknown> }) {
  const { data, error } = useSWR(characterId && !draft ? `/api/characters/${characterId}/blood-potency-effects` : null, fetcher)
  let effects = data
  let message = error?.message
  if (draft) {
    try { effects = calculateBloodPotencyEffects(draft) }
    catch (failure) { message = failure instanceof Error ? failure.message : 'Potência inválida.' }
  }
  if (message) return <p role="alert" className="mt-3 text-sm text-primary">{message}</p>
  if (!effects) return <p role="status" className="text-sm">Carregando efeitos da Potência do Sangue...</p>
  const dice = (value: number | null) => value === null ? '—' : `+${value} dado(s)`
  return <section className="mt-4 border border-border bg-card p-5" aria-label="Efeitos calculados da Potência do Sangue">
    <p className="eyebrow">Potência {effects.bloodPotency} · {effects.rulesetVersion}</p>
    <dl className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div><dt>Surto de Sangue</dt><dd>{dice(effects.bloodSurgeDice)}</dd><p className="text-xs text-muted-foreground">Ativação elegível custa um Rouse Check; consultar esta ficha não o executa.</p></div>
      <div><dt>Quantidade Recuperada</dt><dd>{effects.superficialMendAmount} superficial(is) de Vitalidade / Rouse</dd></div>
      <div><dt>Bônus de Poder</dt><dd>{dice(effects.disciplinePowerBonusDice)}</dd><p className="text-xs text-muted-foreground">Somente uso/resistência de poderes elegíveis.</p></div>
      <div><dt>Rerrolagem de Sangue</dt><dd>{effects.disciplineRouseRerollMaxLevel === null ? '—' : `Disciplinas até nível ${effects.disciplineRouseRerollMaxLevel}`}</dd><p className="text-xs text-muted-foreground">Benefício de Rouse de Disciplina, não de Força de Vontade ou despertar.</p></div>
      <div><dt>Gravidade da Perdição</dt><dd>{effects.baneSeverity ?? 'Sem Perdição de clã (Caitiff)'}</dd><p className="text-xs text-muted-foreground">O efeito concreto depende das regras do clã.</p></div>
      <div><dt>Penalidade de Alimentação</dt><dd>{effects.feedingPenalty.displayText}</dd></div>
    </dl>
    <p className="mt-4 text-xs text-muted-foreground">{effects.sourceReference} Nenhum recurso atual é alterado pelo cálculo.</p>
  </section>
}
