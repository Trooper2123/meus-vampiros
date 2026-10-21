import catalog from './merits-flaws-catalog.json'

export type TraitKind = 'MERIT' | 'FLAW'
export function traitOptions(kind: TraitKind) {
  return catalog.entries.filter(entry => (entry.type.en === 'Flaw' ? 'FLAW' : 'MERIT') === kind).map(entry => ({
    id: entry.id, name: entry.name.pt, originalName: entry.name.en, type: entry.type.pt, group: entry.group.pt,
    level: typeof entry.dots === 'number' ? entry.dots : entry.dots === null ? 0 : Number.parseInt(entry.dots, 10), rating: entry.rating_label.pt, selectable: entry.selectable,
    description: [entry.effect.pt, entry.rating_detail.pt, `Restrições: ${entry.restriction.pt}`, `Elegibilidade: ${entry.eligibility.pt}`, `Fonte: ${entry.source.title} · p. ${entry.source.printed_pages} · PDF p. ${entry.source.pdf_pages.join(', ')}`].join('\n\n'),
  }))
}
export type TraitOption = ReturnType<typeof traitOptions>[number]
