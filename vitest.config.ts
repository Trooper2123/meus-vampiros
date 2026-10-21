import { fileURLToPath, URL } from 'node:url'
import { config as loadEnv } from 'dotenv'
import { defineConfig } from 'vitest/config'

loadEnv({ path: '.env.local' })
if (process.env.DATABASE_URL) {
  const testDatabaseUrl = new URL(process.env.DATABASE_URL)
  if (!['localhost', '127.0.0.1', '[::1]'].includes(testDatabaseUrl.hostname)) {
    throw new Error('O DATABASE_URL dos testes deve apontar para um PostgreSQL local.')
  }
  testDatabaseUrl.searchParams.set('options', '-c search_path=meus_vampiros_test')
  process.env.DATABASE_URL = testDatabaseUrl.toString()
}

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    fileParallelism: false,
    globalSetup: ['./tests/postgres-global-setup.ts'],
  },
})
