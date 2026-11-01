'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type { CharacterEntryMode } from '@/lib/vtm-v5/types'

export function CharacterEntryModeDialog({ onChoose, onCancel }: Readonly<{ onChoose: (mode: CharacterEntryMode) => void; onCancel: () => void }>) {
  const dialog = useRef<HTMLDialogElement>(null)
  const id = useId()
  const [mode, setMode] = useState<CharacterEntryMode>('ASSISTED')
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])
  function cancel() { dialog.current?.close(); onCancel() }
  return <dialog ref={dialog} aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} onCancel={event => { event.preventDefault(); cancel() }} className="archive-dialog m-auto w-[min(36rem,95vw)] max-h-[90dvh] overflow-y-auto border border-border bg-card p-6 text-foreground backdrop:bg-background/80">
    <h2 id={`${id}-title`} className="font-serif text-2xl">Como deseja preencher a ficha?</h2>
    <form className="mt-5 flex flex-col gap-5" onSubmit={event => { event.preventDefault(); dialog.current?.close(); onChoose(mode) }}>
      <label className="sheet-field"><span>Modo de criação</span><select autoFocus className="select" value={mode} onChange={event => { if (event.target.value === 'ASSISTED' || event.target.value === 'EXISTING') setMode(event.target.value) }}>
        <option value="ASSISTED">Nova ficha — criação assistida V5</option>
        <option value="EXISTING">Já tenho uma ficha — transcrever valores atuais</option>
      </select></label>
      <p id={`${id}-description`} className="text-sm leading-6 text-muted-foreground">{mode === 'ASSISTED' ? 'A criação assistida orienta a distribuição inicial de atributos e habilidades V5.' : 'Transcreva os valores atuais da ficha independente. Esses valores não determinam automaticamente o XP histórico.'} A ficha pode ser usada sem mesa e vinculada depois. As regras da mesa continuam sendo aplicadas ao vincular.</p>
      <div className="flex flex-wrap justify-end gap-3"><button type="button" className="button-ghost" onClick={cancel}>Cancelar</button><button type="submit" className="button-primary">Continuar</button></div>
    </form>
  </dialog>
}

export function CreateCharacterButton({ children, className }: Readonly<{ children: ReactNode; className?: string }>) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  return <><button type="button" className={className ?? 'button-primary inline-flex items-center justify-center gap-2'} aria-haspopup="dialog" onClick={() => setOpen(true)}>{children}</button>{open && <CharacterEntryModeDialog onCancel={() => setOpen(false)} onChoose={mode => { setOpen(false); router.push(`/create-characters?entryMode=${mode}`) }} />}</>
}
