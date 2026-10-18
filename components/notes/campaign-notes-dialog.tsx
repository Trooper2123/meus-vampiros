'use client'

import { useRef } from 'react'
import { NotesPanel } from './notes-panel'

export function CampaignNotesDialog({ campaignId, actorId, player = false, compact = false }: Readonly<{ campaignId: string; actorId: string; player?: boolean; compact?: boolean }>) {
  const dialog = useRef<HTMLDialogElement>(null)
  let notesLabel
  if (compact) {
    notesLabel = 'Anotações'
  } else if (player) {
    notesLabel = 'Minhas anotações da mesa'
  } else {
    notesLabel = 'Anotações do Narrador'
  }
  return <section className={compact ? 'shrink-0' : 'border border-border bg-card p-5'} aria-labelledby="campaign-notes-title">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className={compact ? 'sr-only' : undefined}><p className="eyebrow">{player ? 'Arquivo pessoal' : 'Arquivo do Narrador'}</p><h2 id="campaign-notes-title" className="mt-2 font-serif text-xl">{player ? 'Anotações do jogador' : 'Anotações da crônica'}</h2><p className="mt-2 text-sm text-muted-foreground">Consulte e edite suas anotações sem sair da gestão da mesa.</p></div>
      <button type="button" className="button-primary" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>{notesLabel}</button>
    </div>
    <dialog ref={dialog} aria-labelledby="campaign-notes-dialog-title" className="m-auto max-h-[90dvh] w-[min(72rem,95vw)] overflow-y-auto border border-border bg-background p-5 text-foreground backdrop:bg-background/80">
      <div className="mb-5 flex items-center justify-between gap-4"><h2 id="campaign-notes-dialog-title" className="font-serif text-2xl">{player ? 'Minhas anotações da mesa' : 'Anotações do Narrador'}</h2><button type="button" className="button-ghost" onClick={() => dialog.current?.close()}>Fechar</button></div>
      <p className="mb-4 text-sm text-muted-foreground">Fechar preserva o rascunho nesta página. Salve antes de sair da mesa ou recarregar.</p>
      <NotesPanel actorId={actorId} initialCampaignId={campaignId} />
    </dialog>
  </section>
}
