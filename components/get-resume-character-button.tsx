
'use client'

import { useRouter } from 'next/navigation'

export function GetResumeCharacterButton({
                                      characterId
                                    }: Readonly<{ characterId: string }>) {
  const router = useRouter()

  function edit() {
    router.push(`/characters/${characterId}/summary`)
  }

  return (
      <button
          type="button"
          className="button-ghost"
          onClick={edit}
      >
        Resumo
      </button>
  )
}
