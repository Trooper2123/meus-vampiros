# Meus Vampiros

Aplicação de fichas e gerenciamento de mesas de Vampiro: A Máscara V5, com Next.js, React e TypeScript. Desenvolvimento atual com banco em memória.

## Desenvolvimento

Requisito do Next instalado: Node.js >= 20.9.0 e pnpm disponível.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Acesse http://localhost:3000. Sem DATABASE_URL, o ambiente não produtivo usa memória descartável e identidade local de desenvolvimento. Isso não representa autenticação ou persistência de produção. DEV_AUTH_BYPASS não dispensa sessão em produção.

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

## Funcionalidades e limites

Fichas independentes, duplicação, clãs/predação, recursos/XP, especialidades, anotações, calendário, convites e NPCs de mesa possuem entregas em memória. Algumas SPECs continuam parciais; isso não equivale ao motor V5 completo.

PostgreSQL operacional, Modo Sessão central/realtime e integrações externas completas não estão entregues. QA visual/acessibilidade/responsividade permanece posterior. Não usar o provider descartável para dados que precisem ser preservados.

### Mesa virtual

LiveKit utiliza LIVEKIT_URL, LIVEKIT_API_KEY e LIVEKIT_API_SECRET no servidor. Nunca exponha o segredo no cliente. Existência de componentes/tokens não comprova teste de conexão real ou conclusão do Modo Sessão.

## Documentação

- [Instruções de desenvolvimento](AGENTS.md), [guia de UI](UI-GUIDE.md) e [design system](design-system.md).
- [Histórico de alterações](CHANGELOG.md).
- [Central local de documentação](codex/README.md): specs, tarefas concluídas e backlog. A pasta de planejamento é local e pode não acompanhar o clone; não incluí-la automaticamente em commits.

Origem do projeto: v0. Configuração externa de publicação não foi verificada nesta organização documental.
