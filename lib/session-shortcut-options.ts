export const SHORTCUT_CODES = ['npcs', 'calendar', 'notes', 'research', 'handouts', 'visual', 'xp'] as const
export type ShortcutCode = (typeof SHORTCUT_CODES)[number]
export const DEFAULT_SHORTCUTS: ShortcutCode[] = ['npcs', 'calendar', 'notes']
export const SHORTCUT_LABELS: Record<ShortcutCode, string> = {
  npcs: 'NPCs da sessão',
  calendar: 'Calendário da mesa',
  notes: 'Anotações',
  research: 'Pesquisas',
  handouts: 'Handouts',
  visual: 'Mesa visual',
  xp: 'XP e pertences',
}
