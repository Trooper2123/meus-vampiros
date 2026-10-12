import { Eye, LockKeyhole } from 'lucide-react'
import type { CampaignEventVisibility } from '@/lib/types/campaign-event'

export function VisibilityBadge({ visibility }: { visibility: CampaignEventVisibility }) {
  const privateEvent = visibility === 'master'
  const Icon = privateEvent ? LockKeyhole : Eye

  return (
    <span className={`status ${privateEvent ? 'risk' : 'active'}`}>
      <Icon className="size-3" aria-hidden="true" />
      {privateEvent ? 'Apenas mestre' : 'Todos os participantes'}
    </span>
  )
}
