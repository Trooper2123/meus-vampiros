import { sql } from 'drizzle-orm'
import { CharacterCommandError } from '@/lib/character-commands'
import { db } from '@/lib/db'
import { getGameSession } from '@/lib/game-sessions'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function activeSession(actorId: string, sessionId: string) {
  const access = await getGameSession(actorId, sessionId)
  const member = await db.execute(sql`SELECT 1 FROM campaigns c WHERE c.id=${access.session.campaignId}::uuid AND (c.master_user_id=${actorId} OR EXISTS(SELECT 1 FROM characters ch WHERE ch.campaign_id=c.id AND ch.user_id=${actorId} AND ch.character_type='PLAYER_VAMPIRE' AND ch.status='APPROVED'))`)
  if (!member.rows.length) { throw new CharacterCommandError(403, 'Apenas participantes aprovados podem usar o chat.') }
  if (access.session.status !== 'ACTIVE') { throw new CharacterCommandError(409, 'O chat está disponível apenas durante uma sessão ativa.') }
  return access
}

export async function listSessionChat(actorId: string, sessionId: string) {
  const access = await activeSession(actorId, sessionId)
  const rows = await db.execute<{ id: string; author_name: string; message: string; created_at: Date|string }>(sql`
    SELECT id, author_name, message, created_at FROM session_chat_messages
    WHERE session_id = ${sessionId}::uuid ORDER BY created_at DESC, id DESC LIMIT 100
  `)
  return { messages: rows.rows.reverse().map(row => ({ id: row.id, authorName: row.author_name, message: row.message, createdAt: new Date(row.created_at).toISOString() })), canManage: access.canManage }
}

export async function sendSessionChat(actorId: string, sessionId: string, input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) { throw new CharacterCommandError(400, 'Mensagem inválida.') }
  const value = input as Record<string, unknown>
  if (Object.keys(value).some(key => !['message', 'idempotencyKey'].includes(key)) || typeof value.message !== 'string' || typeof value.idempotencyKey !== 'string' || !uuid.test(value.idempotencyKey)) { throw new CharacterCommandError(400, 'Mensagem inválida.') }
  const message = value.message.trim()
  if (!message || message.length > 2000) { throw new CharacterCommandError(422, 'A mensagem deve ter entre 1 e 2.000 caracteres.') }
  const access = await activeSession(actorId, sessionId)
  const rows = await db.execute<{ name: string }>(sql`
    SELECT name FROM characters WHERE campaign_id = ${access.session.campaignId}::uuid
      AND user_id = ${actorId} AND character_type = 'PLAYER_VAMPIRE' AND status = 'APPROVED'
    ORDER BY name LIMIT 1
  `)
  const authorName = access.canManage ? 'Narrador' : rows.rows[0]?.name
  if (!authorName) { throw new CharacterCommandError(403, 'Apenas participantes aprovados podem usar o chat.') }
  const row=await db.transaction(async tx=>{
    const active=await tx.execute(sql`SELECT id FROM game_sessions WHERE id=${sessionId}::uuid AND status='ACTIVE' FOR SHARE`)
    if(!active.rows.length){throw new CharacterCommandError(409,'O chat está disponível apenas durante uma sessão ativa.')}
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${sessionId+':'+actorId},0))`)
    const prior=await tx.execute<{id:string;author_name:string;message:string;created_at:Date|string}>(sql`SELECT id,author_name,message,created_at FROM session_chat_messages WHERE session_id=${sessionId}::uuid AND actor_id=${actorId} AND idempotency_key=${value.idempotencyKey}::uuid`)
    if(prior.rows[0]){if(prior.rows[0].message!==message){throw new CharacterCommandError(409,'A chave já foi usada para outra mensagem.')}return prior.rows[0]}
    const recent=await tx.execute<{count:string}>(sql`SELECT count(*) AS count FROM session_chat_messages WHERE session_id=${sessionId}::uuid AND actor_id=${actorId} AND created_at>now()-interval '10 seconds'`)
    if(Number(recent.rows[0].count)>=5){throw new CharacterCommandError(429,'Aguarde alguns segundos antes de enviar outra mensagem.')}
    return (await tx.execute<{id:string;author_name:string;message:string;created_at:Date|string}>(sql`INSERT INTO session_chat_messages(session_id,actor_id,author_name,message,idempotency_key) VALUES(${sessionId}::uuid,${actorId},${authorName},${message},${value.idempotencyKey}::uuid) RETURNING id,author_name,message,created_at`)).rows[0]
  })
  return { id: row.id, authorName: row.author_name, message: row.message, createdAt: new Date(row.created_at).toISOString() }
}
