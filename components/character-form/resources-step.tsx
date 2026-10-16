import type { Dispatch, SetStateAction } from 'react'
import type { CharacterType } from '@/lib/vtm-v5/types'
import type { calculateSecondaryAttributes } from '@/lib/vtm-v5/secondary-attributes'
import { SheetSection } from './form-controls'
import { dots } from './dot-track'

const resourceDefinitions = [
  { label: 'Humanidade', name: 'humanidade', total: 10 },
  { label: 'Força de vontade', name: 'vontade', total: 10 },
  { label: 'Vitalidade', name: 'vitalidade', total: 10 },
  { label: 'Fome', name: 'fome', total: 5 },
] as const

export type Resources = { humanidade: number; vontade: number; vitalidade: number; fome: number }
export type Conviction = { pilar: string; crenca: string }

type Props = {
  characterType: CharacterType
  displayedResources: Resources
  setResources: Dispatch<SetStateAction<Resources>>
  convictions: Conviction[]
  setConvictions: Dispatch<SetStateAction<Conviction[]>>
  principios: string | null | undefined
  showMissingPrinciples: boolean
  secondaryAttributes: ReturnType<typeof calculateSecondaryAttributes>
}

export function ResourcesStep({ characterType, displayedResources, setResources, convictions, setConvictions, principios, showMissingPrinciples, secondaryAttributes }: Props) {
  return <>
    {characterType === 'PLAYER_VAMPIRE' && <section className="mb-6 border border-border bg-card p-5" aria-label="Atributos secundários calculados" aria-live="polite"><p className="eyebrow">Cálculo automático</p><dl className="mt-3 grid gap-4 sm:grid-cols-3"><div><dt>Vitalidade máxima</dt><dd>{secondaryAttributes.healthMax} — Vigor + 3</dd></div><div><dt>Força de Vontade máxima</dt><dd>{secondaryAttributes.willpowerMax} — Determinação + Compostura</dd></div><div><dt>Humanidade inicial</dt><dd>{secondaryAttributes.initialHumanity} — 7 + idade ({secondaryAttributes.modifiers.age}) + predador ({secondaryAttributes.modifiers.predator})</dd></div></dl><p className="mt-3 text-sm text-muted-foreground">Alterar atributos não recupera recursos consumidos. Gerencie os valores atuais no resumo da ficha. Cada convicção precisa de um Pilar mortal diferente.</p></section>}
    <SheetSection title="Recursos e convicções" eyebrow="V / o que ainda resta"><div className="sheet-grid sheet-grid-2">{resourceDefinitions.map((resource) => <div className="sheet-field" key={resource.name}><span>{resource.label}</span>{dots(resource.total, displayedResources[resource.name], (value) => setResources((current) => ({ ...current, [resource.name]: value })), resource.name, true, characterType === 'PLAYER_VAMPIRE')}</div>)}</div><div className="mt-6 border-t border-border pt-6"><div className="blood-heading mb-4"><h3>Convicções e Pilares</h3></div><div className="sheet-grid sheet-grid-2">{[0, 1, 2].flatMap((index) => [<label key={`pilar-${index}`} className="sheet-field"><span>Pilar {index + 1}</span><input name={`convicoes-pilar-${index + 1}`} value={convictions[index]?.pilar ?? ''} onChange={(event) => { const val = event.target.value; setConvictions((current) => current.map((c, i) => i === index ? { ...c, pilar: val } : c)) }} placeholder={`Nome/descrição do Pilar ${index + 1}`} /></label>, <label key={`crenca-${index}`} className="sheet-field"><span>Crença Ligada {index + 1}</span><input name={`convicoes-crenca-${index + 1}`} value={convictions[index]?.crenca ?? ''} onChange={(event) => { const val = event.target.value; setConvictions((current) => current.map((c, i) => i === index ? { ...c, crenca: val } : c)) }} placeholder={`Crença associada ao Pilar ${index + 1}`} /></label>])}</div></div><div className="mt-6 border-t border-border pt-6"><label className="sheet-field"><span>Princípios da crônica</span><textarea value={principios ?? ''} readOnly rows={4} placeholder="Os princípios da mesa vinculada aparecerão aqui." /></label></div>{showMissingPrinciples && !principios && <p className="mt-3 text-xs text-muted-foreground">Este personagem não está vinculado a uma mesa com princípios cadastrados.</p>}</SheetSection>
  </>
}
