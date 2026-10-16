import type { CreationGrant } from '@/lib/vtm-v5/creation-grants'

export const dots = (total: number, value: number, onChange: (value: number) => void, name?: string, allowZero = false, readOnly = false, origins: readonly (CreationGrant['origin'] | null)[] = []) => (
  <div className="dot-track" role="group" aria-label={`Nível ${value} de ${total}`}>
    {name && <input type="hidden" name={name} value={value} />}
    {Array.from({ length: total }, (_, index) => {
      const point = index + 1
      const origin = origins[index]
      return <button key={point} type="button" disabled={readOnly} className={`dot ${point <= value ? 'is-filled' : ''} ${origin ? 'is-granted' : ''}`} aria-label={`Definir nível ${point}${origin ? ` · Concessão de ${origin === 'CLAN' ? 'clã' : 'predação'}` : ''}`} aria-pressed={point <= value} onClick={() => onChange(allowZero && point === value ? 0 : point)} />
    })}
  </div>
)
