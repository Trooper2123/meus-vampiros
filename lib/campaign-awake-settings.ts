import { randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { db } from './db'
import { CharacterCommandError } from './character-commands'

export type AwakeExecutionMode = 'PLAYER_ROLLS' | 'NARRATOR_FORCES'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const isMode = (value: unknown): value is AwakeExecutionMode => value === 'PLAYER_ROLLS' || value === 'NARRATOR_FORCES'

export async function readCampaignAwakeSettings(actorId: string, campaignId: string) {
  if (!uuid.test(campaignId)) throw new CharacterCommandError(400, 'Mesa inválida.')
  const rows = await db.execute<{ master_user_id: string; awake_execution_mode: AwakeExecutionMode; can_view: boolean }>(sql`SELECT c.master_user_id, c.awake_execution_mode, (c.master_user_id = ${actorId} OR EXISTS (SELECT 1 FROM characters ch WHERE ch.campaign_id = c.id AND ch.user_id = ${actorId} AND ch.status <> 'DELETED')) AS can_view FROM campaigns c WHERE c.id = ${campaignId}::uuid`)
  const campaign = rows.rows[0]
  if (!campaign?.can_view) throw new CharacterCommandError(403, 'Acesso negado.')
  const nights = await db.execute<{ id: string; night_number: number; in_game_date: string; execution_mode: AwakeExecutionMode; status: string }>(sql`SELECT id, night_number, in_game_date::text, execution_mode, status FROM chronicle_nights WHERE campaign_id = ${campaignId}::uuid AND status = 'ACTIVE' ORDER BY night_number DESC LIMIT 1`)
  return { executionMode: campaign.awake_execution_mode, canManage: campaign.master_user_id === actorId, night: nights.rows[0] ?? null }
}
export async function saveCampaignAwakeSettings(actorId: string, campaignId: string, mode: unknown) {
  if (!uuid.test(campaignId) || !isMode(mode)) throw new CharacterCommandError(400, 'Configuração inválida.')
  return db.transaction(async tx => {
    const rows = await tx.execute<{ master_user_id: string; awake_execution_mode: string }>(sql`SELECT master_user_id, awake_execution_mode FROM campaigns WHERE id = ${campaignId}::uuid FOR UPDATE`)
    if (rows.rows[0]?.master_user_id !== actorId) throw new CharacterCommandError(403, 'Somente o Narrador pode editar esta configuração.')
    const previous = rows.rows[0].awake_execution_mode
    if (previous !== mode) {
      await tx.execute(sql`UPDATE campaigns SET awake_execution_mode = ${mode} WHERE id = ${campaignId}::uuid`)
      // Mudança de política afeta somente novas noites.
      await tx.execute(sql`INSERT INTO campaign_awake_setting_events (campaign_id, actor_user_id, previous_mode, new_mode) VALUES (${campaignId}::uuid, ${actorId}, ${previous}, ${mode})`)
    }
    return { executionMode: mode }
  })
}
export async function preparePlayerAwakeNight(actorId: string, campaignId: string, inGameDate: unknown, key: unknown) {
  if (!uuid.test(campaignId) || typeof key !== 'string' || !uuid.test(key) || typeof inGameDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(inGameDate) || Number.isNaN(Date.parse(inGameDate)) || new Date(inGameDate).toISOString().slice(0,10) !== inGameDate) throw new CharacterCommandError(400, 'Data ou chave inválida.')
  return db.transaction(async tx => {
    const campaigns = await tx.execute<{ master_user_id: string; awake_execution_mode: AwakeExecutionMode }>(sql`SELECT master_user_id, awake_execution_mode FROM campaigns WHERE id = ${campaignId}::uuid FOR UPDATE`)
    if (campaigns.rows[0]?.master_user_id !== actorId || campaigns.rows[0]?.awake_execution_mode !== 'PLAYER_ROLLS') throw new CharacterCommandError(403, 'Apenas o Narrador pode preparar uma noite no modo jogadores.')
    const previous = await tx.execute<{ id: string; night_number: number; in_game_date: string }>(sql`SELECT id, night_number, in_game_date::text FROM chronicle_nights WHERE campaign_id = ${campaignId}::uuid AND idempotency_key = ${key}`)
    if (previous.rows[0]) {
      if (previous.rows[0].in_game_date !== inGameDate) throw new CharacterCommandError(409, 'A chave já foi usada com outra data.')
      return previous.rows[0]
    }
    const sequence = await tx.execute<{ number: number }>(sql`SELECT COALESCE(MAX(night_number),0)+1 AS number FROM chronicle_nights WHERE campaign_id = ${campaignId}::uuid`)
    const nightId = randomUUID(), number = Number(sequence.rows[0]?.number ?? 1)
    await tx.execute(sql`INSERT INTO chronicle_nights (id,campaign_id,night_number,in_game_date,status,started_by_user_id,idempotency_key,request_hash,ruleset_version,execution_mode,completed_at) VALUES (${nightId}::uuid,${campaignId}::uuid,${number},${inGameDate}::date,'ACTIVE',${actorId},${key},${'PLAYER_ROLLS:'+inGameDate},'V5-AWAKE-2','PLAYER_ROLLS',NOW())`)
    return { id: nightId, night_number: number, in_game_date: inGameDate, execution_mode: 'PLAYER_ROLLS' }
  })
}
