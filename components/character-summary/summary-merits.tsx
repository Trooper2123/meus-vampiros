'use client'

import { GrantOriginLabel } from './grant-origin-label'
import type { CreationGrant } from '@/lib/vtm-v5/creation-grants'
import { hasSummaryName } from '@/lib/vtm-v5/summary'

type Merit = { id?: string; name?: string; level?: number; description?: string }

type SummaryMeritsProps = { merits: Merit[]; flaws: Merit[]; grants?: CreationGrant[]; clan?: string | null }

function MeritColumn({ title, items, kind, grants, nosferatu = false }: Readonly<{ title: string; items: Merit[]; kind: CreationGrant['kind']; grants?: CreationGrant[]; nosferatu?: boolean }>) {
  if (items.length === 0) return null
  return (
    <div className="flex flex-col gap-3">
      <h3 className="border-b border-border pb-2 font-mono text-xs uppercase tracking-wider">{title}</h3>
      {items.map((item, index) => (
        <article key={`${item.name ?? title}-${index}`} className="border border-border/70 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">{item.name}</span>
            {(item.level ?? 0) > 0 && <span className="font-mono text-xs text-muted-foreground">{nosferatu && kind === 'MERIT' && /apar[eê]ncia|beautiful|stunning|looks|bela|bonit/iu.test(item.name ?? '') ? 'Bônus de Aparência ignorado' : `Nível ${item.level}`}</span>}
          </div>
          {item.description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>}
          <GrantOriginLabel grants={grants} kind={kind} id={item.id} level={item.level ?? 0} />
        </article>
      ))}
    </div>
  )
}

export function SummaryMerits({ merits, flaws, grants, clan }: Readonly<SummaryMeritsProps>) {
  const nosferatu = clan?.trim().toLocaleLowerCase('pt-BR') === 'nosferatu'
  const filledMerits = merits.filter(item => hasSummaryName(item.name))
  const filledFlaws = flaws.filter(item => hasSummaryName(item.name))
  if (!nosferatu && filledMerits.length === 0 && filledFlaws.length === 0) return null
  return (
    <section className="border border-border bg-card p-6">
      <h2 className="mb-4 font-serif text-lg uppercase tracking-[0.08em]">Vantagens e Defeitos</h2>
      {nosferatu && <p className="mb-4 text-sm text-muted-foreground">Aparência: −2. Nosferatu ignora todos os modificadores positivos de Aparência, inclusive os concedidos pela predação.</p>}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <MeritColumn title="Vantagens" items={filledMerits} kind="MERIT" grants={grants} nosferatu={nosferatu} />
        <MeritColumn title="Defeitos" items={filledFlaws} kind="FLAW" grants={grants} />
      </div>
    </section>
  )
}

export type { Merit }

