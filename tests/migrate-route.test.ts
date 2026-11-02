import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  vi.stubEnv('MIGRATE_SECRET', 'test-migrate-token')
  return { ensureAllTables: vi.fn() }
})
vi.mock('@/lib/db', () => ({ ensureAllTables: mocks.ensureAllTables }))

import { POST } from '@/app/api/migrate/route'

const request = (authorization?: string) => new Request('http://localhost/api/migrate', {
  method: 'POST',
  headers: authorization ? { authorization } : undefined,
})

afterEach(() => vi.clearAllMocks())

describe('POST /api/migrate', () => {
  it('requires the migration token', async () => {
    expect((await POST(request())).status).toBe(401)
    expect(mocks.ensureAllTables).not.toHaveBeenCalled()
  })

  it('does not expose database errors to the caller', async () => {
    mocks.ensureAllTables.mockRejectedValueOnce(new Error('postgres://private-host/db: password rejected'))
    const response = await POST(request('Bearer test-migrate-token'))
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Falha na migração.' })
  })
})
