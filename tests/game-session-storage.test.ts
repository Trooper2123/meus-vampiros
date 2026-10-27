import { afterEach, expect, it, vi } from 'vitest'
import { closeGameSession, getCampaignGameSession, getGameSession, startGameSession } from '@/lib/game-sessions'

vi.mock('@/lib/db', () => ({ db: null }))
afterEach(() => vi.unstubAllEnvs())

it.each(['development', 'test', 'production'])('exige PostgreSQL em %s sem criar sessão volátil', async environment => {
  vi.stubEnv('NODE_ENV', environment)
  vi.stubEnv('DATABASE_URL', '')
  const id = crypto.randomUUID()
  for (const operation of [
    () => getCampaignGameSession('actor', id),
    () => getGameSession('actor', id),
    () => startGameSession('actor', id, { idempotencyKey: crypto.randomUUID() }),
    () => closeGameSession('actor', id, { idempotencyKey: crypto.randomUUID(), expectedRevision: 1 }),
  ]) {
    await expect(operation()).rejects.toMatchObject({ status: 503 })
  }
})
