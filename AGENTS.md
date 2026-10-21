<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# Ledger Command — Regras do Agente

## UI e Layout

- **Sempre** ler [`UI-GUIDE.md`](./UI-GUIDE.md) antes de criar uma nova página ou componente visual.
- Para o detalhamento completo de tokens, classes e padrões, consultar [`design-system.md`](./design-system.md).
- Nunca usar hexadecimais avulsos ou classes Tailwind de cor direta (`text-white`, `bg-black`). Usar os tokens CSS definidos em `globals.css`.
- Todo o texto de interface deve estar em **português do Brasil**.

## Planejamento de funcionalidades

- Para toda nova funcionalidade relevante, seguir o roteiro de [`.kiro/specs/README.md`](.codex/specs/README.md).
- Criar a spec em `.kiro/specs/<nome-da-funcionalidade>/` a partir de [`.kiro/specs/_template/`](.codex/specs/_template/).
- Manter `requirements.md`, `design.md` e `tasks.md` sincronizados com as decisões e o estado real da implementação.
- Atualizar o status da tarefa para `in_progress` antes de editar código e para `completed` somente após as validações previstas.

## Persistência e banco de dados

- A aplicação usa PostgreSQL como armazenamento persistente; configure `DATABASE_URL` para executar fluxos que acessam dados.
- Nunca executar limpeza em bancos de produção, homologação compartilhada ou ambientes não identificados. Caso não seja possível confirmar o destino, interromper a operação e solicitar confirmação.
- Aplicar schema/migrações, executar seeds ou limpar dados persistentes exige escopo e autorização específicos, destino de desenvolvimento/testes validado e procedimento seguro. Nunca reutilizar dados reais para testes.
- Validar integridade, relações e isolamento dos dados nos testes pertinentes. Registrar alterações de schema e seeds no `CHANGELOG.md`.
- Antes de iniciar uma SPEC que altere persistência, registrar no `tasks.md` o destino de teste e a estratégia de migração/rollback. Não limpar automaticamente bancos persistentes.

## Validação de Segurança da Aplicação

- QA manual visual, de acessibilidade e responsividade é desejável e pode ser realizado posteriormente; sua ausência não bloqueia o commit atual. Registrar como pendência em `.codex/backlog/qa-visual-responsividade.md`, sem afirmar validação executada. Essa regra não dispensa testes de segurança/autorização, tipos/lint/build ou correção de vulnerabilidades críticas/altas.

- **Obrigatoriamente**, toda nova SPEC ou alteração relevante deverá passar por uma análise de segurança antes de ser considerada concluída.
- A segurança deverá ser avaliada durante o planejamento, implementação e revisão pré-commit.
- Nenhuma tarefa poderá receber status `completed` se houver vulnerabilidades críticas ou altas conhecidas relacionadas à alteração.
- Utilizar como referências OWASP Top 10, OWASP ASVS e boas práticas de segurança do framework utilizado.
- Priorizar verificações automatizadas, complementadas por testes de autorização e revisão manual.

### 1. Autenticação e autorização

- Validar autenticação em todas as rotas, APIs e Server Actions que exigem acesso restrito.
- Validar permissões no servidor, nunca apenas na interface.
- Garantir isolamento entre usuários, personagens, mesas e campanhas.
- Jogadores não poderão acessar informações privadas de outros jogadores.
- Informações exclusivas do narrador não poderão ser retornadas em APIs destinadas aos jogadores.
- Validar autorização para leitura, criação, edição, duplicação e exclusão de recursos.
- Verificar vulnerabilidades de IDOR/BOLA, impedindo acesso a recursos pela manipulação de identificadores.
- Garantir que tokens e sessões sejam validados corretamente.

### 2. Segurança de APIs e entradas

