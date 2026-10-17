'use client'

import { BookOpen } from 'lucide-react'
import { GrantOriginLabel } from './grant-origin-label'
import type { CreationGrant } from '@/lib/vtm-v5/creation-grants'
import { hasSummaryName } from '@/lib/vtm-v5/summary'

type Discipline = {
  id: string
  name: string
  level: number
  powers: Array<{
    name?: string
    effect?: string
    cost?: string
    prerequisite?: string
    amalgam?: string
    duration?: string
    dicePool?: string
    opposingPool?: string
    additionalNotes?: string
    source?: string
  }>
}

type SummaryDisciplinesProps = {
  grants?: CreationGrant[]
  disciplines: Discipline[]
}

export function SummaryDisciplines({ disciplines, grants }: SummaryDisciplinesProps) {
  const activeDisciplines = disciplines.filter((discipline) => discipline.level > 0 && hasSummaryName(discipline.name))

  if (activeDisciplines.length === 0) {
    return null
  }

  return (
    <div className="border border-border bg-card p-6">
      <h2 className="font-serif text-2xl mb-5">
        Disciplinas
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeDisciplines.map((discipline) => {
          const selectedPowers = discipline.powers
            .slice(0, discipline.level)
            .map((power, index) => ({ power, level: index + 1 }))
            .filter(({ power }) => hasSummaryName(power.name))

          return (
            <div key={discipline.id} className="border border-border bg-card p-4">
              <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="size-4 text-primary" />
                  <h3 className="font-serif text-2xl">{discipline.name}</h3>
                </div>
                <span className="font-mono text-xs text-muted-foreground">Nível {discipline.level}</span>
                <GrantOriginLabel grants={grants} kind="DISCIPLINE" id={discipline.id} level={discipline.level} />
              </div>

              {selectedPowers.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {selectedPowers.map(({ power, level }) => {
                    const details = [
                      ['Custo', power.cost],
                      ['Pré-requisito', power.prerequisite],
                      ['Amálgama', power.amalgam],
                      ['Duração', power.duration],
                      ['Parada de dados', power.dicePool],
                      ['Parada oposta', power.opposingPool],
                      ['Fonte', power.source],
                    ].filter((detail): detail is [string, string] => Boolean(detail[1]?.trim()))

                    return (
                      <article key={`${power.name}-${level}`} className="border border-border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="text-sm font-semibold">{power.name}</h4>
                          <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Nível {level}</span>
                        </div>
                        {power.effect && <p className="mt-2 text-xs leading-5 text-muted-foreground">{power.effect}</p>}
                        {details.length > 0 && (
                          <dl className="mt-3 grid grid-cols-1 gap-2 border-t border-border pt-3 sm:grid-cols-2">
                            {details.map(([label, value]) => (
                              <div key={label}>
                                <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
                                <dd className="mt-1 text-xs">{value}</dd>
                              </div>
                            ))}
                          </dl>
                        )}
                        {power.additionalNotes && (
                          <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">Notas:</span> {power.additionalNotes}
                          </p>
                        )}
                      </article>
                    )
                  })}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
