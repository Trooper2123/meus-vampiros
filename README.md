# Meus Vampiros

Aplicação de fichas e gerenciamento de mesas de Vampiro: A Máscara V5, com Next.js, React, TypeScript e PostgreSQL.

O perfil é único: toda conta autenticada pode jogar, criar mesas e usar ferramentas de Narrador, sem exigir roles do Auth0. A gestão continua vinculada ao ID da sessão: `campaigns.master_user_id` para mesas e `characters.user_id` para fichas. Participação, convites e permissões do Narrador da mesa continuam sendo validados por recurso; o perfil comum não concede acesso a dados de terceiros.

## Desenvolvimento

Requisito do Next instalado: Node.js >= 20.9.0 e pnpm disponível.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Acesse http://localhost:3000. Configure `DATABASE_URL` para os fluxos persistentes. O modo sessão exige PostgreSQL em todos os ambientes e retorna 503 sem configuração; não cria partidas em memória. A identidade local de desenvolvimento não representa autenticação de produção. DEV_AUTH_BYPASS não dispensa sessão em produção.

Use `.env.local.example` como referência de configuração, sem versionar credenciais. Não configure banco externo apenas para executar o fluxo em memória.

## Validação

```sh
pnpm test
pnpm exec tsc --noEmit --incremental false
pnpm lint
pnpm build
pnpm audit
```

O build verifica tipos. A CLI Vercel não é dependência de runtime; eventual configuração de deploy é separada.

Regressões de autenticação e isolamento sem acessar banco ou carregar credenciais: `pnpm exec vitest run --config vitest.access.config.ts`.

## Funcionalidades e limites

Fichas independentes, duplicação, clãs/predação, recursos/XP, especialidades, anotações, calendário, convites e NPCs de mesa possuem entregas em memória. Algumas SPECs continuam parciais; isso não equivale ao motor V5 completo.

O modo sessão em `/campaigns/[id]/session` persiste início, encerramento, revisão e vínculos de noites no PostgreSQL. Recursos, rolagens e ferramentas autorizadas convergem por consultas autenticadas a cada cinco segundos; vídeo é opcional. A validação global ainda tem falhas legadas registradas nas specs. QA visual/acessibilidade/responsividade e integrações externas reais permanecem pendentes.

### Modo sessão em produção

1. Confirmar banco/schema de destino, backup recuperável e autorização específica de migração antes da implantação. Configurar `DATABASE_URL` somente no servidor e autenticação Auth0 de produção.
2. Revisar `ensureAllTables` e `ensureGameSessionsTables` em `lib/db.ts`. O mecanismo existente `POST /api/migrate`, protegido por `Authorization: Bearer <MIGRATE_SECRET>`, aplica o schema geral, incluindo as três tabelas de sessão. Executar somente no destino aprovado; não executar seeds/reset em produção. A rota fica desabilitada sem o segredo.
3. Confirmar `game_sessions`, `game_session_nights`, `game_session_close_operations` e o índice parcial `game_sessions_one_active_per_campaign_idx`. Os endpoints de leitura/início/encerramento de sessão não aplicam migração. Recursos, rolagens e Awake legados ainda chamam `ensureAllTables`; revisar esse comportamento e as permissões de DDL antes da implantação. Para usar os painéis de NPCs, aplicar também a migração aditiva `migrations/20261023_npcs_sheet_narrative.sql`, após revisão e autorização próprias.
4. Validar com perfis autorizados: uma sessão ativa por mesa, início/encerramento idempotentes, leitura após reinício, isolamento entre jogadores e funcionamento sem vídeo. Configurar `LIVEKIT_URL`, `LIVEKIT_API_KEY` e `LIVEKIT_API_SECRET` separadamente para áudio/vídeo.

Rollback: reverter a versão da aplicação, preservando tabelas e históricos. Não remover as tabelas de sessão: NPCs e outros registros podem referenciá-las. Qualquer remoção de dados/schema exige nova avaliação de dependências, backup e autorização. Esta implementação e seus testes não aplicam alterações em produção.

Os testes usam apenas PostgreSQL local com `search_path=meus_vampiros_test`; a configuração rejeita host externo. Não apontar a suíte para o banco de produção.

### Mesa virtual

LiveKit utiliza LIVEKIT_URL, LIVEKIT_API_KEY e LIVEKIT_API_SECRET no servidor. Nunca exponha o segredo no cliente. Existência de componentes/tokens não comprova teste de conexão real ou conclusão do Modo Sessão.

## Documentação

- [Instruções de desenvolvimento](AGENTS.md), [guia de UI](UI-GUIDE.md) e [design system](design-system.md).
- [Histórico de alterações](CHANGELOG.md).
- [Central local de documentação](codex/README.md): specs, tarefas concluídas e backlog. A pasta de planejamento é local e pode não acompanhar o clone; não incluí-la automaticamente em commits.

Origem do projeto: v0. Configuração externa de publicação não foi verificada nesta organização documental.
