'use client'

import Link from 'next/link'
import useSWR from 'swr'

async function fetchCampaigns(url: string): Promise<{ campaigns: { id: string }[] }> {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Não foi possível consultar suas mesas.')
  return response.json()
}

export function ArchiveHeader({ title, showCampaigns }: { title: string; showCampaigns?: boolean }) {
  const { data } = useSWR(showCampaigns === undefined ? '/api/campaigns' : null, fetchCampaigns)
  const hasCampaigns = showCampaigns ?? Boolean(data?.campaigns?.length)
  const links = <>
    <Link href="/characters" className="button-ghost">Personagens</Link>
    {hasCampaigns && <Link href="/campaigns" className="button-ghost">Mesas</Link>}
    <Link href="/notes" className="button-ghost">Anotações</Link>
    <a href="/auth/logout" className="button-ghost">Sair</a>
  </>

  return <header className="sheet-header archive-header">
    <div><p className="eyebrow">Arquivos da Noite</p><p className="archive-header-title">{title}</p></div>
    <nav className="archive-nav" aria-label="Navegação principal">{links}</nav>
    <details className="archive-menu">
      <summary className="button-ghost">Menu</summary>
      <nav aria-label="Navegação principal no celular">{links}</nav>
    </details>
  </header>
}
