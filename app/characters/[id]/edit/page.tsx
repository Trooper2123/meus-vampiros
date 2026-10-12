import { redirect } from 'next/navigation'
import { getSessionOrDev } from '@/lib/auth0'
import CharacterFormClient from '../../character-form-client'
import { Suspense } from 'react'

export default async function EditCharacterPage({ params }: PageProps<'/characters/[id]/edit'>) {
  const session = await getSessionOrDev()
  if (!session?.user) redirect('/auth/login')
  const { id } = await params
  return (
    <Suspense fallback={null}>
      {/* Passa o id diretamente ao formulário para carregar os dados de edição */}
      <CharacterFormClient initialCharacterId={id} mode="edit" />
    </Suspense>
  )
}
