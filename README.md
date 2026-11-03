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

Use `.env.local.example` como referência de configuração, sem versionar credenciais. Para desenvolvimento e testes persistentes, use um PostgreSQL local isolado.

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

Antes de cada push, o agente deve executar `npm install` e, em seguida, `pnpm build`. Corrigir eventuais erros e repetir os comandos até ambos terminarem com sucesso; se houver impedimento, registrar o bloqueio e não realizar o push. Revisar alterações nos manifests e lockfiles geradas pela instalação. Essa etapa não substitui as demais verificações de segurança e pré-commit do [AGENTS.md](AGENTS.md).

## Funcionalidades e limites

Resumo atualizado em 03/11/2026. “Ativas” indica funcionalidades implementadas; disponibilidade depende da configuração e das migrações do ambiente. Não significa validação integral em produção nem implementação de todo o motor V5.

### Funcionalidades ativas

| Área | Funcionalidades implementadas |
| --- | --- |
| Fichas | Criação e edição de personagens, fichas independentes, duplicação, validação e aprovação pelo Narrador. |
| Regras V5 | Clãs, tipos de predação, disciplinas e seleção de poderes, especialidades e projeções de Potência do Sangue. |
| Recursos e evolução | Gestão de recursos e condições, XP e histórico, ações de sangue e início da noite (Awake). |
| Rolagens | Rolagens calculadas no servidor, histórico, rerrolagens e adjudicações autorizadas. |
| Mesas | Criação e gestão, convites, participantes, regras da mesa, arquivamento e restauração. |
| Agenda | Eventos, disponibilidade e calendários de planejamento e sessões. |
| Sessões | Início, encerramento e consulta persistidos em PostgreSQL, vínculos de noites, convocação e painel com recursos e rolagens. |
| Acervo narrativo | NPCs, anotações privadas e compartilhadas, vínculos, retratos, imagens e revelações controladas pelo Narrador. |
| Mesa virtual | Integração opcional de áudio/vídeo com LiveKit; imagens privadas dependem da configuração do Vercel Blob. |

### Funcionalidades planejadas e entregas parciais

| Frente | O que falta concluir |
| --- | --- |
| Dossiê e rolagens V5 | Unificação das fichas de NPCs completos/simplificados e carniçais, rolagens de NPCs e fluxo de disputa/combate com auditoria. |
| Integração das rolagens à chamada | Concluir feed, visibilidade por papel e efeitos explícitos previstos no dossiê. |
| Evolução narrativa | Concluir o escopo e a validação integral de registros, relações e mídias; partes já estão disponíveis no acervo. |
| Catálogos da VTM Wiki | Existe uma POC de metadados. Importação, persistência, administração e publicação continuam bloqueadas por validação técnica/editorial, direitos por entrada e permissões administrativas. |
| Regras avançadas V5 | Ampliar a automação além dos recortes implementados; os catálogos e controles atuais não representam todas as regras do sistema. |

Além do roadmap funcional, permanecem pendências de validação global nas specs de Modo Sessão e evolução narrativa, QA visual/acessibilidade/responsividade e integrações externas reais. Os registros locais de planejamento podem conter evidências históricas; não representam testes reexecutados nesta atualização.

O modo sessão em `/campaigns/[id]/session` persiste início, encerramento, revisão e vínculos de noites no PostgreSQL. Recursos, rolagens e ferramentas autorizadas convergem por consultas autenticadas a cada cinco segundos; vídeo é opcional. A validação global ainda tem falhas legadas registradas nas specs. QA visual/acessibilidade/responsividade e integrações externas reais permanecem pendentes.

### Modo sessão em produção

