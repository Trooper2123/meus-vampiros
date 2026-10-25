'use client'

import { useState, type Dispatch, type SetStateAction } from 'react'
import type { CreationGrant } from '@/lib/vtm-v5/creation-grants'
import { TraitSelectorRow, type TraitItem } from './trait-selector-row'

export function TraitsEditor({ merits, flaws, setMerits, setFlaws, grants = [] }: Readonly<{ merits: TraitItem[]; flaws: TraitItem[]; setMerits: Dispatch<SetStateAction<TraitItem[]>>; setFlaws: Dispatch<SetStateAction<TraitItem[]>>; grants?: CreationGrant[] }>) {
  const [newRowId, setNewRowId] = useState('')
  function changeTrait(set: Dispatch<SetStateAction<TraitItem[]>>, index: number, next: TraitItem) {
    set(current => current.map((row, position) => position === index ? next : row))
  }
  return <div className="sheet-grid sheet-grid-2 gap-6">{([
    { kind: 'MERIT', title: 'Vantagens', label: 'vantagem', rows: merits, set: setMerits },
    { kind: 'FLAW', title: 'Defeitos', label: 'defeito', rows: flaws, set: setFlaws },
  ] as const).map(section => <div key={section.kind} className="flex flex-col gap-3"><div className="blood-heading pb-2"><h3>{section.title}</h3></div>{section.rows.map((value, index) => <TraitSelectorRow key={value.id} kind={section.kind} index={index} value={value} grants={grants} autoOpen={value.id === newRowId} onChange={next => changeTrait(section.set,index,next)} />)}<button type="button" className="button-ghost self-start" onClick={() => { const id = crypto.randomUUID(); setNewRowId(id); section.set(current => [...current, { id, name: '', level: 0, description: '' }]) }}>Adicionar {section.label}</button></div>)}</div>
}
