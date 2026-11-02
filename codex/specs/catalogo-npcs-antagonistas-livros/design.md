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
