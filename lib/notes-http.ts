import { NextResponse } from 'next/server'
import { getSessionOrDev } from './auth0'
import { CharacterCommandError } from './character-commands'
import { noteUuid } from './notes'

export async function notesActor(request: Request, mutate = false) {
  const session = await getSessionOrDev()
  if (!session?.user?.sub) { throw new CharacterCommandError(401, 'Não autorizado.') }
  if (mutate) {
    const origin = request.headers.get('origin')
    if ((origin && origin !== new URL(request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site') { throw new CharacterCommandError(403, 'Origem da requisição não permitida.') }
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) { throw new CharacterCommandError(400, 'Envie dados JSON.') }
  }
  return session.user.sub
}

export function notesResponse(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } }) }
export function notesFailure(error: unknown) { return notesResponse({ error: error instanceof CharacterCommandError ? error.message : 'Não foi possível acessar as anotações.' }, error instanceof CharacterCommandError ? error.status : 500) }
export async function notesBody(request: Request): Promise<Record<string, unknown>> {
  if (Number(request.headers.get('content-length')) > 100000) { throw new CharacterCommandError(413, 'Anotação muito grande.') }
  const reader = request.body?.getReader()
  if (!reader) { throw new CharacterCommandError(400, 'Dados JSON inválidos.') }
  const decoder = new TextDecoder()
  let size = 0
  let text = ''
  while (true) {
    const chunk = await reader.read()
    if (chunk.done) { break }
    size += chunk.value.byteLength
    if (size > 100000) { await reader.cancel(); throw new CharacterCommandError(413, 'Anotação muito grande.') }
    text += decoder.decode(chunk.value, { stream: true })
  }
  text += decoder.decode()
  try {
    const value = JSON.parse(text)
    if (!value || typeof value !== 'object' || Array.isArray(value)) { throw new Error('Dados JSON inválidos.') }
    return value
  } catch { throw new CharacterCommandError(400, 'Dados JSON inválidos.') }
}
export function notesId(id: string) { if (!noteUuid(id)) { throw new CharacterCommandError(400, 'Identificador inválido.'); }
  return id }
