import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { join } from 'node:path'
import { notesActor, notesResponse } from '@/lib/notes-http'
import { CharacterCommandError } from '@/lib/character-commands'
import { RULE_SOURCES, type RuleSourceId } from '@/lib/vtm-v5/rule-profile'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await notesActor(request)
    const { id } = await context.params
    if (!Object.hasOwn(RULE_SOURCES, id)) return notesResponse({ error: 'Fonte não encontrada.' }, 404)
    const path = join(process.cwd(), 'docs', 'books', RULE_SOURCES[id as RuleSourceId].file)
    const info = await stat(path)
    return new Response(Readable.toWeb(createReadStream(path)) as ReadableStream, { headers: { 'Content-Type': 'application/pdf', 'Content-Length': String(info.size), 'Content-Disposition': 'inline', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', Vary: 'Cookie' } })
  } catch (error) {
    return notesResponse({ error: error instanceof CharacterCommandError ? error.message : 'Fonte indisponível.' }, error instanceof CharacterCommandError ? error.status : 404)
  }
}
