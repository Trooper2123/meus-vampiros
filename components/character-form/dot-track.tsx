import type { CreationGrant } from '@/lib/vtm-v5/creation-grants'

export const dots = (total: number, value: number, onChange: (value: number) => void, name?: string, allowZero = false, readOnly = false, origins: readonly (CreationGrant['origin'] | null)[] = []) => (
  <fieldset className="dot-track" aria-label={`Nível ${value} de ${total}`}>
    {name && <input type="hidden" name={name} value={value} />}
    {Array.from({ length: total }, (_, index) => {
      const point = index + 1
      const origin = origins[index]
      const originName = origin === 'CLAN' ? 'clã' : 'predação'
      const originLabel = origin ? ' · Concessão de ' + originName : ''
      return <button key={point} type="button" disabled={readOnly} className={`dot ${point <= value ? 'is-filled' : ''} ${origin ? 'is-granted' : ''}`} aria-label={`Definir nível ${point}${originLabel}`} aria-pressed={point <= value} onClick={() => onChange(allowZero && point === value ? 0 : point)} />
    })}
  </fieldset>
)
