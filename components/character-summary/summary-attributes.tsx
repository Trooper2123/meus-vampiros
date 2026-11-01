'use client'

import { Brain, Fingerprint, Zap } from 'lucide-react'

type SummaryAttributesProps = {
  onRoll?: (attribute: string) => void
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

function DotTrack({ total, value }: Readonly<{ total: number; value: number }>) {
  return (
    <fieldset className="flex gap-1" aria-label={`${value} de ${total}`}>
      {Array.from({ length: total }, (_, index) => (
        <div
          key={index}
          className={`${
            index + 1 <= value ? 'dot is-filled' : 'dot'
          }`}
        />
      ))}
    </fieldset>
  )
}

export function SummaryAttributes({ attributes, onRoll }: Readonly<SummaryAttributesProps>) {
  const hasAttributes = Object.values(attributes).some(
    (value) => (value as number) > 0
  )

  if (!hasAttributes) {
    return null
  }

  return (
    <div className="border border-border bg-card p-6">
      <h2 className="font-serif text-2xl mb-5">
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

                <h3 className="eyebrow">
                  {group.title}
                </h3>
              </div>
              {groupAttributes.map((attr) => (
                <div key={attr.key} className="summary-rating flex-wrap">
                  <span className="text-sm">{attr.label}</span>
                  {onRoll && <a href="#rolagens" className="button-ghost min-h-10" onClick={() => onRoll(attr.key)} aria-label={`Rolar com ${attr.label}`}>Rolar</a>}
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
