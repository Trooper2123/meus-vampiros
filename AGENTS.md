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

## Preparação do banco de desenvolvimento

- **Obrigatoriamente**, antes de iniciar a implementação de uma nova SPEC, reinicializar exclusivamente o banco em memória utilizado para desenvolvimento/testes (`lib/dev-db.ts` e providers globais relacionados).
- A limpeza deve ocorrer **uma única vez no início da implementação da SPEC**, não antes de cada tarefa individual.
- Antes do reset, confirmar ambiente não produtivo e que a operação atua apenas no provider em memória do processo de testes, sem conexão ou comandos contra PostgreSQL.
- **Nunca executar limpeza em bancos de produção, homologação compartilhada ou ambientes não identificados.**
- Caso não seja possível confirmar o ambiente, interromper a operação e solicitar confirmação.
- Utilizar preferencialmente os scripts de preparação em memória já existentes no projeto. A existência de DATABASE_URL não autoriza reset de banco externo; utilizar processo isolado sem essa conexão para preparar memória.
- É permitido recriar estruturas e relacionamentos do provider em memória para adequá-los à SPEC.
- Não implementar migrações de compatibilidade ou backfill de dados legados para o provider descartável em memória. Essa regra não dispensa preservação de dados nem autoriza alterações destrutivas em PostgreSQL persistente.
- Após a limpeza em memória, inicializar o modelo atualizado e executar os seeds necessários para disponibilizar dados de teste.
- O schema SQL de `lib/db.ts` é referência de paridade, não alvo do reset obrigatório. Aplicação de schema, migração, seed ou limpeza em banco persistente exige tarefa e autorização específicas, destino validado e procedimento seguro; nunca reutilizar a preparação da SPEC para apagar dados externos.
- Validar a integridade do banco, as relações entre entidades e os dados mínimos exigidos pelos testes.
- Registrar a limpeza, a atualização do schema e a execução dos seeds no `CHANGELOG.md`.
- Antes de iniciar a implementação, registrar no `tasks.md` a conclusão da preparação do banco.

### Ordem obrigatória de execução

1. Ler a SPEC e suas dependências.
2. Validar que o processo é de desenvolvimento/testes e usa exclusivamente o provider em memória.
3. Limpar uma única vez os dados de teste em memória, sem acessar PostgreSQL.
4. Inicializar o modelo em memória atualizado e executar os seeds necessários.
5. Validar a integridade do banco.
6. Registrar a preparação no `tasks.md`.
7. Atualizar a primeira tarefa de desenvolvimento para `in_progress`.
8. Iniciar a implementação da SPEC.

### Restrições

- A limpeza em memória não substitui testes de integridade ou regressão. Dev atual utiliza somente memória e não exige DATABASE_URL ou integração PostgreSQL para sua entrega. Conexão/provider e testes SQL ficam no backlog `.codex/backlog/integracao-postgresql.md`; tornam-se obrigatórios ao entregar persistência externa, em ambiente de testes identificado, sem reset automático externo. Não declarar caminhos SQL existentes prontos para produção antes dessa validação.
- Não remover dados de autenticação, configurações ou recursos externos sem verificar se pertencem ao ambiente descartável.
- Se o reset falhar, não iniciar o desenvolvimento até corrigir a preparação do ambiente.
- Esta política deverá ser revista antes da disponibilização do aplicativo em produção ou da utilização de dados que precisem ser preservados.

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
