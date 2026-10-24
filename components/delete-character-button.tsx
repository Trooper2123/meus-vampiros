'use client'

import {useId, useRef, useState} from 'react'
import {useRouter} from 'next/navigation'

export function DeleteCharacterButton({characterId, name, revision}: Readonly<{
    characterId: string;
    name: string;
    revision: number
}>) {
    const dialog = useRef<HTMLDialogElement>(null)
    const requestKey = useRef('')
    const titleId = useId(), descriptionId = useId()
    const [confirmationName, setConfirmationName] = useState('')
    const [pending, setPending] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    function open() {
        setConfirmationName('');
        setError('');
        requestKey.current = crypto.randomUUID()
        dialog.current?.showModal()
    }

    async function remove() {
        if (pending || confirmationName !== name) return
        setPending(true);
        setError('')
        try {
            const response = await fetch('/api/characters', {
                method: 'DELETE',
                headers: {'content-type': 'application/json'},
                body: JSON.stringify({
                    id: characterId,
                    confirmed: true,
                    confirmationName,
                    expectedRevision: revision,
                    idempotencyKey: requestKey.current
                })
            })
            const body = await response.json()
            if (!response.ok) throw new Error(body.error ?? 'Não foi possível excluir a ficha.')
            dialog.current?.close()
            router.refresh()
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : 'Não foi possível excluir a ficha.')
        } finally {
            setPending(false)
        }
    }


    return (
        <>
            <button className="button-ghost" aria-haspopup="dialog" onClick={open}>Excluir ficha</button>
            <dialog ref={dialog} aria-labelledby={titleId} aria-describedby={descriptionId}
                    className="m-auto w-[min(32rem,95vw)] border border-border bg-card p-5 text-foreground backdrop:bg-background/80"
                    onCancel={event => {
                        if (pending) event.preventDefault()
                    }}>
                <h2 id={titleId} className="font-serif text-2xl">Excluir {name}?</h2>
                <p id={descriptionId} className="mt-3 text-sm leading-6 text-muted-foreground">A ficha sairá da sua
                    lista e deixará de participar da mesa. Históricos, notas, mídias e referências serão preservados,
                    sem restauração pela interface. A exclusão fica bloqueada durante sessões ativas ou enquanto a mesa
                    estiver convocada.</p>
                <form className="mt-4 flex flex-col gap-4" onSubmit={event => {
                    event.preventDefault();
                    void remove()
                }}>
                    <label
                        className="sheet-field"><span>Digite o nome exato da ficha para confirmar: {name}</span><input
                        value={confirmationName} maxLength={200} disabled={pending}
                        onChange={event => setConfirmationName(event.target.value)} autoComplete="off"/></label>
                    {error && <p role="alert" className="text-sm text-primary">{error}</p>}
                    <div className="flex flex-wrap gap-3">
                        <button type="button" autoFocus className="button-ghost" disabled={pending}
                                onClick={() => dialog.current?.close()}>Cancelar
                        </button>
                        <button type="submit" className="button-primary"
                                disabled={pending || confirmationName !== name}>{pending ? 'Excluindo...' : 'Confirmar exclusão'}</button>
                    </div>
                </form>
            </dialog>
        </>
    )
}
