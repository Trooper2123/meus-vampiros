'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { BookOpen, Layers3, Star, NotebookPen, LogOut, UserRound, ChevronDown, CirclePlay, Archive } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

async function fetchCampaigns(url: string): Promise<{ campaigns: { id: string }[] }> {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Não foi possível consultar suas mesas.')
  return response.json()
}

export function ArchiveHeader({ title, showCampaigns, variant = 'default' }: Readonly<{ title: string; showCampaigns?: boolean; variant?: 'default' | 'campaigns' }>) {
  const { data } = useSWR(showCampaigns === undefined ? '/api/campaigns' : null, fetchCampaigns)
  const hasCampaigns = showCampaigns ?? Boolean(data?.campaigns?.length)
  const searchParams = useSearchParams()
  const onInactive = searchParams.get('view') === 'inactive' || searchParams.get('archived') === 'true'
  const links = <>
    <Link href="/characters" className="button-ghost">{variant === 'campaigns' && <UserRound className="size-4" aria-hidden="true"/>}Personagens</Link>
    {variant === 'campaigns' ? <details className="campaign-nav-group" open>
      <summary><Layers3 className="size-4" aria-hidden="true"/><span>Campanhas</span><ChevronDown className="campaign-nav-chevron size-4" aria-hidden="true"/></summary>
      <div className="campaign-nav-subitems">
        <Link href="/campaigns" aria-current={!onInactive ? 'page' : undefined} className={!onInactive ? 'is-active' : ''}><CirclePlay className="size-4" aria-hidden="true"/>Ativas</Link>
        <Link href="/campaigns?view=inactive" aria-current={onInactive ? 'page' : undefined} className={onInactive ? 'is-active' : ''}><Archive className="size-4" aria-hidden="true"/>Inativas</Link>
      </div>
    </details> : hasCampaigns && <Link href="/campaigns" className="button-ghost">Mesas</Link>}
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
