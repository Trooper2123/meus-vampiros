import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'
import { defineConfig } from 'vitest/config'

loadEnv({ path: '.env.local', quiet: true })
if (!process.env.DATABASE_URL) throw new Error('Configure o PostgreSQL local de testes.')
const databaseUrl = new URL(process.env.DATABASE_URL)
if (!['localhost', '127.0.0.1', '[::1]'].includes(databaseUrl.hostname)) throw new Error('Testes de mídia exigem PostgreSQL local.')
databaseUrl.searchParams.set('options', '-c search_path=meus_vampiros_test')
process.env.DATABASE_URL = databaseUrl.toString()

// Usa tabelas de teste existentes; não executa DDL, seeds, limpeza ou Blob externo.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./', import.meta.url)) } },
  test: { environment: 'node', fileParallelism: false, include: ['tests/sheet-media-*.test.ts'] },
})
