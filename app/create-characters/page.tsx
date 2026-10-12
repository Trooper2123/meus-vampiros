'use client'

import { Suspense } from 'react'
import CharacterFormClient from '../characters/character-form-client'

export default function CriarPersonagemPage() {
  return <Suspense fallback={null}><CharacterFormClient /></Suspense>
}
