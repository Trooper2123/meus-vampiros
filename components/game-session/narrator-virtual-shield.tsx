'use client'

import { useEffect, useRef, useState } from 'react'
import { BookOpen, ChevronRight, Shield, X } from 'lucide-react'

type SectionId = 'difficulty' | 'hunger' | 'frenzy' | 'humanity' | 'combat' | 'xp'
type Reference = { label: string; detail: string }
type Section = { id: SectionId; label: string; description: string; rows: Reference[]; reminder: string }

const sections: Section[] = [
  {
    id: 'difficulty', label: 'Dificuldades', description: 'Defina a dificuldade antes da rolagem. Conte sucessos, não o valor individual dos dados.',
    rows: [
      { label: '1 sucesso', detail: 'Tarefa muito fácil sob pressão' },
      { label: '2 sucessos', detail: 'Tarefa simples' },
      { label: '3 sucessos', detail: 'Tarefa moderada' },
      { label: '4 sucessos', detail: 'Tarefa desafiadora' },
      { label: '5 sucessos', detail: 'Tarefa muito difícil' },
      { label: '6+ sucessos', detail: 'Feito excepcional' },
    ],
    reminder: 'Em testes disputados, compare os sucessos dos participantes. A dificuldade depende da situação narrada.',
  },
  {
    id: 'hunger', label: 'Fome', description: 'A Fome interfere no conjunto de dados de vampiros.',
    rows: [
      { label: 'Dados de Fome', detail: 'Substituem dados normais até o valor atual da Fome, nunca são dados adicionais.' },
      { label: 'Teste de Despertar', detail: 'Role um dado para verificar aumento da Fome; consulte a ação ou poder usado.' },
      { label: 'Crítico bagunçado', detail: 'Um crítico que inclui dados de Fome pode trazer manifestação da Besta.' },
      { label: 'Falha bestial', detail: 'Uma falha com resultado bestial de Fome pode provocar uma Compulsão ou consequência da Besta.' },
    ],
    reminder: 'Consulte o resultado completo do sistema de rolagens antes de atribuir uma consequência narrativa.',
  },
  {
    id: 'frenzy', label: 'Frenesi', description: 'Avalie o estímulo e aplique a resistência apropriada à situação.',
    rows: [
      { label: 'Estímulos comuns', detail: 'Fome intensa, provocação/raiva ou ameaça de fogo e sol.' },
      { label: 'Resistência', detail: 'Use a mecânica de frenesi prevista nas regras e a dificuldade apropriada ao estímulo.' },
      { label: 'Consequências', detail: 'Descreva o impulso da Besta; registre efeitos e condições na ficha quando aplicável.' },
    ],
    reminder: 'Não use uma dificuldade fixa para todo frenesi. Considere o tipo e a intensidade do gatilho.',
  },
  {
    id: 'humanity', label: 'Humanidade', description: 'Confrontar Convicções e Princípios pode gerar Manchas.',
    rows: [
      { label: 'Princípios da crônica', detail: 'Verifique se a ação viola um princípio estabelecido pela mesa.' },
      { label: 'Convicções', detail: 'Podem mitigar Manchas quando são relevantes, conforme as regras.' },
      { label: 'Manchas', detail: 'Registre as Manchas causadas por ações e outras regras durante a sessão.' },
      { label: 'Remorso', detail: 'Ao final da sessão, resolva o teste de Remorso e possíveis mudanças de Humanidade.' },
    ],
    reminder: 'Humanidade não diminui automaticamente a cada Mancha; acompanhe a mecânica de Remorso.',
  },
  {
    id: 'combat', label: 'Combate', description: 'Resolva intenções, ações disputadas e dano conforme o tipo de alvo.',
    rows: [
      { label: 'Intenção', detail: 'Declare objetivo e ação. Determine os conjuntos de dados aplicáveis.' },
      { label: 'Disputa', detail: 'Compare sucessos quando duas ações se opõem; considere a margem.' },
      { label: 'Dano', detail: 'Aplique margem e modificadores conforme o ataque e as regras de dano.' },
      { label: 'Superficial / agravado', detail: 'Diferencie tipo de dano e alvo; consulte absorção/conversão aplicável.' },
      { label: 'Vontade', detail: 'Consulte regras de repetição de dados e custo antes de confirmar a rolagem.' },
    ],
    reminder: 'Dano superficial normalmente é reduzido pela metade para vampiros, arredondando para cima; confira exceções.',
  },
  {
    id: 'xp', label: 'Experiência', description: 'Valores usuais de progressão após a criação; calcule pelo novo nível.',
    rows: [
      { label: 'Especialização', detail: '3 XP' },
      { label: 'Atributo', detail: 'Novo nível × 5 XP' },
      { label: 'Habilidade', detail: 'Novo nível × 3 XP' },
      { label: 'Disciplina do clã', detail: 'Novo nível × 5 XP' },
      { label: 'Disciplina fora do clã', detail: 'Novo nível × 7 XP' },
      { label: 'Potência de Sangue', detail: 'Novo nível × 10 XP' },
    ],
    reminder: 'Vantagens, novas Disciplinas, Caitiff e outros casos possuem condições específicas. Consulte as regras antes de confirmar a evolução.',
  },
]

export function NarratorVirtualShield({ open, onClose }: Readonly<{ open: boolean; onClose: () => void }>) {
  const [active, setActive] = useState<SectionId>('difficulty')
  const closeRef = useRef<HTMLButtonElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (!open) return
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeRef.current?.focus()
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      previousFocus.current?.focus()
    }
  }, [open, onClose])
  if (!open) return null
  const selected = sections.find(item => item.id === active) ?? sections[0]
  return (
    <aside className="narrator-shield" aria-label="Escudo virtual do narrador">
      <header className="narrator-shield-header">
        <div className="narrator-shield-title"><Shield aria-hidden="true" className="size-6"/><div><p className="eyebrow">Somente Narrador · Consulta rápida V5</p><h2>Escudo do Narrador</h2></div></div>
        <button ref={closeRef} type="button" className="narrator-shield-close" onClick={onClose} aria-label="Fechar escudo"><X className="size-5"/></button>
      </header>
      <div className="narrator-shield-body">
        <nav aria-label="Referências do escudo" className="narrator-shield-nav">
          {sections.map(section => <button type="button" key={section.id} className={active === section.id ? 'is-active' : ''} aria-current={active === section.id ? 'page' : undefined} onClick={() => setActive(section.id)}>{section.label}<ChevronRight aria-hidden="true" className="size-4"/></button>)}
        </nav>
        <section className="narrator-shield-content" aria-live="polite" aria-label={selected.label}>
          <p className="eyebrow">Referência rápida</p>
          <h3>{selected.label}</h3>
          <p className="narrator-shield-description">{selected.description}</p>
          <dl>{selected.rows.map(row => <div key={row.label}><dt>{row.label}</dt><dd>{row.detail}</dd></div>)}</dl>
          <div className="narrator-shield-reminder"><BookOpen className="size-4 shrink-0" aria-hidden="true"/><p>{selected.reminder}</p></div>
          <p className="narrator-shield-disclaimer">Resumo de apoio à narração. Em situações especiais, prevalecem o livro de regras V5 e as regras da crônica.</p>
        </section>
      </div>
    </aside>
  )
}
