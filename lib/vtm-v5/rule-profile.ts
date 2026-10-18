export const RULE_PROFILE = { id: 'v5_core_companion', version: 1, label: 'V5 básico + Companion' } as const
export const RULE_SOURCES = {
  'CORE-DICE': { book: 'Vampire: The Masquerade', edition: '5ª edição', printed: '120–123', pdf: 122, file: 'VtM V5 - Vampire the Masquerade.pdf' },
  'CORE-WP': { book: 'Vampire: The Masquerade', edition: '5ª edição', printed: '158', pdf: 160, file: 'VtM V5 - Vampire the Masquerade.pdf' },
  'CORE-HUNGER': { book: 'Vampire: The Masquerade', edition: '5ª edição', printed: '205–208', pdf: 207, file: 'VtM V5 - Vampire the Masquerade.pdf' },
  'CORE-XP': { book: 'Vampire: The Masquerade', edition: '5ª edição', printed: '130, 151', pdf: 132, file: 'VtM V5 - Vampire the Masquerade.pdf' },
  'CORE-GHOUL': { book: 'Vampire: The Masquerade', edition: '5ª edição', printed: '233–234', pdf: 235, file: 'VtM V5 - Vampire the Masquerade.pdf' },
  'CORE-NPC': { book: 'Vampire: The Masquerade', edition: '5ª edição', printed: '370–372', pdf: 372, file: 'VtM V5 - Vampire the Masquerade.pdf' },
  'COMP-DICE': { book: 'Vampire: The Masquerade Companion', edition: 'Companion', printed: '62', pdf: 62, file: 'VtM V5 - Companion.pdf' },
  'COMP-GHOUL': { book: 'Vampire: The Masquerade Companion', edition: 'Companion', printed: '53–55', pdf: 53, file: 'VtM V5 - Companion.pdf' },
} as const

export type RuleSourceId = keyof typeof RULE_SOURCES
export function publicRuleSource(id: RuleSourceId) {
  const source = RULE_SOURCES[id]
  return { id, book: source.book, edition: source.edition, printed: source.printed, pdf: source.pdf, href: `/api/rule-sources/${id}#page=${source.pdf}` }
}
