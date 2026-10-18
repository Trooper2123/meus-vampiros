import { ChevronLeft, ChevronRight } from 'lucide-react'

function currentYearInSaoPaulo() {
  return Number(new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
  }).format(new Date()))
}

export function CalendarYearSelector({ year, onChange }: Readonly<{ year: number; onChange: (year: number) => void }>) {
  const currentYear = currentYearInSaoPaulo()
  const years = Array.from({ length: 11 }, (_, index) => currentYear - 5 + index)

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Selecionar ano do calendário">
      <button type="button" className="button-ghost" onClick={() => onChange(year - 1)} aria-label="Ano anterior">
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>
      <label className="sheet-field">
        <span className="sr-only">Ano</span>
        <select className="select" value={year} onChange={(event) => onChange(Number(event.target.value))}>
          {!years.includes(year) && <option value={year}>{year}</option>}
          {years.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
      <button type="button" className="button-ghost" onClick={() => onChange(year + 1)} aria-label="Próximo ano">
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}
