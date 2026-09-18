'use client'

import { Brain, Fingerprint, Zap } from 'lucide-react'

type SummaryAttributesProps = {
  attributes: {
    forca?: number
    destreza?: number
    vigor?: number
    carisma?: number
    manipulacao?: number
    compostura?: number
    inteligencia?: number
    raciocinio?: number
    determinacao?: number
  }
}

const attributeGroups = [
  {
    title: 'Físicos',
    icon: Zap,
    attributes: [
      { key: 'forca', label: 'Força' },
      { key: 'destreza', label: 'Destreza' },
      { key: 'vigor', label: 'Vigor' },
    ],
  },
  {
    title: 'Sociais',
    icon: Fingerprint,
    attributes: [
      { key: 'carisma', label: 'Carisma' },
      { key: 'manipulacao', label: 'Manipulação' },
      { key: 'compostura', label: 'Compostura' },
    ],
  },
  {
    title: 'Mentais',
    icon: Brain,
    attributes: [
      { key: 'inteligencia', label: 'Inteligência' },
      { key: 'raciocinio', label: 'Raciocínio' },
      { key: 'determinacao', label: 'Determinação' },
    ],
  },
] as const

function DotTrack({ total, value }: { total: number; value: number }) {
  return (
    <div className="flex gap-1" role="group" aria-label={`${value} de ${total}`}>
      {Array.from({ length: total }, (_, index) => (
        <div
          key={index}
          className={`h-2 w-2 rounded-full ${
            index + 1 <= value ? 'bg-primary' : 'bg-muted'
          }`}
        />
      ))}
    </div>
  )
}

export function SummaryAttributes({ attributes }: SummaryAttributesProps) {
  const hasAttributes = Object.values(attributes).some(
    (value) => (value as number) > 0
  )

  if (!hasAttributes) {
    return null
  }

  return (
    <div className="border border-border bg-[#101013] p-6">
      <h2 className="font-serif text-lg uppercase tracking-[0.08em] mb-4">
        Atributos
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {attributeGroups.map((group) => {
          const groupAttributes = group.attributes.filter(
            (attr) => (attributes[attr.key] as number) > 0
          )
          if (groupAttributes.length === 0) return null

          return (
            <div key={group.title} className="flex flex-col gap-3">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <group.icon className="size-4 text-muted-foreground" />
                <h3 className="font-mono text-xs uppercase tracking-wider">
                  {group.title}
                </h3>
              </div>
              {groupAttributes.map((attr) => (
                <div key={attr.key} className="flex items-center justify-between">
                  <span className="text-sm">{attr.label}</span>
                  <DotTrack
                    total={5}
                    value={(attributes[attr.key] as number) || 0}
                  />
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
