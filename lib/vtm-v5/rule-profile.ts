export const RULE_PROFILE = { id: 'v5_core_companion', version: 1, label: 'V5 básico + Companion' } as const
export const RULE_SOURCES = {
  'CLAN-BANU-HAQIM': { book: 'Camarilla', edition: 'V5', printed: '167–168', pdf: 168, file: 'VtM V5 - Vampire The Masquerade 5.0 - Camarilla.pdf' },
  'CLAN-HECATA': { book: 'Cults of the Blood Gods', edition: 'V5 · Backer’s Copy', printed: '202–203', pdf: 203, file: 'VtM V5 - Cults of the Blood Gods (Backer_s Copy).pdf' },
  'CLAN-LASOMBRA': { book: 'Chicago by Night', edition: 'V5', printed: '292', pdf: 293, file: 'VtM V5 - Vampire the Masquerade 5.0 - Chicago by Night.pdf' },
  'CLAN-MINISTRY': { book: 'Anarch', edition: 'V5', printed: '184–185', pdf: 185, file: 'VtM V5 - Vampire The Masquerade 5.0 - Anarch.pdf' },
  'CLAN-RAVNOS': { book: 'Vampire: The Masquerade Companion', edition: 'Companion · 2020', printed: '9', pdf: 9, file: 'VtM V5 - Companion.pdf' },
  'CLAN-SALUBRI': { book: 'Vampire: The Masquerade Companion', edition: 'Companion · 2020', printed: '15', pdf: 15, file: 'VtM V5 - Companion.pdf' },
  'CLAN-TZIMISCE': { book: 'Vampire: The Masquerade Companion', edition: 'Companion · 2020', printed: '18–19', pdf: 18, file: 'VtM V5 - Companion.pdf' },
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
  return { id, book: source.book, edition: source.edition, printed: source.printed, pdf: source.pdf, available: false as const }
}
