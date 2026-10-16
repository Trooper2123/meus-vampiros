import { expect, it } from 'vitest'
import { mkdtempSync, readFileSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import typescript from 'typescript'
import { runTypeCheck } from 'next/dist/lib/typescript/runTypeCheck'
import { loadBindings } from 'next/dist/build/swc'

it('configuração não dispensa tipos e verificador Next rejeita erro isolado', async () => {
  expect(readFileSync('next.config.mjs', 'utf8')).not.toMatch(/ignoreBuildErrors\s*:\s*true/)
  const directory = mkdtempSync(join(tmpdir(), 'vampiros-type-gate-'))
  const config = join(directory, 'tsconfig.json')
  const source = join(directory, 'check.ts')
  try {
    await loadBindings()
    writeFileSync(config, JSON.stringify({ compilerOptions: { strict: true, noEmit: true, types: [], skipLibCheck: true }, files: ['check.ts'] }))
    writeFileSync(source, 'export const value: number = "invalid"')
    await expect(runTypeCheck(typescript, directory, '.next', config)).rejects.toThrow(/not assignable/)
    writeFileSync(source, 'export const value: number = 1')
    await expect(runTypeCheck(typescript, directory, '.next', config)).resolves.toMatchObject({ inputFilesCount: 1 })
  } finally {
    unlinkSync(source)
    unlinkSync(config)
    rmdirSync(directory)
  }
}, 15000)
