import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionOrDev } from '@/lib/auth0'
import { NotesPanel } from '@/components/notes/notes-panel'
import { noteUuid, type NoteLink } from '@/lib/notes'

export default async function NotesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getSessionOrDev()
  if (!session?.user?.sub) redirect('/auth/login?returnTo=/notes')
  const params = await searchParams
  const link = typeof params.targetType === 'string' && ['CHARACTER', 'NPC', 'EVENT', 'SESSION'].includes(params.targetType) && noteUuid(params.targetId) ? { targetType: params.targetType as NoteLink['targetType'], targetId: params.targetId } : undefined
  return <main className="min-h-screen bg-background px-4 py-10 text-foreground"><div className="mx-auto max-w-6xl"><Link href="/characters" className="button-ghost">Voltar aos personagens</Link><h1 className="my-6 font-serif text-3xl">Anotações da noite</h1><NotesPanel actorId={session.user.sub} link={link} /></div></main>
}
