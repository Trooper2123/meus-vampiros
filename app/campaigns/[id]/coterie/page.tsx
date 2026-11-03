import { notFound, redirect } from 'next/navigation'
import { getSessionOrDev } from '@/lib/auth0'
import { getCampaignsForMaster } from '@/lib/campaigns'
import { getPlayerCampaign } from '@/lib/player-campaigns'

/** Link legado: Coterie agora é uma aba do hub da campanha. */
export default async function LegacyCampaignCoteriePage({params}:Readonly<{params:Promise<{id:string}>}>) {
 const session=await getSessionOrDev()
 if(!session?.user?.sub)redirect('/auth/login?returnTo=/campaigns')
 const {id}=await params
 const master=(await getCampaignsForMaster(session.user.sub)).some(c=>c.id===id)
 if(master)redirect('/campaigns/'+id+'?view=coterie')
 if(await getPlayerCampaign(session.user.sub,id))redirect('/campaigns/player/'+id+'?tab=coterie')
 notFound()
}
