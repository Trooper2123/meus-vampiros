'use client'

type Merit = { name?: string; level?: number; description?: string }

type SummaryMeritsProps = { merits: Merit[]; flaws: Merit[] }

function MeritColumn({ title, items }: { title: string; items: Merit[] }) {
  if (items.length === 0) return null
  return (
    <div className="flex flex-col gap-3">
      <h3 className="border-b border-border pb-2 font-mono text-xs uppercase tracking-wider">{title}</h3>
      {items.map((item, index) => (
        <article key={`${item.name ?? title}-${index}`} className="border border-border/70 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">{item.name || 'Sem nome'}</span>
            <span className="font-mono text-xs text-muted-foreground">Nível {item.level ?? 0}</span>
          </div>
          {item.description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>}
        </article>
      ))}
    </div>
  )
}

export function SummaryMerits({ merits, flaws }: SummaryMeritsProps) {
  if (merits.length === 0 && flaws.length === 0) return null
  return (
    <section className="border border-border bg-card p-6">
      <h2 className="mb-4 font-serif text-lg uppercase tracking-[0.08em]">Vantagens e Defeitos</h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <MeritColumn title="Vantagens" items={merits} />
        <MeritColumn title="Defeitos" items={flaws} />
      </div>
    </section>
  )
}

export type { Merit }

