import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { sql } from 'drizzle-orm'
import { db, pool } from '@/lib/db'
import { ensureSmsSchema, smsContacts, smsMessages, smsRead, smsSend, smsStart, smsThreads, setSmsSettings } from '@/lib/character-sms'
import { SMS_NPC_SCHEMA } from '@/lib/character-sms-npc-schema'
import { createTestCampaign, createTestCharacter, preparePostgresTest } from './postgres-test-helpers'

const auth = vi.hoisted(() => ({ actor: 'narrator' as string | null }))
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: async () => auth.actor ? { user: { sub: auth.actor } } : null }))
import { POST as startRoute } from '@/app/api/campaigns/[id]/character-sms/route'
import { POST as sendRoute } from '@/app/api/campaigns/[id]/character-sms/[threadId]/route'

let campaignId: string, characterId: string, otherCharacterId: string, npcId: string, hiddenNpcId: string, otherNpcId: string
const send = (actor: string, threadId: string, sender: Record<string, unknown>, body = 'Mensagem', idempotencyKey = randomUUID()) => smsSend(campaignId, actor, threadId, { ...sender, body, idempotencyKey })
const direct = (sender: Record<string, unknown>, recipient: Record<string, unknown>, actor = 'player') => smsStart(campaignId, actor, { ...sender, ...recipient })
async function npc(campaign: string, revealed: boolean, id: string = randomUUID()) {
  await db.execute(sql`INSERT INTO npc_definitions(id,owner_id,name,sheet_type,creature_type,role,threat_level,payload) VALUES(${id}::uuid,'narrator','Informante','SIMPLE','HUMAN','ALLY',1,'{"secret":"nunca retornar"}'::jsonb)`)
  await db.execute(sql`INSERT INTO campaign_npcs(campaign_id,npc_id,revealed_fields,notes) VALUES(${campaign}::uuid,${id}::uuid,${JSON.stringify(revealed ? ['name'] : [])}::jsonb,'Segredo da mesa')`)
  return id
}
beforeAll(async () => {
  preparePostgresTest()
  await ensureSmsSchema()
})
beforeEach(async () => {
  auth.actor = 'narrator'
  campaignId = (await createTestCampaign('narrator')).id
  characterId = (await createTestCharacter('player', campaignId)).id
  otherCharacterId = (await createTestCharacter('other-player', campaignId)).id
  await db.execute(sql`UPDATE characters SET status='APPROVED' WHERE id IN (${characterId}::uuid,${otherCharacterId}::uuid)`)
  npcId = await npc(campaignId, true)
  hiddenNpcId = await npc(campaignId, false)
  otherNpcId = await npc((await createTestCampaign('other-narrator')).id, true)
})

it('jogador envia ao NPC e Narrador responde como NPC, com entregas, saldo de não lidas e leitura', async () => {
  const { id } = await direct({ senderCharacterId: characterId }, { recipientNpcId: npcId })
  await send('player', id, { senderCharacterId: characterId }, 'Olá')
  expect((await smsMessages(campaignId, 'narrator', id)).messages).toMatchObject([{ body: 'Olá', senderCharacterId: characterId, senderNpcId: null }])
  await send('narrator', id, { senderNpcId: npcId }, 'Encontre-me à noite')
  const player = await smsMessages(campaignId, 'player', id)
  expect(player.isNarrator).toBe(false)
  expect(player.messages).toMatchObject([{ body: 'Olá' }, { body: 'Encontre-me à noite', senderCharacterId: null, senderNpcId: npcId, senderName: 'Informante', narratorOperated: null }])
  expect(JSON.stringify(player)).not.toMatch(/nunca retornar|Segredo da mesa/)
  expect((await smsThreads(campaignId, 'player')).threads).toMatchObject([{ id, unreadCount: 1 }])
  await smsRead(campaignId, 'player', id)
  expect((await smsThreads(campaignId, 'player')).threads).toMatchObject([{ id, unreadCount: 0 }])
  const deliveries = await db.execute(sql`SELECT recipient_character_id,recipient_npc_id FROM character_message_deliveries d JOIN character_messages m ON m.id=d.message_id WHERE m.thread_id=${id}::uuid`)
  expect(deliveries.rows).toHaveLength(4)
  expect(deliveries.rows.some(row => row.recipient_npc_id === npcId)).toBe(true)
})