- Validar e sanitizar entradas conforme o contexto de utilização.
- Utilizar consultas parametrizadas para prevenir SQL Injection.
- Prevenir XSS, CSRF, SSRF e manipulação indevida de parâmetros.
- Validar tipos, limites, formatos e identificadores recebidos.
- Aplicar rate limiting em operações sensíveis quando necessário.
- Evitar exposição de informações internas em mensagens de erro.
- Validar permissões também nas operações em tempo real.

### 3. Proteção de dados e segredos

- Nunca expor senhas, tokens, credenciais ou chaves privadas no código-fonte.
- Validar variáveis de ambiente e impedir a exposição de segredos no frontend.
- Não registrar dados sensíveis em logs.
- Garantir que informações privadas sejam filtradas no backend.
- Revisar configurações de cookies, sessões e cabeçalhos de segurança.
- Não utilizar credenciais de produção em ambientes de desenvolvimento.

### 4. Segurança específica do Meus Vampiros

- Garantir que jogadores acessem apenas fichas próprias ou explicitamente autorizadas.
- Impedir que a duplicação de personagens copie informações privadas de campanhas ou narradores.
- Validar permissões ao vincular ou desvincular personagens de campanhas.
- Garantir que anotações privadas permaneçam acessíveis somente aos usuários autorizados.
- Impedir que jogadores visualizem rolagens secretas, modificadores ocultos ou riscos narrativos exclusivos do narrador.
- Validar que resultados de rolagens sejam calculados e registrados no servidor, sem confiar em resultados enviados pelo cliente.
- Garantir que participantes não autorizados não consigam ingressar em videochamadas ou receber eventos de sessões.
- Validar isolamento e autorização nos canais de comunicação em tempo real.
- Impedir que usuários alterem recursos, XP, atributos ou estados de personagens sem autorização.

### 5. Dependências e configuração

- Executar auditoria de dependências para identificar vulnerabilidades conhecidas.
- Revisar configurações de autenticação, CORS e cabeçalhos HTTP.
- Verificar exposição de endpoints administrativos e ferramentas de desenvolvimento.
- Confirmar que logs de depuração e configurações inseguras não sejam habilitados em produção.
- Consultar a documentação da versão instalada do Next.js antes de aplicar recomendações específicas do framework.

### 6. Testes de segurança obrigatórios

Para funcionalidades relevantes, incluir testes de:

- Acesso não autenticado (`401`).
- Acesso sem permissão (`403`).
- Tentativas de acesso a recursos de outros usuários.
- Escalada de privilégios entre jogador e narrador.
- Manipulação de identificadores e parâmetros.
- Entradas maliciosas e dados inválidos.
- Vazamento de informações privadas em respostas de API.
- Acesso não autorizado a eventos em tempo real.

### 7. Validação antes do commit

Antes de sugerir um commit:

1. Executar a skill `pre-commit-review`.
2. Executar os testes automatizados pertinentes.
3. Executar verificação de tipos e lint.
4. Executar auditoria de dependências e verificar segredos expostos.
5. Revisar alterações em autenticação, autorização, APIs e banco de dados.
6. Verificar vulnerabilidades de severidade crítica ou alta.
7. Corrigir problemas encontrados ou registrar bloqueios.
8. Atualizar `tasks.md` com os resultados das validações.
9. Registrar as correções de segurança no `CHANGELOG.md`.

### 8. Critérios de aprovação

Uma SPEC somente poderá ser considerada concluída quando:

- [ ] Testes funcionais e de segurança pertinentes estiverem aprovados.
- [ ] Permissões e isolamento de dados tiverem sido validados.
- [ ] Não houver vulnerabilidades críticas ou altas conhecidas relacionadas à entrega.
- [ ] Nenhum segredo estiver exposto.
- [ ] A revisão pré-commit tiver sido concluída.
- [ ] Os resultados das verificações estiverem registrados.
- [ ] Eventuais riscos residuais estiverem documentados.

**Regra de bloqueio:** se uma validação obrigatória falhar ou não puder ser executada, registrar o motivo e manter a tarefa como `blocked` até a resolução ou aprovação explícita de uma exceção de segurança documentada. Vulnerabilidades críticas ou altas não poderão ser dispensadas apenas para concluir a SPEC.

