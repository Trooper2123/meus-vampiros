import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { defineConfig } from 'vitest/config'

config({ path: '.env.local', quiet: true })
if (!process.env.DATABASE_URL) throw new Error('Configure o PostgreSQL local de testes.')
const url = new URL(process.env.DATABASE_URL)
if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Os testes exigem PostgreSQL local.')
url.searchParams.set('options', '-c search_path=meus_vampiros_test')
process.env.DATABASE_URL = url.toString()

// Schema existente e migração aplicada explicitamente; sem DDL, seeds ou limpeza.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./', import.meta.url)) } },
  test: { environment: 'node', fileParallelism: false, include: [
    'tests/session-notes.test.ts', 'tests/session-notes-ui.test.tsx', 'tests/campaign-archive.test.ts', 'tests/notes.test.ts',
    'tests/notes-ui.test.ts', 'tests/sheet-media-*.test.ts', 'tests/game-session-commands-ui.test.ts',
    'tests/game-sessions.test.ts', 'tests/game-session-workspace.test.ts', 'tests/npc-narrative-navigation.test.ts',
  ] },
})