it('contatos expõem somente NPCs vinculados/revelados para jogador e todos os ativos ao Narrador', async () => {
  expect((await smsContacts(campaignId, 'player')).npcContacts.map(n => n.id)).toEqual([npcId])
  const gm = await smsContacts(campaignId, 'narrator')
  expect(gm.isNarrator).toBe(true)
  expect(gm.npcContacts.map(n => n.id).sort()).toEqual([npcId, hiddenNpcId].sort())
  expect(gm.npcContacts.every(n => n.canMessage)).toBe(true)
  await expect(direct({ senderCharacterId: characterId }, { recipientNpcId: hiddenNpcId })).rejects.toMatchObject({ status: 404 })
})

it('NPC oculto pode falar sem revelar identidade nos DTOs do jogador', async () => {
  const { id } = await direct({ senderNpcId: hiddenNpcId }, { recipientCharacterId: characterId }, 'narrator')
  await send('narrator', id, { senderNpcId: hiddenNpcId }, 'Mensagem anônima')
  const history = await smsMessages(campaignId, 'player', id)
  expect(history.messages).toMatchObject([{ senderName: 'NPC não revelado', senderNpcId: null, body: 'Mensagem anônima' }])
  expect(JSON.stringify(history)).not.toContain(hiddenNpcId)
  expect(JSON.stringify(await smsThreads(campaignId, 'player'))).not.toContain('Informante')
  await expect(send('player', id, { senderCharacterId: characterId })).rejects.toMatchObject({ status: 404 })
})

it.each(['player', 'other-player', 'other-narrator'])('recusa %s tentando falar como NPC', async actor => {
  await expect(direct({ senderNpcId: npcId }, { recipientCharacterId: characterId }, actor)).rejects.toMatchObject({ status: actor === 'other-narrator' ? 404 : 403 })
})

it('impede UUID NPC de outra mesa, NPC desvinculado/arquivado e template', async () => {
  await expect(direct({ senderCharacterId: characterId }, { recipientNpcId: otherNpcId })).rejects.toMatchObject({ status: 404 })
  const { id } = await direct({ senderCharacterId: characterId }, { recipientNpcId: npcId })
  await db.execute(sql`UPDATE npc_definitions SET status='ARCHIVED' WHERE id=${npcId}::uuid`)
  await expect(send('narrator', id, { senderNpcId: npcId })).rejects.toMatchObject({ status: 404 })
  await db.execute(sql`UPDATE npc_definitions SET status='ACTIVE',is_template=true WHERE id=${npcId}::uuid`)
  await expect(send('narrator', id, { senderNpcId: npcId })).rejects.toMatchObject({ status: 404 })
  await db.execute(sql`UPDATE npc_definitions SET is_template=false WHERE id=${npcId}::uuid`)
  await db.execute(sql`DELETE FROM campaign_npcs WHERE campaign_id=${campaignId}::uuid AND npc_id=${npcId}::uuid`)
  await expect(send('narrator', id, { senderNpcId: npcId })).rejects.toMatchObject({ status: 404 })
})

it('revalida identidade revelada e membership, não expõe conversa a outro jogador', async () => {
  const { id } = await direct({ senderCharacterId: characterId }, { recipientNpcId: npcId })
  await send('narrator', id, { senderNpcId: npcId }, 'Texto entregue')
  await expect(smsMessages(campaignId, 'other-player', id)).rejects.toMatchObject({ status: 404 })
  expect((await smsThreads(campaignId, 'other-player')).threads).toEqual([])
  await db.execute(sql`UPDATE campaign_npcs SET revealed_fields='[]'::jsonb WHERE npc_id=${npcId}::uuid`)
  expect((await smsMessages(campaignId, 'player', id)).messages[0].senderNpcId).toBeNull()
  await db.execute(sql`UPDATE characters SET campaign_id=NULL WHERE id=${characterId}::uuid`)
  await expect(smsMessages(campaignId, 'player', id)).rejects.toMatchObject({ status: 404 })
})

it('deduplica conversa em ambos os sentidos e envios concorrentes; chave diferente não duplica identidade', async () => {
  const threads = await Promise.all([
    direct({ senderCharacterId: characterId }, { recipientNpcId: npcId }),
    direct({ senderNpcId: npcId }, { recipientCharacterId: characterId }, 'narrator'),
  ])
  expect(threads[0].id).toBe(threads[1].id)
  const key = randomUUID()
  const results = await Promise.all(Array.from({ length: 4 }, () => send('narrator', threads[0].id, { senderNpcId: npcId }, 'Uma mensagem', key)))
  expect(new Set(results.map(r => r.id)).size).toBe(1)
  expect((await smsMessages(campaignId, 'player', threads[0].id)).messages).toHaveLength(1)
  await expect(send('narrator', threads[0].id, { senderNpcId: hiddenNpcId }, 'Uma mensagem', key)).rejects.toMatchObject({ status: 409 })
  await expect(send('narrator', threads[0].id, { senderNpcId: npcId }, 'Mudou', key)).rejects.toMatchObject({ status: 409 })
})

