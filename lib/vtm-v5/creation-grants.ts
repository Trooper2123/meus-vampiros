import type { CreationEffect } from '@/lib/creation-effects'

export type CreationGrant = Pick<CreationEffect, 'origin' | 'kind' | 'id' | 'name' | 'dots'>

export function grantedDotOrigins(grants: readonly CreationGrant[], kind: CreationGrant['kind'], id: string | undefined, level: number): (CreationGrant['origin'] | null)[] {
  const origins = grants.filter(grant => grant.id === id && grant.kind === kind).flatMap(grant => Array.from({ length: Math.max(0, Math.min(5, grant.dots)) }, () => grant.origin))
  const manual = Math.max(0, level - origins.length)
  return Array.from({ length: level }, (_, index) => index < manual ? null : origins[index - manual] ?? null)
}

export function projectCreationGrants(state: Record<string, unknown>): CreationGrant[] {
  return (Array.isArray(state.creationEffects) ? state.creationEffects as CreationEffect[] : []).map(({ origin, kind, id, name, dots }) => ({ origin, kind, id, name, dots }))
}
