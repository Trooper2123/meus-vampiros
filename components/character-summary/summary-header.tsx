'use client'

import { Building2, FileText, User, MapPin, Link as LinkIcon } from 'lucide-react'

type SummaryHeaderProps = {
  name: string
  clan: string | null
  predator: string | null
  generation: string | null
  campaignName: string | null
  campaignTheme: string | null
}

export function SummaryHeader({ name, clan, predator, generation, campaignName, campaignTheme }: SummaryHeaderProps) {
  return (
    <div className="border border-border bg-[#101013] p-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="font-serif text-3xl uppercase tracking-[0.08em]">{name}</h1>
          <p className="mt-1 text-muted-foreground">Ficha de personagem</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {clan && (
            <div className="flex items-center gap-3 border border-border bg-[#131316] p-3">
              <FileText className="size-5 text-[#e5a07e]" />
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Clã</span>
                <span className="font-semibold text-sm">{clan}</span>
              </div>
            </div>
          )}

          {predator && (
            <div className="flex items-center gap-3 border border-border bg-[#131316] p-3">
              <User className="size-5 text-[#d47776]" />
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Predador</span>
                <span className="font-semibold text-sm">{predator}</span>
              </div>
            </div>
          )}

          {generation && (
            <div className="flex items-center gap-3 border border-border bg-[#131316] p-3">
              <Building2 className="size-5 text-[#9ac59b]" />
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Geração</span>
                <span className="font-semibold text-sm">{generation}</span>
              </div>
            </div>
          )}
        </div>

        {campaignName && (
          <div className="mt-2 flex items-start gap-3 border border-border bg-[#101311] p-3">
            <MapPin className="size-5 text-[#b5d9b7] flex-shrink-0 mt-0.5" />
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Mesa vinculada</span>
              <div className="mt-1">
                <span className="font-semibold text-sm text-[#b5d9b7]">{campaignName}</span>
                {campaignTheme && <span className="ml-2 text-xs text-muted-foreground">— {campaignTheme}</span>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