it('preserva compatibilidade Character e aceita UUID igual em entidades de tipos diferentes', async () => {
  const legacy = await direct({ senderCharacterId: characterId }, { recipientCharacterId: otherCharacterId })
  await send('player', legacy.id, { senderCharacterId: characterId }, 'Legado')
  expect((await smsMessages(campaignId, 'other-player', legacy.id)).messages).toMatchObject([{ senderCharacterId: characterId, body: 'Legado' }])
  const sameIdNpc = await npc(campaignId, true, characterId)
  const thread = await direct({ senderCharacterId: characterId }, { recipientNpcId: sameIdNpc })
  expect(thread.id).not.toBe(legacy.id)
  await send('player', thread.id, { senderCharacterId: characterId })
  expect((await smsMessages(campaignId, 'narrator', thread.id)).messages).toHaveLength(1)
})

it('mantém migração reaplicável, histórico e integridade XOR sem perder entregas', async () => {
  const { id } = await direct({ senderCharacterId: characterId }, { recipientCharacterId: otherCharacterId })
  await send('player', id, { senderCharacterId: characterId }, 'Preservar')
  const migration = await readFile(new URL('../migrations/20261111_sms_npc_participants.sql', import.meta.url), 'utf8')
  expect(SMS_NPC_SCHEMA.trim()).toBe(migration.trim())
  await pool!.query(migration)
  await pool!.query(migration)
  expect((await smsMessages(campaignId, 'other-player', id)).messages).toHaveLength(1)
  await expect(db.execute(sql`UPDATE character_messages SET sender_npc_id=${npcId}::uuid WHERE thread_id=${id}::uuid`)).rejects.toThrow()
  await expect(db.execute(sql`UPDATE character_message_deliveries SET recipient_npc_id=${npcId}::uuid WHERE recipient_character_id=${otherCharacterId}::uuid`)).rejects.toThrow()
})

it('desabilitação bloqueia envio, preserva histórico e respeita paginação', async () => {
  const { id } = await direct({ senderNpcId: npcId }, { recipientCharacterId: characterId }, 'narrator')
  const first = await send('narrator', id, { senderNpcId: npcId }, 'Primeira')
  await send('narrator', id, { senderNpcId: npcId }, 'Segunda')
  await setSmsSettings(campaignId, 'narrator', false)
  await expect(send('narrator', id, { senderNpcId: npcId })).rejects.toMatchObject({ status: 409 })
  expect((await smsMessages(campaignId, 'player', id)).messages).toHaveLength(2)
  expect((await smsMessages(campaignId, 'player', id, first.id)).messages).toHaveLength(0)
})

it('rotas exigem autenticação, mesma origem e rejeitam identidade ambígua', async () => {
  const request = (body: unknown, origin = 'http://localhost') => new Request('http://localhost/api/sms', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body) })
  const context = { params: Promise.resolve({ id: campaignId }) }
  auth.actor = null
  expect((await startRoute(request({}), context)).status).toBe(401)
  auth.actor = 'narrator'
  expect((await startRoute(request({}, 'https://foreign.example'), context)).status).toBe(403)
  expect((await startRoute(request({ senderCharacterId: characterId, senderNpcId: npcId, recipientNpcId: hiddenNpcId }), context)).status).toBe(422)
  const { id } = await direct({ senderCharacterId: characterId }, { recipientNpcId: npcId })
  auth.actor = 'player'
  expect((await sendRoute(request({ senderNpcId: npcId, body: 'Forjado', idempotencyKey: randomUUID() }), { params: Promise.resolve({ id: campaignId, threadId: id }) })).status).toBe(403)
})

