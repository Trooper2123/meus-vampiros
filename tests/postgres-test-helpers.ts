import { randomUUID } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

export function preparePostgresTest() {
  const databaseUrl = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null
  const isolated = databaseUrl && ['localhost', '127.0.0.1', '[::1]'].includes(databaseUrl.hostname) && databaseUrl.searchParams.get('options')?.includes('search_path=meus_vampiros_test')
  if (process.env.NODE_ENV === 'production' || !isolated) {
    throw new Error('Os testes PostgreSQL exigem o schema isolado meus_vampiros_test.')
  }
}

export async function createTestCampaign(masterUserId: string, name = 'Mesa de teste') {
  const id = randomUUID()
  await db.execute(sql`INSERT INTO campaigns (id, master_user_id, name) VALUES (${id}::uuid, ${masterUserId}, ${name})`)
  return { id, masterUserId, name }
}

export async function createTestCharacter(userId: string, campaignId: string | null, name = 'Personagem de teste', data: Record<string, unknown> = {}) {
  const id = randomUUID()
  await db.execute(sql`INSERT INTO characters (id, user_id, created_by_user_id, campaign_id, name, data) VALUES (${id}::uuid, ${userId}, ${userId}, ${campaignId}::uuid, ${name}, ${JSON.stringify(data)}::jsonb)`)
  return { id, userId, campaignId, name }
}
