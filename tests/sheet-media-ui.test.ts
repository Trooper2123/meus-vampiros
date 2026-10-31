import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement, ReactNode } from 'react'
import type { SheetMediaView } from '@/components/sheet-media-panel'

const harness = vi.hoisted(() => ({ states: [] as unknown[], index: 0, data: undefined as { media: SheetMediaView[]; portrait: SheetMediaView | null; canEdit: boolean; storageConfigured: boolean } | undefined, mutate: vi.fn(), upload: vi.fn(), input: { value: 'portrait.png' } }))
vi.mock('react', async original => ({
  ...await original<typeof import('react')>(),
  useEffect: () => {},
  useRef: () => ({ current: harness.input }),
  useState: (initial: unknown) => {
    const index = harness.index++
    if (!(index in harness.states)) harness.states[index] = initial
    return [harness.states[index], (value: unknown) => { harness.states[index] = value }]
  },
}))
vi.mock('swr', () => ({ default: () => ({ data: harness.data, mutate: harness.mutate }) }))
vi.mock('@vercel/blob/client', () => ({ upload: harness.upload }))
import { SheetMediaPanel } from '@/components/sheet-media-panel'

type Element = ReactElement<Record<string, unknown>>
function elements(node: ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements)
  if (!node || typeof node !== 'object' || !('props' in node)) return []
  const element = node as Element
  return [element, ...elements(element.props.children as ReactNode)]
}
const props = { subjectType: 'CHARACTER' as const, subjectId: 'character', compact: true }
function tree() { harness.index = 0; return SheetMediaPanel(props) }
function html() { return renderToStaticMarkup(tree()) }
function button(label: string) { return elements(tree()).find(element => element.type === 'button' && element.props.children === label)! }
async function click(label: string) { await (button(label).props.onClick as () => Promise<void> | void)() }
function fileInput() { return elements(tree()).find(element => element.props.type === 'file')! }
function choose(file: File) { (fileInput().props.onChange as (event: unknown) => void)({ target: { files: [file] } }) }
async function submit() { await (elements(tree()).find(element => element.type === 'form')!.props.onSubmit as (event: unknown) => Promise<void>)({ preventDefault: vi.fn() }) }
const portrait: SheetMediaView = { id: 'portrait', title: 'Retrato', description: '', category: '', isPortrait: true, positionX: 25, positionY: 75, visibility: 'OWNER_ONLY', revision: 3, url: '/api/sheet-media/portrait', canEdit: true, global: true }

beforeEach(() => {
  harness.states = []; harness.input.value = 'portrait.png'
  harness.data = { media: [portrait], portrait, canEdit: true, storageConfigured: true }
  harness.mutate.mockReset().mockResolvedValue(undefined)
  harness.upload.mockReset().mockResolvedValue({})
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({})))
  vi.stubGlobal('window', { confirm: vi.fn().mockReturnValue(true) })
})
afterEach(() => vi.unstubAllGlobals())

it.each(['CHARACTER', 'NPC'] as const)('retratos de %s oferecem edição/remoção somente para quem pode editar', subjectType => {
  harness.index = 0
  const editable = renderToStaticMarkup(SheetMediaPanel({ ...props, subjectType }))
  expect(editable).toContain('Editar retrato')
  expect(editable).toContain('Remover retrato')
  harness.data = { ...harness.data!, canEdit: false, portrait: { ...portrait, canEdit: false } }
  expect(html()).not.toContain('Editar retrato')
  expect(html()).not.toContain('Remover retrato')
  expect(html()).not.toContain('<form')
})

it('edita enquadramento usando revisão e sem reenviar o arquivo', async () => {
  await click('Editar retrato')
  expect(html()).toContain('Editar metadados e enquadramento')
  expect(html()).not.toContain('type="file"')
  const horizontal = elements(tree()).find(element => element.props.type === 'range')!;
  (horizontal.props.onChange as (event: unknown) => void)({ target: { value: '40' } })
  await submit()
  expect(fetch).toHaveBeenCalledWith('/api/sheet-media/portrait', expect.objectContaining({ method: 'PATCH' }))
  const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)
  expect(body).toMatchObject({ expectedRevision: 3, data: { isPortrait: true, positionX: 40, positionY: 75 } })
  expect(harness.upload).not.toHaveBeenCalled()
})

