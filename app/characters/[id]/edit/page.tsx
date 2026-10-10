import { redirect } from 'next/navigation'
import { getSessionOrDev } from '@/lib/auth0'
import CharacterFormClient from '../../character-form-client'
import { Suspense } from 'react'

export default async function EditCharacterPage({ params }: { params: { id: string } }) {
  const session = await getSessionOrDev()
  if (!session?.user) redirect('/auth/login')
  const { id } = params
  return (
    <Suspense fallback={null}>
      {/* Passa o id diretamente ao formulário para carregar os dados de edição */}
      {/* @ts-expect-error Async server -> client prop */}
      <CharacterFormClient initialCharacterId={id} mode="edit" />
    </Suspense>
  )
}
