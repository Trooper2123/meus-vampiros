import { CharacterCommandError, runCharacterCommand } from '@/lib/character-commands'

/**
 * One-time historical XP reconciliation for a standalone character.
 * Imported XP represents past progression, not purchases performed by the app.
 */
export function importStandaloneCharacterXp(
  actorId: string,
  characterId: string,
  totalXp: number,
  spentXp: number,
  key: string,
  expectedRevision: number,
) {
  if (!Number.isSafeInteger(totalXp) || !Number.isSafeInteger(spentXp) ||
      totalXp < 0 || totalXp > 1000000 || spentXp < 0 || spentXp > totalXp) {
    throw new CharacterCommandError(400, 'Valores de experiência inválidos.')
  }
  return runCharacterCommand(
    actorId, characterId,
    { key, type: 'STANDALONE_XP_IMPORTED', expectedRevision, payload: { totalXp, spentXp } },
    character => character.ownerId === actorId && character.campaignId === null &&
      character.characterType === 'PLAYER_VAMPIRE' && character.data.entryMode === 'EXISTING',
    character => {
      if (character.data.historicalXpImported === true || character.totalXp !== 0 || character.spentXp !== 0) {
        throw new CharacterCommandError(409, 'O XP histórico já foi registrado ou a ficha possui movimentações de experiência.')
      }
      character.totalXp = totalXp
      character.spentXp = spentXp
      character.data = {
        ...character.data,
        historicalXpImported: true,
        historicalXp: { totalXp, spentXp, importedAt: new Date().toISOString() },
      }
      return { ok: true, totalXp, spentXp, availableXp: totalXp - spentXp }
    },
  )
}
