import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { CharacterCommandError } from '@/lib/character-commands'

const mocks = vi.hoisted(() => ({ session: vi.fn(), prepare: vi.fn(), authorize: vi.fn(), read: vi.fn(), edit: vi.fn(), tokenOptions: vi.fn() }))
vi.mock('@/lib/auth0', () => ({ getSessionOrDev: mocks.session }))
vi.mock('@/lib/sheet-media', async original => ({ ...await original<typeof import('@/lib/sheet-media')>(), prepareSheetUpload: mocks.prepare, authorizeSheetUpload: mocks.authorize, readSheetMedia: mocks.read, editSheetMedia: mocks.edit }))
vi.mock('@vercel/blob/client', () => ({ handleUpload: async ({ body, onBeforeGenerateToken }: { body: { payload: { pathname: string; clientPayload: string } }; onBeforeGenerateToken: (pathname: string, clientPayload: string) => Promise<unknown> }) => {
  const options = await onBeforeGenerateToken(body.payload.pathname, body.payload.clientPayload)
  mocks.tokenOptions(options)
  return { type: 'blob.generate-client-token', clientToken: 'test-token' }
} }))
import { POST as prepare } from '@/app/api/sheet-media/route'
import { POST as token } from '@/app/api/sheet-media/upload/route'
import { GET as read, PATCH as edit, DELETE as remove } from '@/app/api/sheet-media/[id]/route'
import { mediaStagingKey, MAX_SHEET_IMAGE_BYTES } from '@/lib/sheet-media'

const id = '11111111-1111-4111-8111-111111111111'
const context = { params: Promise.resolve({ id }) }
const request = (body: unknown, origin = 'http://localhost') => new Request('http://localhost/api/sheet-media', { method: 'POST', headers: { 'content-type': 'application/json', origin }, body: JSON.stringify(body) })
const tokenBody = (pathname = mediaStagingKey('owner', id)) => ({ type: 'blob.generate-client-token', payload: { pathname, clientPayload: JSON.stringify({ uploadId: id }) } })
beforeEach(() => {
  vi.clearAllMocks()
  mocks.session.mockResolvedValue({ user: { sub: 'owner' } })
  mocks.authorize.mockResolvedValue({})
  mocks.read.mockResolvedValue({ bytes: new Uint8Array([1, 2, 3]), mimeType: 'image/webp' })
  vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'test-token')
})
afterEach(() => vi.unstubAllEnvs())

it('upload, token e leitura exigem sessão antes de acessar mídia', async () => {
  mocks.session.mockResolvedValue(null)
  expect((await prepare(request({ action: 'PREPARE' }))).status).toBe(401)
  expect((await token(request(tokenBody()))).status).toBe(401)
  expect((await read(new Request('http://localhost'), context)).status).toBe(401)
  expect((await edit(request({}), context)).status).toBe(401)
  expect((await remove(request({}), context)).status).toBe(401)
  expect(mocks.prepare).not.toHaveBeenCalled()
  expect(mocks.authorize).not.toHaveBeenCalled()
  expect(mocks.read).not.toHaveBeenCalled()
})

it('nega origem cruzada para reserva/token/edição/remoção', async () => {
  expect((await prepare(request({ action: 'PREPARE' }, 'https://evil.invalid'))).status).toBe(403)
  expect((await token(request(tokenBody(), 'https://evil.invalid'))).status).toBe(403)
  expect((await edit(request({}, 'https://evil.invalid'), context)).status).toBe(403)
  expect((await remove(request({}, 'https://evil.invalid'), context)).status).toBe(403)
  expect(mocks.authorize).not.toHaveBeenCalled()
})

it('token é limitado ao caminho do ator/reserva, MIME e tamanho', async () => {
  expect((await token(request(tokenBody()))).status).toBe(200)
  expect(mocks.authorize).toHaveBeenCalledWith('owner', id)
  expect(mocks.tokenOptions).toHaveBeenCalledWith(expect.objectContaining({ allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'], maximumSizeInBytes: MAX_SHEET_IMAGE_BYTES, addRandomSuffix: false, allowOverwrite: false }))
  expect((await token(request(tokenBody(mediaStagingKey('other', id))))).status).toBe(403)
  expect(mocks.tokenOptions).toHaveBeenCalledOnce()
})

it('reserva alheia ou expirada não recebe token', async () => {
  mocks.authorize.mockRejectedValueOnce(new CharacterCommandError(403, 'Envio expirado ou não autorizado.'))
  expect((await token(request(tokenBody()))).status).toBe(403)
  expect(mocks.tokenOptions).not.toHaveBeenCalled()
})

it('rejeita identificador manipulado e payload de token inválido', async () => {
  expect((await read(new Request('http://localhost'), { params: Promise.resolve({ id: "' OR 1=1" }) })).status).toBe(400)
  expect((await token(request({ ...tokenBody(), payload: { pathname: 'staging', clientPayload: '{' } }))).status).toBe(400)
  expect(mocks.read).not.toHaveBeenCalled()
  expect(mocks.authorize).not.toHaveBeenCalled()
})

it('conteúdo permanece autenticado, privado e sem cache compartilhado', async () => {
  const response = await read(new Request('http://localhost'), context)
  expect(response.status).toBe(200)
  expect(response.headers.get('Cache-Control')).toBe('private, no-store')
  expect(response.headers.get('Vary')).toBe('Cookie')
  expect(response.headers.get('Content-Type')).toBe('image/webp')
  expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
  expect(Array.from(new Uint8Array(await response.arrayBuffer()))).toEqual([1, 2, 3])
})

it('nega leitura privada e não expõe erros internos de storage', async () => {
  mocks.read.mockRejectedValueOnce(new CharacterCommandError(403, 'Acesso negado.'))
  expect((await read(new Request('http://localhost'), context)).status).toBe(403)
  mocks.read.mockRejectedValueOnce(new Error('internal storage credential'))
  const response = await read(new Request('http://localhost'), context)
  expect(response.status).toBe(500)
  expect(await response.text()).not.toContain('internal storage credential')
})
