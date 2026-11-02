import { expect, it, vi } from 'vitest'
import { ensureAllTables, pool } from '@/lib/db'

it('shares schema initialization between concurrent callers', async () => {
  if (!pool) throw new Error('Configure o PostgreSQL local de testes.')
  const query = vi.spyOn(pool, 'query')
  try {
    await Promise.all([ensureAllTables(), ensureAllTables()])
    expect(query).toHaveBeenCalledTimes(2)
  } finally {
    query.mockRestore()
  }
})
