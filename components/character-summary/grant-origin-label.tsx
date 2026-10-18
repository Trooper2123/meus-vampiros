import { grantedDotOrigins, type CreationGrant } from '@/lib/vtm-v5/creation-grants'

export function GrantOriginLabel({ grants = [], kind, id, level }: Readonly<{ grants?: readonly CreationGrant[]; kind: CreationGrant['kind']; id?: string; level: number }>) {
  const origins = grantedDotOrigins(grants, kind, id, level)
  const clan = origins.filter(origin => origin === 'CLAN').length
  const predator = origins.filter(origin => origin === 'PREDATOR').length
  if (!clan && !predator) return null
  return <span className="grant-origin mt-1 block text-xs">{[clan ? `${clan} ponto(s) de clã` : '', predator ? `${predator} ponto(s) de predação` : ''].filter(Boolean).join(' · ')} — preenchimento automático</span>
}