it('confirmação pode ser repetida sem novo upload ou reserva e limpa o campo após sucesso', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(Response.json({ pathname: 'staging', uploadId: 'upload' }))
    .mockResolvedValueOnce(Response.json({ error: 'Confirmação indisponível' }, { status: 503 }))
    .mockResolvedValueOnce(Response.json({}))
  choose(new File(['image'], 'portrait.png', { type: 'image/png' }))
  await submit()
  expect(html()).toContain('Confirmação indisponível')
  expect(html()).toContain('Confirmar envio novamente')
  expect(fileInput().props.disabled).toBe(true)
  expect(harness.input.value).toBe('portrait.png')
  await submit()
  expect(harness.upload).toHaveBeenCalledOnce()
  expect(vi.mocked(fetch).mock.calls.map(call => JSON.parse(call[1]!.body as string).action)).toEqual(['PREPARE', 'CONFIRM', 'CONFIRM'])
  expect(harness.input.value).toBe('')
  expect(html()).toContain('Imagem salva.')
})

it('falha de atualização da lista preserva o sucesso confirmado', async () => {
  harness.mutate.mockRejectedValue(new Error('offline'))
  await click('Editar retrato')
  await submit()
  expect(html()).toContain('Imagem salva. Não foi possível atualizar a lista')
  expect(html()).not.toContain('Editar metadados e enquadramento')
  expect(fetch).toHaveBeenCalledOnce()
})

it('remoção exige confirmação e envia revisão, sem expor chave de storage', async () => {
  vi.mocked(window.confirm).mockReturnValueOnce(false)
  await click('Remover retrato')
  expect(fetch).not.toHaveBeenCalled()
  await click('Remover retrato')
  expect(fetch).toHaveBeenCalledWith('/api/sheet-media/portrait', expect.objectContaining({ method: 'DELETE', body: JSON.stringify({ expectedRevision: 3 }) }))
  await vi.waitFor(() => expect(harness.mutate).toHaveBeenCalledOnce())
})

it('falha na remoção mantém o retrato confirmado e libera nova tentativa', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(Response.json({ error: 'A imagem foi alterada.' }, { status: 409 }))
  await click('Remover retrato')
  await vi.waitFor(() => expect(html()).toContain('A imagem foi alterada.'))
  expect(html()).toContain('src="/api/sheet-media/portrait"')
  expect(harness.mutate).not.toHaveBeenCalled()
  expect(button('Remover retrato').props.disabled).toBe(false)
})

it('remoção confirmada fecha edição e distingue falha ao atualizar a lista', async () => {
  await click('Editar retrato')
  harness.mutate.mockRejectedValue(new Error('offline'))
  await click('Remover retrato')
  await vi.waitFor(() => expect(html()).toContain('Imagem removida. Não foi possível atualizar a lista'))
  expect(html()).not.toContain('Editar metadados e enquadramento')
})

it.each([{ type: 'image/svg+xml', size: 1 }, { type: 'image/png', size: 5 * 1024 * 1024 + 1 }])('rejeita tipo/tamanho inválido antes da rede: %j', async ({ type, size }) => {
  choose(new File([new Uint8Array(size)], 'file', { type }))
  await submit()
  expect(html()).toContain('Envie JPEG, PNG ou WebP de até 5 MB.')
  expect(fetch).not.toHaveBeenCalled()
  expect(harness.upload).not.toHaveBeenCalled()
})

it('falha no upload mantém arquivo e título para nova tentativa', async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json({ pathname: 'staging', uploadId: 'upload' }))
  harness.upload.mockRejectedValueOnce(new Error('Conexão interrompida'))
  choose(new File(['image'], 'meu-retrato.png', { type: 'image/png' }))
  await submit()
  expect(html()).toContain('Conexão interrompida')
  expect(html()).toContain('value="meu-retrato"')
  expect(fileInput().props.disabled).toBe(false)
  expect(harness.input.value).toBe('portrait.png')
})

it('distingue carregamento de retrato ausente e storage não habilitado', () => {
  harness.data = undefined
  expect(html()).toContain('Carregando imagens...')
  expect(html()).not.toContain('Sem retrato')
  harness.data = { media: [], portrait: null, canEdit: true, storageConfigured: false }
  expect(html()).toContain('Sem retrato')
  expect(html()).toContain('O envio de imagens ainda não foi habilitado')
  expect(fileInput().props.disabled).toBe(true)
})
