# SPEC-RPG-023 — Design técnico

**Status:** proposed · somente planejamento, sem alterações de aplicação/banco

## 1. Integração com arquitetura existente

No `develop`, verificar e reutilizar:
- `lib/vtm-v5/merits-flaws-catalog.json`, `components/merits-flaws-research.tsx`, `app/api/merits-flaws/route.ts` e `lib/vtm-v5/trait-options`: pesquisa, elegibilidade e seleção de vantagens/defeitos.
- `components/character-form/traits-editor.tsx`, `trait-selector-row.tsx`, `character-form-client.tsx` e `components/character-summary/summary-merits.tsx`: criação, edição e resumo da ficha.
- Domínio atual de XP/progressão e comandos de personagens; **não** criar um segundo saldo de XP ou débito independente.
- `SPEC-RPG-021`: indisponibilidade temporária de Antecedentes e efeitos.
- Catálogo de clãs e configuração da campanha para condições específicas.
- Padrões de interface em `UI-GUIDE.md` e `design-system.md`.

**Atenção:** `lib/character-resources.ts` gerencia Fome/Humanidade/dano e não é armazenamento dos Antecedentes. Não conectar estes conceitos indevidamente.

## 2. Modelo de catálogo

Preferir estender o catálogo persistente já existente (ou seu JSON tipado) para evitar duplicação. Estrutura lógica recomendada:

```ts
type CatalogKind = 'BACKGROUND' | 'CLAN_RESTRICTED_ADVANTAGE'
  | 'LORESHEET' | 'GROUP_LORESHEET' | 'CUSTOM';

type SourceRef = {
  bookCode: string;
  edition: string;
  printedPageStart: number | null;
  printedPageEnd: number | null;
  pdfPageStart?: number | null;
  verified: boolean;
};

type EligibilityRule = {
  allowedClans?: string[];
  disallowedClans?: string[];
  bloodlines?: string[];
  factions?: string[];
  campaignTags?: string[];
  otherConditions?: string[]; // exigem adjudicação do Narrador
};

type LorePerk = {
  id: string;
  level: number;
  nameEn: string;
  namePt?: string;
  requirement?: EligibilityRule;
  effectKind: 'GRANT_TRAIT' | 'MODIFIER' | 'NARRATIVE_ONLY' | 'MANUAL_REVIEW';
  effectDefinition?: Record<string, unknown>;
  creationCost?: number;
  xpCost?: number;
  repeatable: boolean;
};

type LoreCatalogEntry = {
  id: string; // estável
  kind: CatalogKind;
  nameEn: string;
  namePt?: string;
  source: SourceRef | null;
  loreGroupId?: string;
  eligibility: EligibilityRule;
  perks: LorePerk[];
  licensingStatus: 'METADATA_ONLY' | 'AUTHORIZED' | 'CUSTOM';
  reviewStatus: 'DRAFT' | 'VERIFIED' | 'APPROVED';
};
```

Campos de efeito devem ser JSON tipado validado, sem executar fórmulas arbitrárias vindas do banco. Nunca inferir que os níveis são cumulativos. Desvincular nome canônico inglês de tradução display.

## 3. Persistência proposta

Usar tabelas reais de traços/fichas, sempre que presentes. Caso não suportem níveis independentes, planejar complemento mínimo:

```text
character_lore_choices
  id UUID PK
  campaign_id UUID
  character_id UUID
  catalog_entry_id TEXT
  catalog_perk_id TEXT
  catalog_revision INT
  level INT
  acquisition_type CREATION | XP | NARRATOR_GRANT
  cost_applied INT
  status ACTIVE | PENDING_APPROVAL | SUSPENDED | REVOKED
  approval_override_reason TEXT NULL
  approved_by TEXT NULL
  created_at, updated_at
  UNIQUE(character_id, catalog_perk_id) [se !repeatable]

coterie_lore_choices
  id UUID PK
  campaign_id UUID
  coterie_id UUID
  catalog_entry_id TEXT
  catalog_perk_id TEXT
  catalog_revision INT
  status ...
  acquired_by TEXT
  consent_record JSONB
  created_at, updated_at

campaign_lore_settings
  campaign_id UUID
  enabled_source_codes TEXT[]
  disabled_catalog_entry_ids TEXT[]
  max_distinct_loresheets INT NULL
  require_approval BOOLEAN
  updated_by TEXT
```

Validar tipo de IDs reais (Auth0 user ID normalmente string), foreign keys, Coterie existente e estruturas do Drizzle antes de escrever DDL. `UNIQUE` condicional deve ser implementado coerentemente, incluindo idempotência para `repeatable`.

