import { characterText } from '@/lib/vtm-v5/text'
import { createHash } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

export class CharacterCommandError extends Error {
  constructor(public readonly status: number, message: string) { super(message) }
}

export type CommandCharacter = {
  id: string
  name: string
  ownerId: string
  campaignId: string | null
  masterId: string | null
  characterType: string
  status: string
  data: Record<string, unknown>
  gameState: Record<string, unknown>
  totalXp: number
  spentXp: number
  revision: number
  validationReport?: unknown
  validationUpdated?: boolean
}

type Command = { key: string; payload: unknown; type: string; expectedRevision?: number }
type SavedCommand = { actorId: string; hash: string; result: Record<string, unknown> }
function requestHash(command: Command) {
  const canonical = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonical)
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([first], [second]) => first.localeCompare(second)).map(([key, entry]) => [key, canonical(entry)]))
    return value
  }
  return createHash('sha256').update(JSON.stringify(canonical({ type: command.type, payload: command.payload }))).digest('hex')
}

export async function getCommandCharacter(id: string): Promise<CommandCharacter | null> {
  const result = await db.execute<{ id: string; name: string; user_id: string; campaign_id: string | null; master_user_id: string | null; character_type: string; status: string; data: Record<string, unknown>; game_state: Record<string, unknown>; total_xp: number; spent_xp: number; revision: number; validation_report: unknown }>(sql`SELECT ch.id, ch.name, ch.user_id, ch.campaign_id, c.master_user_id, ch.character_type, ch.status, ch.data, ch.game_state, ch.total_xp, ch.spent_xp, ch.revision, ch.validation_report FROM characters ch LEFT JOIN campaigns c ON c.id = ch.campaign_id WHERE ch.id = ${id}::uuid`)
  const row = result.rows[0]
  return row ? { id: row.id, name: row.name, ownerId: row.user_id, campaignId: row.campaign_id, masterId: row.master_user_id, characterType: row.character_type, status: row.status, data: row.data ?? {}, gameState: row.game_state ?? {}, totalXp: Number(row.total_xp), spentXp: Number(row.spent_xp), revision: row.revision, validationReport: row.validation_report } : null
}

function replay(saved: SavedCommand, actorId: string, hash: string) {
  if (saved.actorId !== actorId || saved.hash !== hash) throw new CharacterCommandError(409, 'A chave já foi usada para outra operação.')
  return structuredClone(saved.result)
}

function checkRevision(character: CommandCharacter, command: Command) {
  if (command.expectedRevision !== undefined && character.revision !== command.expectedRevision) throw new CharacterCommandError(409, 'A ficha foi alterada. Recarregue antes de tentar novamente.')
}

export async function runCharacterCommand(
  actorId: string,
  characterId: string,
  command: Command,
  authorize: (character: CommandCharacter) => boolean,
  apply: (character: CommandCharacter) => Record<string, unknown> | Promise<Record<string, unknown>>,
): Promise<Record<string, unknown>> {
  const hash = requestHash(command)
  return db.transaction(async (transaction) => {
    const links = await transaction.execute<{ campaign_id: string | null }>(sql`SELECT campaign_id FROM characters WHERE id = ${characterId}::uuid`)
    const campaignId = links.rows[0]?.campaign_id ?? null
    let masterId: string | null = null
    if (campaignId) {
      const campaigns = await transaction.execute<{ master_user_id: string }>(sql`SELECT master_user_id FROM campaigns WHERE id = ${campaignId}::uuid FOR SHARE`)
      masterId = campaigns.rows[0]?.master_user_id ?? null
    }
    const rows = await transaction.execute<{ id: string; name: string; user_id: string; campaign_id: string | null; character_type: string; status: string; data: Record<string, unknown>; game_state: Record<string, unknown>; total_xp: number; spent_xp: number; revision: number; validation_report: unknown }>(sql`SELECT id, name, user_id, campaign_id, character_type, status, data, game_state, total_xp, spent_xp, revision, validation_report FROM characters WHERE id = ${characterId}::uuid FOR UPDATE`)
    const row = rows.rows[0]
    if (!row) throw new CharacterCommandError(404, 'Ficha não encontrada.')
    if (row.campaign_id !== campaignId) throw new CharacterCommandError(409, 'O vínculo da ficha mudou. Recarregue antes de tentar novamente.')
    const character: CommandCharacter = { id: row.id, name: row.name, ownerId: row.user_id, campaignId: row.campaign_id, masterId, characterType: row.character_type, status: row.status, data: row.data ?? {}, gameState: row.game_state ?? {}, totalXp: Number(row.total_xp), spentXp: Number(row.spent_xp), revision: row.revision, validationReport: row.validation_report }
    if (!authorize(character)) throw new CharacterCommandError(403, 'Acesso negado.')
    const commands = await transaction.execute<{ actor_user_id: string; request_hash: string; result: Record<string, unknown> }>(sql`SELECT actor_user_id, request_hash, result FROM character_commands WHERE character_id = ${characterId}::uuid AND command_key = ${command.key}`)
    const saved = commands.rows[0]
    if (saved) return replay({ actorId: saved.actor_user_id, hash: saved.request_hash, result: saved.result }, actorId, hash)
    checkRevision(character, command)
    const before = { totalXp: character.totalXp, spentXp: character.spentXp, revision: character.revision, gameState: structuredClone(character.gameState) }
    const result = { ...await apply(character), revision: character.revision + 1 }
    await transaction.execute(sql`UPDATE characters SET name = ${character.name}, concept = ${typeof character.data.conceito === 'string' ? character.data.conceito : null}, clan = ${typeof character.data.cla === 'string' ? character.data.cla : null}, generation = ${character.data.geracao === undefined ? null : characterText(character.data.geracao)}, character_type = ${character.characterType}, data = ${JSON.stringify(character.data)}::jsonb, game_state = ${JSON.stringify(character.gameState)}::jsonb, status = ${character.status}, total_xp = ${character.totalXp}, spent_xp = ${character.spentXp}, revision = revision + 1, updated_at = NOW() WHERE id = ${characterId}::uuid`)
    if (character.validationUpdated) await transaction.execute(sql`UPDATE characters SET validation_report = ${JSON.stringify(character.validationReport)}::jsonb, validated_at = NOW() WHERE id = ${characterId}::uuid`)
    await transaction.execute(sql`INSERT INTO character_commands (character_id, command_key, actor_user_id, request_hash, result) VALUES (${characterId}::uuid, ${command.key}, ${actorId}, ${hash}, ${JSON.stringify(result)}::jsonb)`)
    await transaction.execute(sql`INSERT INTO character_ledger_events (character_id, event_type, origin, payload, created_by_user_id) VALUES (${characterId}::uuid, ${command.type}, 'USER_ACTION', ${JSON.stringify({ commandKey: command.key, input: command.payload, before, after: result })}::jsonb, ${actorId})`)
    return result
  })
}
