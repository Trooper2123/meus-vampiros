'use client'

import { Brain, Fingerprint, Zap } from 'lucide-react'

type SummarySkillsProps = {
  skills: Record<string, number>
}

const skillGroups = [
  {
    title: 'Físicas',
    icon: Zap,
    skills: [
      'Armas brancas',
      'Armas de fogo',
      'Atletismo',
      'Briga',
      'Condução',
      'Furtividade',
      'Ladroagem',
      'Ofícios',
      'Sobrevivência',
    ],
  },
  {
    title: 'Sociais',
    icon: Fingerprint,
    skills: [
      'Empatia com animais',
      'Etiqueta',
      'Intimidação',
      'Liderança',
      'Manha',
      'Performance',
      'Persuasão',
      'Sagacidade',
      'Subterfúgio',
    ],
  },
  {
    title: 'Intelectuais',
    icon: Brain,
    skills: [
      'Ciência',
      'Erudição',
      'Finanças',
      'Investigação',
      'Medicina',
      'Ocultismo',
      'Percepção',
      'Política',
      'Tecnologia',
    ],
  },
] as const

function DotTrack({ total, value }: { total: number; value: number }) {
  return (
    <div className="flex gap-1" role="group" aria-label={`${value} de ${total}`}>
      {Array.from({ length: total }, (_, index) => (
        <div
          key={index}
          className={`${
            index + 1 <= value ? 'dot is-filled' : 'dot'
          }`}
        />
      ))}
    </div>
  )
}

export function SummarySkills({ skills }: SummarySkillsProps) {
  const hasSkills = Object.values(skills).some((value) => value > 0)

  if (!hasSkills) {
    return null
  }

  return (
    <div className="border border-border bg-card p-6">
      <h2 className="font-serif text-2xl mb-5">
        Habilidades
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {skillGroups.map((group) => {
          const groupSkills = group.skills.filter(
            (skill) => (skills[skill] ?? 0) > 0
          )
          if (groupSkills.length === 0) return null

          return (
            <div key={group.title} className="flex flex-col gap-3">
              <div className="flex items-center gap-2 border-b border-border pb-2">

                <h3 className="eyebrow">
                  {group.title}
                </h3>
              </div>
              {groupSkills.map((skill) => (
                <div key={skill} className="summary-rating">
                  <span className="text-sm">{skill}</span>
                  <DotTrack total={5} value={skills[skill] ?? 0} />
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
