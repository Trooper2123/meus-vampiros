'use client'

import { useState } from 'react'
import { Heart, Shield, Activity, Flame } from 'lucide-react'

type SummaryResourcesProps = {
  resources: {
    humanidade: number
    vontade: number
    vitalidade: number
    fome: number
  }
  onChange: (resources: {
    humanidade: number
    vontade: number
    vitalidade: number
    fome: number
  }) => void
}

const resourceDefinitions = [
  { label: 'Humanidade', name: 'humanidade', total: 10, icon: Heart, color: 'text-[#b5d9b7]' },
  { label: 'Força de vontade', name: 'vontade', total: 10, icon: Shield, color: 'text-[#e5a07e]' },
  { label: 'Vitalidade', name: 'vitalidade', total: 10, icon: Activity, color: 'text-[#d47776]' },
  { label: 'Fome', name: 'fome', total: 5, icon: Flame, color: 'text-[#e5c069]' },
] as const

function DotTrack({ total, value, onChange, color }: { total: number; value: number; onChange: (value: number) => void; color: string }) {
  return (
    <div className="flex gap-1.5" role="group" aria-label={`${value} de ${total}`}>
      {Array.from({ length: total }, (_, index) => {
        const point = index + 1
        return (
          <button
            key={point}
            type="button"
            className={`h-3 w-3 rounded-full transition-colors ${
              point <= value ? `bg-primary ${color}` : 'bg-muted'
            }`}
            aria-label={`Definir nível ${point}`}
            aria-pressed={point <= value}
            onClick={() => onChange(point === value ? point - 1 : point)}
          />
        )
      })}
    </div>
  )
}

export function SummaryResources({ resources, onChange }: SummaryResourcesProps) {
  const handleChange = (name: keyof typeof resources, value: number) => {
    onChange({ ...resources, [name]: Math.max(0, Math.min(value, resourceDefinitions.find((r) => r.name === name)?.total ?? 10)) })
  }

  return (
    <div className="border border-border bg-[#101013] p-6">
      <h2 className="font-serif text-lg uppercase tracking-[0.08em] mb-4">
        Recursos
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {resourceDefinitions.map((resource) => (
          <div key={resource.name} className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <resource.icon className={`size-5 ${resource.color}`} />
              <span className="font-semibold text-sm">{resource.label}</span>
            </div>
            <DotTrack
              total={resource.total}
              value={resources[resource.name]}
              onChange={(value) => handleChange(resource.name, value)}
              color={resource.color}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
