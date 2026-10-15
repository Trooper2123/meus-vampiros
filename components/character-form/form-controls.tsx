import type { ChangeEventHandler } from 'react'


export function Field({ label, name, placeholder, className = '', value, onChange, readOnly = false }: { label: string; name: string; placeholder?: string; className?: string; value?: string; onChange?: ChangeEventHandler<HTMLInputElement>; readOnly?: boolean }) {
  return <label className={`sheet-field ${className}`}><span>{label}</span><input name={name} placeholder={placeholder} value={value ?? undefined} onChange={onChange} readOnly={readOnly || name === 'predador'} aria-readonly={readOnly || name === 'predador' || undefined} /></label>
}

export function SheetSection({ title, eyebrow, children }: { title: string; eyebrow?: string; children: React.ReactNode }) {
  return <section className="sheet-section"><div className="sheet-section-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2></div><span className="section-mark" aria-hidden="true">✦</span></div>{children}</section>
}

export function CreationHint({ children, complete = false }: { children: React.ReactNode; complete?: boolean }) {
  return <div className="mb-5 border border-border bg-background/40 p-3 text-xs leading-5" role="status"><p className={complete ? 'text-foreground' : 'text-muted-foreground'}>{children}</p></div>
}
