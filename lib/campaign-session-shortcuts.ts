import { sql } from 'drizzle-orm'
import { db, ensureAllTables } from '@/lib/db'
import { CharacterCommandError } from '@/lib/character-commands'

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
const validUuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function parseShortcutCodes(value: unknown): ShortcutCode[] {
  if (!Array.isArray(value) || value.length > SHORTCUT_CODES.length || value.some(code => typeof code !== 'string' || !SHORTCUT_CODES.includes(code as ShortcutCode)) || new Set(value).size !== value.length) {
    throw new CharacterCommandError(400, 'Seleção de atalhos inválida.')
  }
  return value as ShortcutCode[]
}

export async function campaignSessionShortcuts(actorId: string, campaignId: string) {
  if (!validUuid.test(campaignId)) throw new CharacterCommandError(400, 'Mesa inválida.')
  await ensureAllTables()
  const result = await db.execute<{ master_user_id: string; session_shortcuts: unknown }>(sql`SELECT master_user_id, session_shortcuts FROM campaigns WHERE id = ${campaignId}::uuid`)
  const campaign = result.rows[0]
  if (!campaign) throw new CharacterCommandError(404, 'Mesa não encontrada.')
  if (campaign.master_user_id !== actorId) throw new CharacterCommandError(403, 'A configuração de atalhos é exclusiva do Narrador.')
  try { return parseShortcutCodes(campaign.session_shortcuts ?? DEFAULT_SHORTCUTS) }
  catch { return [...DEFAULT_SHORTCUTS] }
}

export async function updateCampaignSessionShortcuts(actorId: string, campaignId: string, value: unknown) {
  if (!validUuid.test(campaignId)) throw new CharacterCommandError(400, 'Mesa inválida.')
  const shortcuts = parseShortcutCodes(value)
  await ensureAllTables()
  const result = await db.execute<{ session_shortcuts: ShortcutCode[] }>(sql`
    UPDATE campaigns SET session_shortcuts = ${JSON.stringify(shortcuts)}::jsonb, updated_at = now()
    WHERE id = ${campaignId}::uuid AND master_user_id = ${actorId}
    RETURNING session_shortcuts
  `)
  if (!result.rows[0]) throw new CharacterCommandError(403, 'Mesa não encontrada ou acesso negado.')
  return shortcuts
}
