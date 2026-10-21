import { CreationHint, SheetSection } from './form-controls'
import { dots } from './dot-track'

export type Attributes = Record<'forca' | 'destreza' | 'vigor' | 'carisma' | 'manipulacao' | 'compostura' | 'inteligencia' | 'raciocinio' | 'determinacao', number>

type Props = { independent?: boolean; attributes: Attributes; attributesComplete: boolean; attributePointsRemaining: number; setAttribute: (name: keyof Attributes, value: number) => void }

export function AttributesStep({ independent, attributes, attributesComplete, attributePointsRemaining, setAttribute }: Readonly<Props>) {
  return <SheetSection title="Atributos" eyebrow="II / corpo, presença e mente">{independent && <p className="mb-5 text-sm text-muted-foreground">Ficha independente: acompanhe os pontos de referência abaixo. Valores importados não implicam XP gasto automaticamente.</p>}<CreationHint complete={attributesComplete}>Cada atributo começa com 1 ponto. Distribuição obrigatória: um atributo em 4, três em 3, quatro em 2 e um em 1. {attributesComplete ? 'Distribuição concluída.' : `Restam ${attributePointsRemaining} pontos; escolhas acima do limite são bloqueadas.`}</CreationHint>}<div className="attribute-columns">{[{ title: 'Físicos', items: [['forca', 'Força'], ['destreza', 'Destreza'], ['vigor', 'Vigor']] }, { title: 'Sociais', items: [['carisma', 'Carisma'], ['manipulacao', 'Manipulação'], ['compostura', 'Compostura']] }, { title: 'Mentais', items: [['inteligencia', 'Inteligência'], ['raciocinio', 'Raciocínio'], ['determinacao', 'Determinação']] }].map((group) => <div key={group.title} className="attribute-group"><h3>{group.title}</h3>{group.items.map(([key, label]) => <div className="attribute-row" key={key}><span>{label}</span>{dots(5, attributes[key as keyof typeof attributes], (value) => setAttribute(key as keyof typeof attributes, value))}</div>)}</div>)}</div></SheetSection>
}
