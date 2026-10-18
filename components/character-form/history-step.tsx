import { SheetSection } from './form-controls'

type Props = { historico: string; notas: string; setHistorico: (value: string) => void; setNotas: (value: string) => void }

export function HistoryStep({ historico, notas, setHistorico, setNotas }: Readonly<Props>) {
  return <SheetSection title="Histórico e notas" eyebrow="VI / aquilo que não deve ser esquecido"><div className="sheet-grid sheet-grid-2"><label className="sheet-field"><span>Histórico</span><textarea name="historico" rows={8} placeholder="A vida antes do Abraço, aliados e inimigos..." value={historico} onChange={(e) => setHistorico(e.target.value)} /></label><label className="sheet-field"><span>Notas do narrador</span><textarea name="notas" rows={8} placeholder="Segredos, ganchos e presságios..." value={notas} onChange={(e) => setNotas(e.target.value)} /></label></div></SheetSection>
}
