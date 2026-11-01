'use client'

import { useEffect, useRef, useState } from 'react'

type AnimatedDiceProps = Readonly<{
  normalDice: number[]
  hungerDice: number[]
  outcome: string
  successes: number
  difficulty: number
  visibility: 'PUBLIC' | 'SECRET'
}>

const outcomeNames: Record<string, string> = {
  SUCCESS: 'Sucesso',
  CRITICAL: 'Sucesso crítico',
  MESSY_CRITICAL: 'Crítico bagunçado',
  FAILURE: 'Falha',
  BESTIAL_FAILURE: 'Falha bestial',
}

export function AnimatedDice({ normalDice, hungerDice, outcome, successes, difficulty, visibility }: AnimatedDiceProps) {
  const [finished, setFinished] = useState(false)
  const [skipMotion, setSkipMotion] = useState(false)
  const resultRef = useRef<HTMLDivElement>(null)
  const dice = [...normalDice.map((value, index) => ({ value, hunger: false, key: `n-${index}` })), ...hungerDice.map((value, index) => ({ value, hunger: true, key: `h-${index}` }))]
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setSkipMotion(reduced)
    setFinished(reduced)
    if (reduced) return
    const timer = window.setTimeout(() => setFinished(true), 1750)
    return () => window.clearTimeout(timer)
  }, [normalDice, hungerDice])
  useEffect(() => { if (finished) resultRef.current?.focus() }, [finished])
  return <div className="mt-5 border-t border-border pt-5" aria-label="Resultado da rolagem">
    <div className="flex items-center justify-between gap-3">
      <p className="eyebrow">Dados lançados</p>
      {!finished && <button type="button" className="button-ghost min-h-10" onClick={() => { setSkipMotion(true); setFinished(true) }}>Pular animação</button>}
    </div>
    <div className="mt-4 flex min-h-24 flex-wrap items-center justify-center gap-3 rounded border border-border bg-background p-4" aria-hidden="true">
      {dice.map((die, index) => <span key={die.key} className={`dice-face ${die.hunger ? 'dice-face-hunger' : ''} ${!skipMotion && !finished ? 'dice-face-rolling' : ''}`} style={{ animationDelay: `${index * 55}ms` }}>{die.value}</span>)}
      {dice.length === 0 && <span className="text-sm text-muted-foreground">Nenhum dado lançado.</span>}
    </div>
    <div ref={resultRef} tabIndex={-1} className="mt-4 outline-none" aria-live="polite" aria-atomic="true">
      {finished ? <>
        <h3 className="font-serif text-xl">{outcomeNames[outcome] ?? outcome}</h3>
        <p className="mt-2 text-sm">{successes} sucesso(s) · Dificuldade {difficulty}</p>
        <p className="mt-1 text-xs text-muted-foreground">{visibility === 'SECRET' ? 'Rolagem secreta — somente Narrador' : 'Rolagem pública'}</p>
        <p className="sr-only">Dados normais: {normalDice.join(', ') || 'nenhum'}. Dados de Fome: {hungerDice.join(', ') || 'nenhum'}.</p>
      </> : <p className="text-sm text-muted-foreground">Os dados estão rolando…</p>}
    </div>
    <style jsx>{`
      .dice-face { display:inline-flex; align-items:center; justify-content:center; width:3.25rem; height:3.25rem; border:1px solid var(--border); border-radius:.7rem; background:var(--card); color:var(--foreground); font:700 1.35rem var(--font-mono,monospace); box-shadow:0 5px 12px #0005; }
      .dice-face-hunger { border-color:var(--primary); background:var(--primary); color:var(--primary-foreground); }
      .dice-face-rolling { animation: dice-land 1.45s cubic-bezier(.2,.75,.3,1) both; }
      @keyframes dice-land { 0% { opacity:0; transform:translateY(-55px) rotate(-240deg) scale(.55); } 32% { opacity:1; } 55% { transform:translateY(12px) rotate(30deg) scale(1.08); } 75% { transform:translateY(-7px) rotate(-10deg); } 100% { opacity:1; transform:translateY(0) rotate(0) scale(1); } }
      @media (prefers-reduced-motion: reduce) { .dice-face-rolling { animation:none; } }
    `}</style>
  </div>
}
