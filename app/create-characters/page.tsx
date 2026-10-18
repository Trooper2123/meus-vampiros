import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import CharacterFormClient from '../characters/character-form-client'
import { getSessionOrDev } from '@/lib/auth0'
import { PLAYER_CHARACTER_TYPES } from '@/lib/vtm-v5/types'

export default async function CriarPersonagemPage() {
  const session = await getSessionOrDev()
  if (!session?.user) redirect('/auth/login?returnTo=/create-characters')

  const allowedCharacterTypes = PLAYER_CHARACTER_TYPES

  return <Suspense fallback={null}><CharacterFormClient allowedCharacterTypes={allowedCharacterTypes} /></Suspense>
}
