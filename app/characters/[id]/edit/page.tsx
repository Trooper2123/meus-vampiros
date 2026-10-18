import { redirect } from 'next/navigation'
import { getSessionOrDev } from '@/lib/auth0'
import { hasMasterAccess } from '@/lib/campaigns'
import { CHARACTER_TYPES, PLAYER_CHARACTER_TYPES } from '@/lib/vtm-v5/types'
import CharacterFormClient from '../../character-form-client'
import { Suspense } from 'react'

export default async function EditCharacterPage({ params }: Readonly<PageProps<'/characters/[id]/edit'>>) {
  const session = await getSessionOrDev()
  if (!session?.user) redirect('/auth/login')
  const { id } = await params
  const allowedCharacterTypes = await hasMasterAccess(session.user)
    ? CHARACTER_TYPES
    : PLAYER_CHARACTER_TYPES
  return (
    <Suspense fallback={null}>
      {/* Passa o id diretamente ao formulário para carregar os dados de edição */}
      <CharacterFormClient initialCharacterId={id} mode="edit" allowedCharacterTypes={allowedCharacterTypes} />
    </Suspense>
  )
}
