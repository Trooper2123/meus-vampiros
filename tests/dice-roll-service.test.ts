import { describe, expect, it, vi } from 'vitest'
import { drawD10, rollV5Pool } from '@/lib/vtm-v5/dice-roll-service'

describe('serviÃ§o de geraÃ§Ã£o de dados V5', () => {
  it('valida a resposta do provider e separa Hunger Dice antes da avaliaÃ§Ã£o', () => {
    const provider = { rollD10: vi.fn(() => [10, 6, 10, 1]) }
    expect(rollV5Pool(provider, 4, 2, 2)).toMatchObject({ normalDice: [10, 6], hungerDice: [10, 1], successes: 5, outcome: 'MESSY_CRITICAL' })
    expect(provider.rollD10).toHaveBeenCalledExactlyOnceWith(4)
  })

  it.each([[], [0], [11], [1.5], [NaN]].map(dice => ({ dice })))('rejects invalid faces $dice', ({ dice }) => expect(() => drawD10({ rollD10: () => dice }, 1)).toThrow())
  it('rejeita comprimento divergente e quantidade fora do limite sem aceitar dados do cliente', () => {
    expect(() => drawD10({ rollD10: () => [6] }, 2)).toThrow()
    expect(() => drawD10({ rollD10: () => [] }, 51)).toThrow()
  })
  it('rejeita Hunger Dice maior que a parada antes de chamar o provider', () => {
    const provider = { rollD10: vi.fn(() => []) }
    expect(() => rollV5Pool(provider, 1, 2, 1)).toThrow()
    expect(provider.rollD10).not.toHaveBeenCalled()
  })
})
