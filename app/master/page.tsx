import { redirect } from 'next/navigation'
import { getSessionOrDev } from '@/lib/auth0'
import { hasMasterAccess } from '@/lib/campaigns'

export default async function MasterPage() {
  const session = await getSessionOrDev()

  if (!session?.user) redirect('/api/auth/login?returnTo=/master')

  if (await hasMasterAccess(session.user)) redirect('/campaigns')

  redirect('/campaigns/new')
}
