'use client'

import { BookOpen } from 'lucide-react'

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
  disciplines: Discipline[]
}

export function SummaryDisciplines({ disciplines }: SummaryDisciplinesProps) {
  const activeDisciplines = disciplines.filter((d) => d.level > 0)

  if (activeDisciplines.length === 0) {
    return null
  }

  return (
    <div className="border border-border bg-[#101013] p-6">
      <h2 className="font-serif text-lg uppercase tracking-[0.08em] mb-4">
        Disciplinas
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeDisciplines.map((discipline) => (
          <div
            key={discipline.id}
            className="border border-border bg-[#131316] p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="size-4 text-[#e5a07e]" />
                <h3 className="font-semibold text-sm">{discipline.name}</h3>
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                Nível {discipline.level}
              </span>
            </div>
            {discipline.powers[0]?.effect && (
              <p className="text-xs text-muted-foreground mb-2">
                {discipline.powers[0].effect}
              </p>
            )}
            {discipline.powers[0]?.dicePool && (
              <div className="text-xs">
                <span className="font-mono text-muted-foreground uppercase tracking-wider">
                  Dice Pool:
                </span>{' '}
                <span className="text-[#b5d9b7]">
                  {discipline.powers[0].dicePool}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