Concessões de traços por perk devem ter `grant_origin_type=LORESHEET_PERK` e `grant_origin_id` únicos no ledger de benefícios. Se não existir ledger, criar estrutura mínima em vez de modificar diretamente totais sem rastro.

## 4. Serviço de domínio

```ts
searchLoreCatalog(filters, actor, campaignId): Promise<PagedCatalog>;
evaluateLoreEligibility(character, entry, perk, campaign): EligibilityResult;
previewLoreAcquisition(characterId, perkId, context): Promise<{
  allowed: boolean;
  creationDots?: number;
  xpCost?: number;
  warnings: string[];
  requiresNarratorApproval: boolean;
}>;
acquireLorePerk(actorId, characterId, perkId, acquisitionContext, idempotencyKey): Promise<Choice>;
approveLoreChoice(actorId, choiceId, decision): Promise<Choice>;
revokeLoreChoice(actorId, choiceId, reason): Promise<Choice>;
```

Operações de aquisição/efetivação devem ocorrer em transação: validar ator, personagem/campanha, fonte habilitada, clã/linhagem, incompatibilidades, orçamento/XP, duplicação e efeitos tipados. A aprovação é uma transição explícita; uma solicitação pendente **não** gasta XP nem aplica bônus até efetivação, salvo regra de reserva definida por implementação e testada. Em erro, não gastar XP.

A compra de mais de um perk da mesma Loresheet respeita a regra do catálogo e os limites de Loresheets distintas da mesa. Mudança de clã não revoga automaticamente benefício: registrar conflito para revisão pelo Narrador.

## 5. Endpoints propostos

```text
GET   /api/loresheets?campaignId=&q=&kind=&clan=&book=&page=
GET   /api/loresheets/:id
GET   /api/characters/:id/loresheets
POST  /api/characters/:id/loresheets
POST  /api/characters/:id/loresheets/:choiceId/revoke
POST  /api/campaigns/:id/loresheets/approvals/:choiceId
GET   /api/campaigns/:id/loresheet-settings
PATCH /api/campaigns/:id/loresheet-settings
```

Reutilizar endpoints de traits e comandos existentes se suportarem os contratos, evitando APIs paralelas. Nas APIs, `actor` deve ser derivado de sessão autenticada, nunca aceito do cliente. O backend filtra conteúdo do Narrador e entradas desabilitadas; respostas de jogadores não revelam razões ocultas.

## 6. Interface proposta

- Dentro do seletor de Vantagens/Antecedentes: tabs **Antecedentes | Específicos de clã | Loresheets**.
- Busca livre, filtro por livro, clã/linhagem, facção, faixa de pontos e elegibilidade; opção **Somente disponíveis para este personagem**.
- Card de Loresheet mostra nome canônico, descrição editorial breve, fonte exata, restrições, níveis individuais, custo por opção, efeito verificado e botão **Adicionar à ficha** por nível.
- A confirmação exibe pontos de criação ou XP a gastar e exige aceite de condições narrativas/manuais.
- Narrador: gerenciar fontes habilitadas, exceções, seleção de Loresheets compartilhadas, aprovações e itens CUSTOM.
- Resumo do personagem separa **Antecedentes**, **Vantagens/Defeitos** e **Loresheets**, preservando as concessões rastreadas.
- Bibliografia clicável somente com documento autorizado/visualizador autenticado; caso contrário, título/página em texto.

## 7. Segurança e isolamento

Checar autorização server-side em todas as consultas e mutações, isolamento entre campanhas/personagens, prevenção de BOLA/IDOR, transações de XP, idempotência, catálogo imutável para jogador, condições `CUSTOM` aprovadas pelo Narrador e ausência de vazamento de notas secretas. Evitar fornecer livro/PDF privado por links públicos.

Testes: compra somente nível III, compra independente I+III, dupla requisição, XP insuficiente, clã incompatível, override do Narrador, origens suspensas, benefício derivado sem duplicação, Coterie, aplicação de bloqueio temporário, 401/403 e parâmetros inválidos.

## 8. Implementação segura

Para migrations: registrar o destino de teste isolado e método de rollback em `tasks.md`. Não executar limpeza de bancos fora de ambiente de teste confirmado. Rodar lint/tipos/testes/auditoria de dependências e revisão `pre-commit-review` antes de marcar tarefas concluídas. Documentar a alteração real no CHANGELOG.