it('Narrador usa NPC em Coterie sem torná-lo membro nem alterar destinatários legados', async () => {
  const coterieId = randomUUID()
  await db.execute(sql`INSERT INTO coteries(id,campaign_id,name) VALUES(${coterieId}::uuid,${campaignId}::uuid,'Grupo')`)
  await db.execute(sql`INSERT INTO coterie_members(coterie_id,character_id) VALUES(${coterieId}::uuid,${characterId}::uuid)`)
  const thread = await smsStart(campaignId, 'narrator', { kind:'COTERIE', coterieId, senderNpcId:npcId })
  await send('narrator', thread.id, { senderNpcId:npcId }, 'Aviso do informante')
  expect((await smsMessages(campaignId, 'player', thread.id)).messages).toMatchObject([{ senderNpcId:npcId, body:'Aviso do informante' }])
  await send('player', thread.id, { senderCharacterId:characterId }, 'Recebido')
  expect((await smsMessages(campaignId, 'player', thread.id)).messages).toHaveLength(2)
  await expect(send('other-player', thread.id, { senderCharacterId:otherCharacterId })).rejects.toMatchObject({status:404})
})

it('limite de envios é compartilhado pelo ator, inclusive alternando NPCs', async () => {
  const thread = await direct({ senderNpcId:npcId }, { recipientCharacterId:characterId }, 'narrator')
  for(let i=0;i<30;i++) await send('narrator', thread.id, { senderNpcId:i%2?hiddenNpcId:npcId }, `Mensagem ${i}`)
  await expect(send('narrator', thread.id, { senderNpcId:npcId })).rejects.toMatchObject({status:429})
  expect((await smsMessages(campaignId, 'narrator', thread.id)).messages).toHaveLength(30)
})

it('revoga operação de NPC na troca de narrador e preserva os registros', async () => {
  const thread = await direct({ senderNpcId:npcId }, { recipientCharacterId:characterId }, 'narrator')
  await send('narrator', thread.id, { senderNpcId:npcId }, 'Antes')
  await db.execute(sql`UPDATE campaigns SET master_user_id='new-narrator' WHERE id=${campaignId}::uuid`)
  await expect(send('narrator', thread.id, { senderNpcId:npcId })).rejects.toMatchObject({status:404})
  await send('new-narrator', thread.id, { senderNpcId:npcId }, 'Depois')
  expect((await smsMessages(campaignId, 'player', thread.id)).messages).toHaveLength(2)
})

it('migra tabelas legadas sem apagar ou reidentificar mensagens/entregas existentes', async () => {
  const client = await pool!.connect()
  const schema = `sms_legacy_${randomUUID().replaceAll('-', '')}`
  try {
    await client.query('BEGIN')
    await client.query(`CREATE SCHEMA ${schema}`)
    await client.query(`SET LOCAL search_path TO ${schema}`)
    await client.query(`CREATE TABLE characters(id UUID PRIMARY KEY);
      CREATE TABLE npc_definitions(id UUID PRIMARY KEY);
      CREATE TABLE character_message_threads(id UUID PRIMARY KEY,campaign_id UUID,kind TEXT,character_a_id UUID,character_b_id UUID,
        CHECK(kind<>'DIRECT' OR (character_a_id IS NOT NULL AND character_b_id IS NOT NULL AND character_a_id<>character_b_id)));
      CREATE TABLE character_messages(id UUID PRIMARY KEY,thread_id UUID,sender_character_id UUID NOT NULL,body TEXT);
      CREATE TABLE character_message_deliveries(message_id UUID,recipient_character_id UUID,PRIMARY KEY(message_id,recipient_character_id));`)
    const messageId=randomUUID(),threadId=randomUUID()
    await client.query("INSERT INTO character_message_threads VALUES($1,$2,'DIRECT',$3,$4)",[threadId,campaignId,characterId,otherCharacterId])
    await client.query("INSERT INTO character_messages VALUES($1,$2,$3,'Histórico legado')",[messageId,threadId,characterId])
    await client.query('INSERT INTO character_message_deliveries VALUES($1,$2)',[messageId,otherCharacterId])
    await client.query(SMS_NPC_SCHEMA)
    await client.query(SMS_NPC_SCHEMA)
    expect((await client.query('SELECT id,body,sender_character_id,sender_npc_id FROM character_messages')).rows).toEqual([{id:messageId,body:'Histórico legado',sender_character_id:characterId,sender_npc_id:null}])
    expect((await client.query('SELECT * FROM character_message_deliveries')).rows).toEqual([{message_id:messageId,recipient_character_id:otherCharacterId,recipient_npc_id:null}])
  } finally {
    await client.query('ROLLBACK')
    client.release()
  }
})
