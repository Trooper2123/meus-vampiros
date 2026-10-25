import { redirect,notFound } from 'next/navigation'
import { ArchiveHeader } from '@/components/archive-header'
import { NpcDetail } from '@/components/npcs/npc-detail'
import { getSessionOrDev } from '@/lib/auth0'
import { hasMasterAccess } from '@/lib/campaigns'
export default async function NpcPage({params}:Readonly<{params:Promise<{id:string}>}>){const session=await getSessionOrDev();if(!session?.user){ redirect('/auth/login?returnTo=/npcs'); }if(!await hasMasterAccess(session.user)){ notFound(); }const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id)){ notFound(); }return <main className="min-h-screen bg-background text-foreground"><ArchiveHeader title="Ficha de NPC" showCampaigns/><div className="archive-content"><NpcDetail id={id}/></div></main>}
