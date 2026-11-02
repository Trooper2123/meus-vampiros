'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { BookOpen, Layers3, Star, NotebookPen, LogOut, UserRound } from 'lucide-react'

async function fetchCampaigns(url: string): Promise<{ campaigns: { id: string }[] }> {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Não foi possível consultar suas mesas.')
  return response.json()
}

export function ArchiveHeader({ title, showCampaigns, variant = 'default' }: Readonly<{ title: string; showCampaigns?: boolean; variant?: 'default' | 'campaigns' }>) {
  const { data } = useSWR(showCampaigns === undefined ? '/api/campaigns' : null, fetchCampaigns)
  const hasCampaigns = showCampaigns ?? Boolean(data?.campaigns?.length)
  const links = <>
    <Link href="/characters" className="button-ghost">{variant === 'campaigns' && <UserRound className="size-4" aria-hidden="true"/>}Personagens</Link>
    {(hasCampaigns || variant === 'campaigns') && <Link href="/campaigns" aria-current={variant === 'campaigns' ? 'page' : undefined} className="button-ghost">{variant === 'campaigns' && <Layers3 className="size-4" aria-hidden="true"/>}Campanhas</Link>}
    <Link href="/master/catalogo" className="button-ghost">{variant === 'campaigns' && <BookOpen className="size-4" aria-hidden="true"/>}Disciplinas e habilidades</Link>
    <Link href="/master/vantagens-defeitos" className="button-ghost">{variant === 'campaigns' && <Star className="size-4" aria-hidden="true"/>}Vantagens e defeitos</Link>
    <Link href="/notes" className="button-ghost">{variant === 'campaigns' && <NotebookPen className="size-4" aria-hidden="true"/>}Anotações</Link>
    <a href="/auth/logout" className="button-ghost">{variant === 'campaigns' && <LogOut className="size-4" aria-hidden="true"/>}Sair</a>
  </>

  return <header className={`sheet-header archive-header ${variant === 'campaigns' ? 'archive-header-campaigns' : ''}`}>
    <div className="campaign-nav-brand">{variant === 'campaigns' ? <><div className="campaign-nav-symbol" aria-hidden="true">☥</div><p className="campaign-nav-wordmark">MEUS VAMPIROS</p><p className="eyebrow">Arquivos da Noite</p></> : <><p className="eyebrow">Arquivos da Noite</p><p className="archive-header-title">{title}</p></>}</div>
    <nav className="archive-nav" aria-label="Navegação principal">{links}</nav>
    <details className="archive-menu">
      <summary className="button-ghost">Menu</summary>
      <nav aria-label="Navegação principal no celular">{links}</nav>
    </details>
  </header>
}
