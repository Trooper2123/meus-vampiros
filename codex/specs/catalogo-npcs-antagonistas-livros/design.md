# SPEC-RPG-022 — Design técnico

**Status:** proposed · Documentação; ainda não implementado.

## Princípio

Extensão do domínio de NPC existente em `lib/npc-store.ts`, `lib/npc-domain.ts`, `npc_definitions`, `campaign_npcs` e `/npcs`; não criar um segundo mecanismo de fichas. O catálogo bibliográfico global é somente leitura, e a adição clona para uma definição/instância gerenciada pela mesa.

## Abordagem de dados

Investigar primeiro `NPC_TEMPLATES`, `npcTemplates()`, `npc_definitions.is_template` e o payload `NpcData`. Escolher o menor modelo que suporte proveniência editorial e busca. Proposta apenas se o existente for insuficiente:

```text
npc_source_catalog
  id UUID PK
  canonical_key TEXT UNIQUE
  name TEXT NOT NULL
  aliases TEXT[]
  creature_type TEXT
  narrative_role TEXT
  clan_code TEXT NULL
  faction_code TEXT NULL
  threat_level INT NULL
  sheet_completeness FULL | PARTIAL | NARRATIVE_ONLY
  canon_status SOURCE_EXACT | VERIFIED_ADAPTATION | CUSTOM
  review_status DRAFT | REVIEWED | APPROVED | REJECTED
  source_book_code TEXT NOT NULL
  source_edition TEXT
  page_start INT NULL
  page_end INT NULL
  biography_summary TEXT NULL
  tags TEXT[]
  npc_data JSONB NULL
  missing_fields TEXT[]
  rights_status METADATA_ONLY | PRIVATE_LICENSED | DISTRIBUTABLE
  revision INT NOT NULL DEFAULT 1
  created_at, updated_at
```

Verificar se a API de NPC atual suporta `HUMAN`, `VAMPIRE`, `GHOUL` e outros tipos antes de mapear para o enum; não forçar criaturas desconhecidas para humano. `source_catalog_id` e `source_catalog_revision` podem entrar na instância resultante via campos/metadados existentes ou coluna específica, somente após validar schema real.

## Contrato editorial / seeds

Cada entrada possui `source_book_code`, edição e página real, status de revisão e indicação de direitos. Importador de seeds deve **rejeitar** registro sem referência ou com estatísticas inventadas. `FULL` somente quando todos os atributos necessários ao modelo de NPC estiverem verificados; `PARTIAL` se blocos incompletos; `NARRATIVE_ONLY` quando a obra só descreve personagem. Preservar nomes canônicos e textos curtos editoriais, sem copiar biografias inteiras ou arte. Sinalizar adaptação como diferente de ficha fiel.

Definir arquivo de catálogo em JSON/TS tipado ou seed de banco com registro por personagem, conforme padrões existentes. O pipeline editorial será manual na primeira versão. Indicações de cobertura: *Chicago by Night*, *The Chicago Folios*, *Let the Streets Run Red*, *Fall of London* e capítulos de mortais/car­niçais de *Companion*. Fontes restantes entram após revisão.

## Contratos de API propostos

```text
GET  /api/npc-source-catalog?q=&book=&clan=&role=&completeness=&page=&limit=
GET  /api/npc-source-catalog/:id
POST /api/campaigns/:id/npcs/from-catalog
{
  catalogEntryId: UUID,
  catalogRevision: number,
  displayName?: string,
  roleOverride?: string,
  visibility: "ST_ONLY",
  idempotencyKey: UUID
}
```

Proteger GET com autorização de Narrador, filtrar somente `APPROVED` e `rights_status` permitido para o ambiente/usuário. `POST`: validar `canManageCampaign`, verificar registro aprovado e elegível, idempotência, clonar os dados autorizados e associar à campanha numa transação. Nunca confiar em payload de atributos mecânicos enviado pelo browser; o servidor carrega o template pelo ID.

## UI

