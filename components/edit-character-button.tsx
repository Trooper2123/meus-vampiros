'use client'

import {useRouter} from 'next/navigation'

export function EditCharacterButton({
                                        characterId
                                    }: Readonly<{ characterId: string }>) {
    const router = useRouter()

    function edit() {
        router.push(`/characters/${characterId}/edit`)
    }

    return (
        <button
            type="button"
            className="button-ghost"
            onClick={edit}
        >
            Editar
        </button>
    )
}
