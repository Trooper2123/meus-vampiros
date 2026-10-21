import type { ReactElement } from 'react'
import { expect, it, vi } from 'vitest'
import { HistoricalXpImport } from '@/components/character-form/historical-xp-import'

vi.mock('react', async importOriginal => {
  const original = await importOriginal<typeof import('react')>()
  return { ...original, useState: (initial: unknown) => [initial, vi.fn()] }
})

function findButton(node: unknown): ReactElement<{ onClick?: () => void; children?: unknown }> | undefined {
  if (Array.isArray(node)) return node.map(findButton).find(Boolean)
  if (!node || typeof node !== 'object' || !('props' in node)) return undefined
  const element = node as ReactElement<{ onClick?: () => void; children?: unknown }>
  if (element.type === 'button') return element
  return findButton(element.props.children)
}

it('envia e repassa os saldos de XP histórico informados', async () => {
  const onImported = vi.fn().mockResolvedValue(undefined)
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true }))
  vi.stubGlobal('fetch', fetchMock)
  try {
    const tree = HistoricalXpImport({ characterId: 'character', revision: 4, totalXp: 0, spentXp: 0, onImported })
    const button = findButton(tree)
    expect(button).toBeDefined()
    button?.props.onClick?.()
    await vi.waitFor(() => expect(onImported).toHaveBeenCalledWith({ totalXp: 50, spentXp: 47 }))
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ totalXp: 50, spentXp: 47, expectedRevision: 4 })
  } finally {
    vi.unstubAllGlobals()
  }
})