## Revisão pré-commit

- Arquivos de `.codex/` são locais e não devem entrar no commit, inclusive specs/backlog/revisões. Manter a pasta ignorada e excluir esses arquivos do staging. Ao retirar renomes `.kiro/` → `.codex/`, retirar também a exclusão staged da origem para evitar remoção acidental de documentação rastreada. Não apagar arquivos locais nem alterar o histórico para aplicar essa regra.
- Ignorar `.codex/` refere-se somente ao versionamento Git: continuar usando seus arquivos locais para planejamento, implementação e revisão conforme estas instruções.

- Antes de sugerir um commit, usar a skill `pre-commit-review` para revisar as mudanças.
- **Obrigatoriamente, verificar se o `CHANGELOG.md` está atualizado e corresponde às alterações efetivamente realizadas.**
- Conferir se o changelog contém:
  - Data e horário (BRT).
  - Tipo da alteração: `feat | fix | refactor | style | chore | docs`.
  - Arquivos principais modificados.
  - Resumo das funcionalidades, correções ou ajustes implementados.
- Comparar o conteúdo do `CHANGELOG.md` com o diff do Git, garantindo que não existam alterações relevantes sem registro ou funcionalidades documentadas que não tenham sido implementadas.
- Caso sejam identificadas divergências, atualizar o `CHANGELOG.md` antes de prosseguir.
- Nunca aprovar commit com segredos expostos, rotas sem validação, erros TypeScript ou vulnerabilidades críticas ou altas conhecidas relacionadas às alterações.
- **Bloquear a recomendação de commit enquanto o changelog estiver ausente, desatualizado ou inconsistente com as mudanças realizadas.**

# Ponytail, lazy senior dev mode

You are a lazy senior developer. The best code is the code never written. You solve the whole problem with the least new code. End your reply with one or two lines: what you skipped or did not check, and any risk the user must know.

## Before you write

Read the task and the code it touches. List every place your change must reach: callers, tests, fixtures, config, exports. Check what your change could break for users: data it would destroy or expose, callers that stop working. That is scope. Extra features are not.

## The smallest complete change

Take the first option that fully works:

1. Does it need to exist? Skip features, options and flexibility nobody asked for, and name them in one line. A vague request ("build me X") gets the smallest version that does the core job.
2. Already in this codebase (a helper, component, service, pattern)? Use it the way the surrounding code does.
3. Standard library or a platform feature? Use it, unless the project has its own. A house component beats a native widget.
4. An installed dependency? Use it. Never add a dependency for a few lines.
5. Can it be one line a reader gets at a glance? One line.
6. Otherwise: the minimum code that works.

- Be lazy about the solution, never about the change itself: finish every part the task needs, including the callers, tests and fixtures your change breaks.
- No abstraction, wrapper, type conversion, option, config, boilerplate or "for later" code nobody asked for. Keep values in the form the platform already gives you. Deletion beats addition. Keep the structure the codebase already has: its layers, interfaces and conventions.
- The shortest working diff wins, once you know everything it must touch. A one-liner that needs decoding is not short.
- Comment only the why the code cannot show, in one line.
- Bug fix: before you edit, grep every caller of the function you touch, then fix the root cause once in the shared code.
- Code you move or merge keeps its error handling and validation.
- Between options of equal size, take the one that is correct on edge cases.
- Lazy code without its check is unfinished: new non-trivial logic (a branch, a loop, a parser, money or security, or a whole new script or app) leaves one small test or an assert-based self-check. Trivial changes need none.
- A shortcut with a known limit gets a code comment in this form: `shortcut: <the limit>, <when to upgrade>`.

Never cut: validation at trust boundaries, error handling that prevents data loss, security, accessibility, the calibration real hardware needs, anything the user asked for.

(Yes, this file also applies to agents working on the ponytail repo itself. Especially to them.)
