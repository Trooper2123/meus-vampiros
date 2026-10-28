import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Regressões de acesso usam mocks e não carregam credenciais/setup de banco.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./', import.meta.url)) } },
  test: {
    environment: 'node',
    fileParallelism: false,
    include: [
      'tests/campaign-creation-access.test.ts',
      'tests/campaign-new-ui.test.ts',
      'tests/campaign-master-role.test.ts',
      'tests/auth-production.test.ts',
      'tests/dev-master-profile.test.ts',
      'tests/unified-profile-ownership.test.ts',
      'tests/character-independent-routes.test.ts',
      'tests/character-type-access-route.test.ts',
      'tests/master-research-catalog.test.ts',
      'tests/merits-flaws-research-page.test.ts',
    ],
  },
})
