import { CharacterCommandError, runCharacterCommand } from '@/lib/character-commands'

export function grantCharacterXp(actorId: string, characterId: string, amount: number, reason: string, key: string, campaignId?: string) {
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 10000 || !reason.trim() || reason.length > 500) throw new CharacterCommandError(400, 'Quantidade ou motivo de XP inválido.')
  return runCharacterCommand(actorId, characterId, { key, type: 'XP_GRANTED', payload: { amount, reason: reason.trim() } }, character => Boolean(character.campaignId && character.masterId === actorId && (!campaignId || character.campaignId === campaignId)), character => {
    if (!Number.isSafeInteger(character.totalXp) || !Number.isSafeInteger(character.spentXp) || character.spentXp < 0 || character.spentXp > character.totalXp || character.totalXp + amount > 1000000) throw new CharacterCommandError(422, 'Saldo de XP inválido ou limite excedido.')
    character.totalXp += amount
    return { ok: true, totalXp: character.totalXp, spentXp: character.spentXp, availableXp: character.totalXp - character.spentXp }
  })
}
