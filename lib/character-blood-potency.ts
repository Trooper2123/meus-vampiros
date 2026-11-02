import { CharacterCommandError, getCommandCharacter } from './character-commands'
import { BLOOD_POTENCY_DERIVED_FIELDS, calculateBloodPotencyEffects } from './vtm-v5/blood-potency'
import type { BloodContext } from './vtm-v5/blood-potency'
import { getBloodPolicy } from './blood-policy'
import { GENERATION_POTENCY_LIMITS } from './vtm-v5/blood-potency-catalog'

export function assertBloodPotencyInput(data: Record<string, unknown>, previous?: Record<string, unknown>) {
  const raw = data['potencia-de-sangue']
  if (raw !== undefined && raw !== '') {
    const potency = typeof raw === 'number' || (typeof raw === 'string' && raw.trim()) ? Number(raw) : Number.NaN
    if (!Number.isSafeInteger(potency) || potency < 0 || potency > 10) throw new CharacterCommandError(422, 'Potência do Sangue inválida.')
  }
  if (raw !== undefined && raw !== '') {
    const merged = { ...previous, ...data }
    const potency = Number(raw)
    const thin = merged.isThinBlood === true || merged.creationType === 'THIN_BLOOD' || merged.clanCode === 'THIN_BLOOD' || ['sangue-ralo', 'sangue-fraco'].includes(String(merged.cla ?? '').toLowerCase())
    if (thin && potency !== 0) throw new CharacterCommandError(422, 'Sangue-Ralo não aumenta Potência diretamente: a transição exige Diablerie mediada pelo Narrador.')
    const generation = merged.geracao
    if (generation !== undefined && generation !== '' && generation !== null) {
      const limit = GENERATION_POTENCY_LIMITS[Number(generation)]
      if (!limit || potency < limit[0] || potency > limit[1]) throw new CharacterCommandError(422, 'Potência fora dos limites da geração (tabela oficial 4ª–16ª).')
    }
  }
  for (const field of BLOOD_POTENCY_DERIVED_FIELDS) {
    if (Object.hasOwn(data, field) && (!previous || JSON.stringify(data[field]) !== JSON.stringify(previous[field]))) throw new CharacterCommandError(422, 'Os efeitos da Potência do Sangue são calculados, não editáveis.')
  }
}

export async function getCharacterBloodPotencyEffects(characterId: string, actorId: string) {
  const character = await getCommandCharacter(characterId)
  if (!character) throw new CharacterCommandError(404, 'Ficha não encontrada.')
  if (character.ownerId !== actorId && character.masterId !== actorId) throw new CharacterCommandError(403, 'Acesso negado.')
  if (!['PLAYER_VAMPIRE', 'VAMPIRE_NPC'].includes(character.characterType)) throw new CharacterCommandError(422, 'Os efeitos exigem ficha de vampiro.')
  const policy = await getBloodPolicy(character.campaignId)
  const context = character.gameState.bloodContext as BloodContext | undefined
  try { return calculateBloodPotencyEffects(character.data, policy.rulesetVersion, { ...context, characterRevision: character.revision, now: new Date().toISOString() }, policy) }
  catch (error) { throw new CharacterCommandError(422, error instanceof Error ? error.message : 'Potência inválida.') }
}