Na página `/npcs`, adicionar tab **Meus NPCs | Modelos | Biblioteca dos Livros**; a biblioteca também tem rota `/npcs/biblioteca` para deep links. Seguir tokens e componentes em `UI-GUIDE.md`, `design-system.md` e comportamento de seleção de habilidades. Busca com debounce, filtros combinados, paginação, estados vazios e carregamento, acessibilidade por teclado e ARIA.

Cards: nome, espécie, papel, livro/página, badge de completude; ação **Visualizar** e **Adicionar à mesa**. Detalhe: ficha mecânica disponível, resumo original curto, advertência de adaptação, referência bibliográfica, indicação de dados faltantes. Modal de adição: campanha, nome alternativo, papel e visibilidade. A instância editável abre no editor atual do NPC. Se modelo for `NARRATIVE_ONLY`, criar um rascunho sem inventar stats e avisar que precisa ser completado.

## Fonte clicável

`source_book_code + edition + page` são a fonte de verdade. Um link `Abrir na página` só deve existir se houver documento autorizado e um visualizador que suporte navegação por página e valide direito de acesso; caso contrário mostrar referência textual. Não permitir download público de PDFs privados.

## Segurança

- Autorização de Narrador na **API**, autorização de Mesa e isolamento de campanhas, sem confiar na tela.
- DTO público nunca inclui dados secretos nem templates cujo uso não esteja autorizado.
- Consulta parametrizada, paginação com limite, validação rigorosa de filtros e ids.
- Evitar vazamento de anexos/PDFs ou texto protegido por URL enumerável.
- Auditar adição do template e armazenar proveniência sem tornar o original mutável.
- Testes: 401/403, acesso a outra mesa, escopo cross-user, idempotência, payload adulterado, conteúdo sem revisão/licença, alteração isolada por instância, pesquisa com entradas maliciosas.

## Dependências e validações

Antes de implementar: revisar exatamente `lib/npc-store.ts`, `npc-domain.ts`, `npc-options.ts`, componentes de catálogo e a estrutura de `/npcs`, contratos `campaign_npcs`, migrations e fluxo de adição de habilidades. Validar TypeScript, lint, testes e revisão pré-commit; não considerar a feature concluída somente pela criação desta SPEC.


## Expansão v1.1 — Modelos genéricos e envio opt-in ao repositório do site

### Arquitetura e tipos

Reutilizar `npc_definitions`, `NPC_TEMPLATES`, editor e vínculos `campaign_npcs` para modelos genéricos e NPCs criados por usuário. Ampliar a origem com `OFFICIAL_SOURCE | GENERIC_TEMPLATE | USER_CUSTOM | COMMUNITY_SUBMISSION` em camada de catálogo, sem substituir os modelos atuais. `GENERIC_TEMPLATE` inclui somente conteúdo próprio do app ou devidamente licenciado; suas estatísticas são balanceadas e rotuladas como criação do site.

Para contribuições, **separar** o dado original privado do **snapshot sanitizado** entregue à moderação. Nunca referenciar diretamente a linha privada como item publicável e nunca sincronizar mudanças automaticamente.

```text
npc_community_submissions
  id UUID PK
  author_user_id TEXT NOT NULL
  source_npc_id UUID NULL             -- privado; não expor no catálogo
  proposed_payload JSONB NOT NULL     -- snapshot revisado pelo autor
  proposed_payload_hash TEXT NOT NULL
  terms_version TEXT NOT NULL
  consented_at TIMESTAMPTZ NOT NULL
  allow_public_credit BOOLEAN NOT NULL DEFAULT FALSE
  public_credit_name TEXT NULL
  authorship_declaration BOOLEAN NOT NULL
  status PENDING_REVIEW | CHANGES_REQUESTED | APPROVED | REJECTED | WITHDRAWN | PUBLISHED | UNPUBLISHED
  moderation_reason TEXT NULL
  reviewed_by TEXT NULL
  reviewed_at TIMESTAMPTZ NULL
  published_catalog_id UUID NULL
  created_at, updated_at TIMESTAMPTZ

npc_community_submission_events
  id UUID PK
  submission_id UUID
  actor_id TEXT
  action TEXT
  old_status TEXT
  new_status TEXT
  created_at TIMESTAMPTZ
```

