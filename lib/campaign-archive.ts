import { sql } from 'drizzle-orm'
import { db } from './db'
import { CharacterCommandError } from './character-commands'
import { noteUuid } from './notes'

export async function archiveCampaign(actorId: string, campaignId: string, input: unknown) {
  if (!noteUuid(campaignId) || !input || typeof input !== 'object' || Array.isArray(input)) { throw new CharacterCommandError(400, 'Dados da mesa inválidos.') }
  const value = input as Record<string, unknown>
  if (Object.keys(value).some(key => !['archived', 'confirmationName'].includes(key)) || typeof value.archived !== 'boolean' || typeof value.confirmationName !== 'string') { throw new CharacterCommandError(400, 'Confirme o nome e a operação da mesa.') }
  return db.transaction(async tx => {
    const rows = await tx.execute<{ master_user_id: string; name: string }>(sql`SELECT master_user_id,name FROM campaigns WHERE id=${campaignId}::uuid FOR UPDATE`)
    const campaign = rows.rows[0]
    if (!campaign) { throw new CharacterCommandError(404, 'Mesa não encontrada.') }
    if (campaign.master_user_id !== actorId) { throw new CharacterCommandError(403, 'Somente o Narrador desta mesa pode arquivar ou restaurar.') }
    if (value.confirmationName !== campaign.name) { throw new CharacterCommandError(422, 'O nome informado não corresponde ao nome da mesa.') }
    const active = await tx.execute(sql`SELECT id FROM game_sessions WHERE campaign_id=${campaignId}::uuid AND status='ACTIVE'`)
    if (value.archived && active.rows.length) { throw new CharacterCommandError(409, 'Encerre a sessão ativa antes de arquivar a mesa.') }
    const status = value.archived ? 'Arquivada' : 'Ativa'
    await tx.execute(sql`UPDATE campaigns SET status=${status},call_active=false,updated_at=now() WHERE id=${campaignId}::uuid`)
    return { id: campaignId, status }
  })
}
