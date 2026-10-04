'use client'

import { redirect } from 'next/navigation'
import { getSessionOrDev } from '@/lib/auth0'
import { getCharacterById, updateCharacter, updateCharacterStatus, deleteCharacter } from '@/lib/characters'
import { getCharactersForCampaign } from '@/lib/campaigns'
import { CharacterSummaryClient } from '../character-summary-client'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Edit, FileText, Save, Trash2 } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

async function getCharacterData(id: string, userId: string) {
  const character = await getCharacterById(id, userId)
  if (!character) return null

  const data = character.data as Record<string, unknown>
  
  const parseIntSafe = (value: unknown): number => {
    const num = Number.parseInt(String(value), 10)
    return Number.isNaN(num) ? 0 : num
  }

  const getName = (): string => {
    if (character.name && character.name.trim() !== '') return character.name
    if (data['nome'] && String(data['nome']).trim() !== '') return String(data['nome'])
    return 'Personagem sem nome'
  }

  return {
    id: character.id,
    name: getName(),
    clan: data['cla'] ? String(data['cla']) : null,
    predator: data['predador'] ? String(data['predador']) : null,
    generation: data['geracao'] ? String(data['geracao']) : null,
    campaignName: character.campaignId ? 'Mesa vinculada' : null,
    campaignTheme: null,
    attributes: {
      forca: parseIntSafe(data['forca']),
      destreza: parseIntSafe(data['destreza']),
      vigor: parseIntSafe(data['vigor']),
      carisma: parseIntSafe(data['carisma']),
      manipulacao: parseIntSafe(data['manipulacao']),
      compostura: parseIntSafe(data['compostura']),
      inteligencia: parseIntSafe(data['inteligencia']),
      raciocinio: parseIntSafe(data['raciocinio']),
      determinacao: parseIntSafe(data['determinacao']),
    },
    skills: {},
    disciplines: [],
    resources: {
      humanidade: parseIntSafe(data['humanidade']),
      vontade: parseIntSafe(data['vontade']),
      vitalidade: parseIntSafe(data['vitalidade']),
      fome: parseIntSafe(data['fome']),
    },
  }
}

export default async function EditCharacterPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSessionOrDev()
  if (!session?.user) redirect('/auth/login')

  const { id } = await params
  const characterData = await getCharacterData(id, session.user.sub)
  if (!characterData) redirect('/characters')

  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [status, setStatus] = useState(characterData.resources.humanidade > 0 ? 'Finalizada' : 'Rascunho')

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await fetch('/api/characters', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id, 
          name: characterData.name,
          data: characterData
        }),
      })
      
      // Mudar status para Finalizada
      await updateCharacterStatus(id, session.user.sub, 'Finalizada')
      setStatus('Finalizada')
      
      window.alert('Ficha salva com sucesso!')
      redirect(`/characters/${id}`)
    } catch (error) {
      window.alert('Erro ao salvar ficha.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Tem certeza que deseja excluir esta ficha?')) return
    
    setIsDeleting(true)
    try {
      await fetch('/api/characters', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      redirect('/characters')
    } catch (error) {
      window.alert('Erro ao excluir ficha.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="noise" aria-hidden="true" />
      <header className="sheet-header">
        <div>
          <p className="eyebrow">Arquivos da Noite</p>
          <h1 className="mt-2 font-serif text-2xl uppercase tracking-[0.12em]">
            Editar Personagem
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {session.user.name ?? session.user.email ?? 'Guardião'}
          </span>
          <Link href="/characters" className="button-ghost inline-flex items-center gap-2">
            <FileText className="size-4" /> Arquivo
          </Link>
          <a href="/auth/logout" className="button-ghost inline-flex items-center gap-2">
            <span className="text-xs">Sair</span>
          </a>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 lg:py-14">
        {/* Status da ficha */}
        <div className="mb-8 flex items-center gap-2 border-b border-border pb-4">
          <span className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-medium rounded-full ${
            status === 'Finalizada' 
              ? 'bg-primary/10 text-primary border border-primary' 
              : 'bg-muted/50 text-muted-foreground border border-border'
          }`}>
            <span className="h-2 w-2 rounded-full bg-current" />
            {status}
          </span>
        </div>

        {/* Conteúdo da Ficha */}
        <CharacterSummaryClient data={characterData} />
        
        {/* Botões de ação */}
        <div className="mt-8 border-t border-border pt-6 flex items-center gap-4">
          <Link
            href={`/characters/${id}`}
            className="button-ghost inline-flex items-center gap-2"
          >
            <ArrowLeft className="size-4" />
            Voltar para visualização
          </Link>
          
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="button-danger inline-flex items-center gap-2"
          >
            <Trash2 className="size-4" />
            {isDeleting ? 'Excluindo...' : 'Excluir ficha'}
          </button>
          
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="button-primary inline-flex items-center gap-2"
          >
            <Save className="size-4" />
            {isSaving ? 'Salvando...' : 'Salvar ficha'}
          </button>
        </div>
      </div>
    </main>
  )
}
