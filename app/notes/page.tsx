import { ArchiveHeader } from '@/components/archive-header'
import { redirect } from 'next/navigation'
import { getSessionOrDev } from '@/lib/auth0'
import { NotesPanel } from '@/components/notes/notes-panel'
import { noteUuid, type NoteLink } from '@/lib/notes'

export default async function NotesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getSessionOrDev()
  if (!session?.user?.sub) redirect('/auth/login?returnTo=/notes')
  const params = await searchParams
  const link = typeof params.targetType === 'string' && ['CHARACTER', 'NPC', 'EVENT', 'SESSION'].includes(params.targetType) && noteUuid(params.targetId) ? { targetType: params.targetType as NoteLink['targetType'], targetId: params.targetId } : undefined
  return <main className="min-h-screen bg-background text-foreground"><div className="noise" aria-hidden="true" /><ArchiveHeader title="Anotações" /><div className="archive-content"><section className="archive-page-heading"><p className="eyebrow">Arquivo pessoal / memória da crônica</p><h1 className="mt-3 font-serif text-4xl uppercase sm:text-6xl">Anotações</h1><p className="mt-3 text-sm text-muted-foreground">Privadas por padrão. Compartilhe somente com destinatários autorizados.</p></section><NotesPanel actorId={session.user.sub} link={link} /></div></main>
}