`published_catalog_id` aponta para um **registro público independente e versionado**, que contém somente os campos aprovados para distribuição. Moderadores não devem alterar fichas privadas. Evitar armazenar justificativas privadas no snapshot. Dados pessoais e informações da mesa devem ser eliminados **no backend** por allowlist, mesmo se enviados pelo cliente. Restringir edição de `terms_version`, `author_user_id` e `status` ao servidor.

### Fluxo de criação e popup

```text
Criar NPC/Antagonista
  → escolher modelo genérico / criar do zero
  → editar e validar
  → SALVAR PRIVADAMENTE (transação própria)
  → popup opcional de contribuição
      ├── Não / Agora não / fechar → termina; nenhum envio
      └── Revisar cópia → remover dados privados / ajustar conteúdo
            → mostrar termos, licença e declaração de autoria
            → confirmação afirmativa → POST submissão
                → PENDING_REVIEW
                → moderação → APPROVED → PUBLISHED
                           └─ REJECTED / CHANGES_REQUESTED / WITHDRAWN
```

Aparecimento do popup: após primeiro salvamento de NPC `USER_CUSTOM` elegível, no máximo uma vez por personagem por padrão. Não interromper o fluxo caso falhe a verificação de elegibilidade ou o serviço de submissão. Permitir reabrir manualmente por **Sugerir ao catálogo**. Separar consentimento de submissão de consentimento para exibir nome de autor; o padrão é sem crédito nominativo.

### Endpoints sugeridos (adaptar ao padrão existente)

```text
GET  /api/npc-templates?category=GENERIC
POST /api/npcs                              -- salvar NPC privado, já existente
GET  /api/npcs/:id/community-preview        -- apenas proprietário; allowlist
POST /api/npc-community-submissions         -- opt-in explícito e snapshot
GET  /api/npc-community-submissions/mine
POST /api/npc-community-submissions/:id/withdraw
POST /api/npc-community-submissions/:id/request-removal
GET  /api/moderation/npc-submissions        -- moderador
POST /api/moderation/npc-submissions/:id/decision
GET  /api/npc-community-catalog             -- somente PUBLISHED
```

POST usa sessão autenticada, confirmação de autoria/direitos, `termsVersion`, revisão dos campos e idempotency key. Salvar `proposed_payload` com allowlist de propriedades: sem `campaign_id`, `player_ids`, `character_ids`, `master_notes`, `private_notes`, `source_pdf`, imagens não autorizadas e outros IDs do domínio. Verificar titularidade de `source_npc_id` e recusar fontes oficiais/adaptações cujo compartilhamento não tenha base de direitos. Moderação precisa ter autorização separada de Narrador e evitar autoaprovação pelo próprio autor. Publicação e remoção são transações auditadas.

### Segurança, privacidade e manutenção

- Proteger 401/403 e IDOR entre usuários/campanhas; validar rate limits, tamanho de payload e sanitização de rich text; nunca confiar em checkbox ou flags isoladas do cliente.
- Proibir publicação de dados privados mesmo com consentimento genérico; consentimento cobre **somente o snapshot mostrado**, não o restante da conta.
- A ficha privada continua pertencendo ao criador e pode ser alterada/removida independentemente do item comunitário, conforme termos consentidos. A solicitação de remoção deve ser operacionalizada com prazo/política divulgados sem prometer remoção de cópias já importadas.
- Guardar registro mínimo de consentimento/auditoria, observando LGPD e transparência; opção de pseudônimo/sem crédito. Não inserir material protegido dos livros na área comunitária sem direitos.
- UX do popup: foco acessível, Escape fecha sem compartilhar, botões explícitos, prévia de dados, links para termos/privacidade e estado de erro não destrutivo.

### Testes

Salvar sem consentimento (nenhum POST), cancelar/fechar popup, editar prévia, submissão idempotente, catálogo oculto até publicação, campos privados descartados no servidor, perda de autorização, moderação, retirada/removal, restrição a NPC canônico não licenciado e isolamento entre campanhas. Testar também clonagem e ajuste de modelos genéricos.