1. Confirmar banco/schema de destino, backup recuperável e autorização específica de migração antes da implantação. Configurar `DATABASE_URL` somente no servidor e autenticação Auth0 de produção.
2. Revisar `ensureAllTables` e `ensureGameSessionsTables` em `lib/db.ts`. O mecanismo existente `POST /api/migrate`, protegido por `Authorization: Bearer <MIGRATE_SECRET>`, aplica o schema geral, incluindo as três tabelas de sessão. Executar somente no destino aprovado; não executar seeds/reset em produção. A rota fica desabilitada sem o segredo.
3. Confirmar `game_sessions`, `game_session_nights`, `game_session_close_operations` e o índice parcial `game_sessions_one_active_per_campaign_idx`. Os endpoints de leitura/início/encerramento de sessão não aplicam migração. Recursos, rolagens e Awake legados ainda chamam `ensureAllTables`; revisar esse comportamento e as permissões de DDL antes da implantação. Para usar os painéis de NPCs, aplicar também a migração aditiva `migrations/20261023_npcs_sheet_narrative.sql`, após revisão e autorização próprias.
4. Validar com perfis autorizados: uma sessão ativa por mesa, início/encerramento idempotentes, leitura após reinício, isolamento entre jogadores e funcionamento sem vídeo. Configurar `LIVEKIT_URL`, `LIVEKIT_API_KEY` e `LIVEKIT_API_SECRET` separadamente para áudio/vídeo.

Rollback: reverter a versão da aplicação, preservando tabelas e históricos. Não remover as tabelas de sessão: NPCs e outros registros podem referenciá-las. Qualquer remoção de dados/schema exige nova avaliação de dependências, backup e autorização. Esta implementação e seus testes não aplicam alterações em produção.

Os testes usam apenas PostgreSQL local com `search_path=meus_vampiros_test`; a configuração rejeita host externo. Não apontar a suíte para o banco de produção.

### Criar tabelas de NPCs e fichas narrativas

`POST /api/migrate` não executa `migrations/20261023_npcs_sheet_narrative.sql`. Aplicar esse arquivo separadamente, depois de existirem `campaigns`, `characters` e `game_sessions`. Ele cria dez tabelas, índices e a coluna `campaigns.allow_player_narrative_edits`, sem seeds ou limpeza. `IF NOT EXISTS` permite repetir a execução, mas não corrige estruturas existentes incompatíveis.

Em produção, obter autorização e backup recuperável, confirmar o destino e usar uma conexão direta ao PostgreSQL com permissão de DDL. Configurar `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER` e autenticação segura do `psql` (por exemplo, arquivo de senhas protegido); não colocar credenciais no comando ou no repositório. O `psql` não lê `.env.local`/`DATABASE_URL` automaticamente. A partir da raiz do projeto, no PowerShell, com essas variáveis já configuradas para o destino aprovado:

```powershell
if (!$env:PGHOST -or !$env:PGDATABASE -or !$env:PGUSER) { throw 'Configure explicitamente o destino PostgreSQL aprovado.' }
$env:PGOPTIONS = '-c search_path=public -c lock_timeout=5s -c statement_timeout=60s'
psql -X --set=ON_ERROR_STOP=1 --command="SELECT current_database(), current_schema(), inet_server_addr(), inet_server_port();"
if ($LASTEXITCODE -ne 0) { throw 'Falha ao verificar o destino.' }
# Conferir a saída acima antes de executar a migração abaixo.
psql -X --set=ON_ERROR_STOP=1 --single-transaction --file=migrations/20261023_npcs_sheet_narrative.sql
if ($LASTEXITCODE -ne 0) { throw 'Migração falhou; a transação foi revertida.' }
```

O exemplo usa o schema `public`; ajustar explicitamente se a instalação usar outro schema. No Windows, se `psql` não estiver no PATH, usar `& 'C:\Program Files\PostgreSQL\18\bin\psql.exe'` no lugar de `psql`. Confirmar depois as dez tabelas do arquivo e testar listagem/modelos/criação com uma conta autorizada. A transação reverte a migração inteira em caso de erro; após sucesso, rollback da aplicação deve preservar tabelas e dados, sem `DROP`. Em 31/10/2026, a migração foi aplicada em transação à produção `neondb/public`, com backup recuperável confirmado; foram verificadas as dez tabelas e a coluna `campaigns.allow_player_narrative_edits`. Não houve seeds nem limpeza.

