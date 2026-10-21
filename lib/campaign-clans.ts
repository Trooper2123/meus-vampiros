import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { CLANS } from './vtm-v5/clans'
import { CharacterCommandError } from './character-commands'

export async function campaignClanCodes(campaignId: string | null): Promise<string[]> {
  if (!campaignId) return CLANS.map(clan => clan.code)
  const result = await db.execute<{ enabled_clan_codes: string[] | null }>(sql`SELECT enabled_clan_codes FROM campaigns WHERE id = ${campaignId}::uuid`)
  const codes = result.rows[0]?.enabled_clan_codes
  if (!result.rows.length) throw new CharacterCommandError(404, 'Mesa não encontrada.')
  return [...(codes ?? CLANS.map(clan => clan.code))]
}