### Mesas arquivadas, imagens e revelações

- Em **Gerenciar mesa → Arquivar mesa**, o Narrador confirma o nome da mesa. Encerre a sessão ativa antes. O arquivamento preserva todos os dados, retira a mesa de **Mesas atuais** e impede novas sessões. **Mesas arquivadas → Gerenciar mesa → Restaurar mesa** reativa a mesa. O histórico permanece acessível aos participantes autorizados; arquivar não bloqueia toda edição do acervo.
- O jogador gerencia o retrato da própria ficha no resumo; o Narrador gerencia o retrato dos NPCs próprios no catálogo/detalhe. Ambos usam o upload privado existente. Configure `BLOB_READ_WRITE_TOKEN` de um Blob privado no servidor. Sem essa configuração, a interface informa que o envio está desabilitado.
- Salve uma anotação para anexar imagens. JPEG/PNG/WebP de até 5 MB passam por validação e reencodificação no servidor. A imagem herda a permissão da anotação: nem mesmo o Narrador recebe acesso implícito ao diário privado de um jogador.
- O painel `/campaigns/[id]/session` oferece vídeo, resumo da própria ficha, recursos e rolagens oficiais, anotações e revelações. A seleção de sessão permite consultar notas e revelações das últimas cem sessões autorizadas, inclusive encerradas. Vídeo depende da configuração LiveKit e da convocação do Narrador; rolagens/recursos de sessão exigem sessão ativa e ficha aprovada.
- Revelações novas são salvas como anotações da sessão, **não reveladas** por padrão. O Narrador pode adicionar imagens antes de usar **Revelar nesta sessão** e pode ocultar/revelar novamente depois do encerramento. Revelações de registros ou imagens existentes salvam uma projeção pública separada. O servidor valida acesso ao texto e aos bytes das imagens em cada requisição; ocultar impede novas leituras pelos jogadores. Conteúdo já visto/baixado não pode ser recolhido.

Depois da migração inicial de NPCs, aplicar também `migrations/20261029_session_notes_images.sql` no destino previamente aprovado, com backup e o mesmo procedimento transacional `psql` descrito acima:

```sh
psql -X --set=ON_ERROR_STOP=1 --single-transaction --file=migrations/20261029_session_notes_images.sql
```

Essa migração amplia os tipos aceitos de mídia/revelação e salva revelações antigas como anotações, preservando sua visibilidade. Foi aplicada em 31/10/2026 no PostgreSQL local (`public` e `meus_vampiros_test`) e na produção (`neondb/public`), com autorização específica e backup confirmado. Na produção, a consulta prévia encontrou zero revelações antigas para converter. `/api/migrate` não aplica os arquivos SQL desse diretório. Rollback da aplicação preserva as notas e imagens; não remover as constraints novas enquanto houver registros NOTE. Testes focados sem limpeza/DDL automático: `npx vitest run --config vitest.session-notes.config.ts` (exige schema local de testes previamente preparado e migrado).

### Mesa virtual

LiveKit utiliza LIVEKIT_URL, LIVEKIT_API_KEY e LIVEKIT_API_SECRET no servidor. Nunca exponha o segredo no cliente. Existência de componentes/tokens não comprova teste de conexão real ou conclusão do Modo Sessão.

## Documentação

- [Imagens de personagens e NPCs](docs/imagens-fichas.md): configuração do Blob privado, retratos, galeria, limites e testes locais.
- [POC de acesso à VTM Wiki](docs/vtm-wiki-sync.md): diagnóstico de metadados, sem ingestão, publicação ou alterações no banco.
- [Instruções de desenvolvimento](AGENTS.md), [guia de UI](UI-GUIDE.md) e [design system](design-system.md).
- [Histórico de alterações](CHANGELOG.md).
- [Central local de documentação](codex/README.md): specs, tarefas concluídas e backlog. A pasta de planejamento é local e pode não acompanhar o clone; não incluí-la automaticamente em commits.

Origem do projeto: v0. Configuração externa de publicação não foi verificada nesta organização documental.
