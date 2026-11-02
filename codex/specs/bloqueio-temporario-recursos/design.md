# SPEC-RPG-021 — Design técnico

**Status:** proposed. Este documento descreve a implementação proposta, não código existente.

## Integrações e fonte de verdade

- `characters`, `campaigns` e modelo de Coterie existentes: validar seus IDs e estruturas reais antes de criar migração.
- `SPEC-SESSION-011-projects-coterie.md`: `project_stakes` e eventos de projeto são a fonte das regras de Projects. **Não criar um segundo saldo independente de Stake.** A projeção de indisponibilidade deve usar um identificador único `project_stake_id` para evitar desconto duplo.
- Disponibilidade é derivada: `totalDots - SUM(active blockedDots)`, nunca um campo mutável independente.
- Entidade de bloqueio pode ser própria ou uma projeção dos stakes existentes; decisão após inspecionar o schema real.

## Modelo lógico sugerido

```text
resource_locks
  id UUID PK
  campaign_id UUID NOT NULL
  owner_type CHARACTER | COTERIE
  owner_id UUID NOT NULL
  resource_instance_id UUID NULL
  resource_code TEXT NOT NULL
  dots INT NOT NULL
  origin_type PROJECT | NARRATIVE_EVENT | CONFLICT | STORYTELLER_DECISION | OTHER
  origin_id UUID NULL
  project_stake_id UUID NULL UNIQUE
  reason_private TEXT NOT NULL
  description_public TEXT NULL
  visibility PUBLIC | PARTIAL | HIDDEN
  duration_type MANUAL | NIGHTS | SESSIONS | DATE | PROJECT_END | NARRATIVE_CONDITION
  duration_count INT NULL
  count_current_unit BOOLEAN NOT NULL DEFAULT FALSE
  expires_at TIMESTAMPTZ NULL
  release_action AUTO_RELEASE | REQUIRE_CONFIRMATION
  status ACTIVE | AWAITING_RELEASE | RELEASED | CANCELLED
  created_by TEXT NOT NULL
  released_by TEXT NULL
  created_at / released_at / updated_at TIMESTAMPTZ
```

`owner_id` aponta para personagem ou coterie conforme `owner_type`; validar a referência e a associação à campanha na aplicação/transação. Tipos de identificador de usuário devem acompanhar Auth0 e o schema concreto, sem presumir UUID. A resolução de `resource_instance_id` precisa suportar um Retainer/Contact específico sem conflitar com a contagem agregada.

```text
campaign_time_events
  id UUID PK
  campaign_id UUID
  unit NIGHT | SESSION
  narrative_night_key TEXT NULL
  session_id UUID NULL
  occurred_at TIMESTAMPTZ
  actor_id TEXT
  unique(campaign_id, unit, narrative_night_key) [para NIGHT]
  unique(campaign_id, unit, session_id) [para SESSION]

resource_lock_time_events
  lock_id UUID
  time_event_id UUID
  counted BOOLEAN NOT NULL
  PRIMARY KEY(lock_id,time_event_id)

resource_lock_history
  id UUID PK
  lock_id UUID
  actor_id TEXT
  action TEXT
  before_state JSONB
  after_state JSONB
  occurred_at TIMESTAMPTZ

campaign_updates
  id UUID PK
  campaign_id UUID
  character_id UUID NULL
  event_key TEXT UNIQUE
  type TEXT
  source_id UUID
  public_title TEXT
  public_body TEXT
  private_body TEXT NULL
  visibility PUBLIC | PARTIAL | HIDDEN
  created_at TIMESTAMPTZ

campaign_update_reads
  update_id UUID
  user_id TEXT
  read_at TIMESTAMPTZ
  PRIMARY KEY(update_id,user_id)
```

Evitar criar `campaign_time_events` ou `campaign_updates` duplicadas caso haja entidades equivalentes no repositório. Para `HIDDEN`, gerar texto público neutro apenas se o jogador precisa saber da indisponibilidade. Persistir `event_key` determinística (`lockId:eventType:timeEventId`) para deduplicação.

## Transições

```text
ACTIVE -- prazo + REQUIRE_CONFIRMATION --> AWAITING_RELEASE
ACTIVE -- prazo + AUTO_RELEASE --> RELEASED
ACTIVE -- liberação manual autorizada --> RELEASED
AWAITING_RELEASE -- aprovação do Narrador --> RELEASED
ACTIVE/AWAITING_RELEASE -- cancelamento autorizado --> CANCELLED
```

`ACTIVE` e `AWAITING_RELEASE` descontam da disponibilidade. `RELEASED` e `CANCELLED` não descontam. Histórico é append-only, sem apagar registro.

## Serviço

```ts
getResourceAvailability(ownerType, ownerId, resourceCode): Promise<{
  totalDots: number;
  blockedDots: number;
  availableDots: number;
}>;
createLock(actorId, campaignId, input): Promise<ResourceLock>;
updateLock(actorId, lockId, changes): Promise<ResourceLock>;
releaseLock(actorId, lockId, reason): Promise<ResourceLock>;
processCampaignTimeEvent(campaignId, eventId): Promise<void>;
publishCampaignUpdate(event): Promise<void>;
```

O método de criação e atualização executa numa transação, bloqueando a linha/entidade de saldo de Background ou usando serialização/lock advisory por `campaign + owner + resource` antes de calcular capacidade. Validar `dots > 0`, duração positiva, estado, limite do Background e pertencimento à campanha.

## Processamento temporal

1. Uma ação explícita do Narrador avança a noite; finalização idempotente de sessão cria evento de sessão. Não usar cron para noites ou sessões.
2. Deduplicar pela identidade do evento de tempo; somente eventos elegíveis após a ativação (ou unidade corrente marcada pelo Narrador) contam.
3. Gravar pares únicos `(lock_id, time_event_id)`, contar progresso por pares efetivamente computados.
4. Ao atingir `duration_count`, transicionar no mesmo commit; se `AUTO_RELEASE`, liberar; caso contrário `AWAITING_RELEASE`.
5. Gravar notificações via outbox ou mesma transação; publicar apenas após commit; consumidores devem ser idempotentes.
6. Correções retroativas geram evento de correção e auditoria; não desfazem automaticamente liberações consumadas.

## API (rotas propostas; adaptar aos padrões presentes)

- `POST /api/campaigns/:campaignId/resource-locks`
- `GET /api/campaigns/:campaignId/resource-locks`
- `PATCH /api/resource-locks/:lockId`
- `POST /api/resource-locks/:lockId/release`
- `GET /api/characters/:characterId/resource-availability`
- `GET /api/campaigns/:campaignId/updates`
- `POST /api/campaigns/:campaignId/updates/:updateId/read`

Toda autorização no servidor: autenticação, pertença à campanha, `Narrador` para criação/edição/liberação, proprietário autorizado para consulta. Nunca retornar `reason_private`, `origin_id` secreto ou vínculos ocultos em DTO público.

## UI

- Na ficha, mostrar pontos adquiridos / indisponíveis / disponíveis e progresso; acesso aos detalhes conforme visibilidade.
- No gerenciamento da Mesa, Narrador define motivo público/privado, quantidade, duração, política de liberação e corrige prazo.
- Feed `Atualizações da Mesa` para jogadores/narradores com itens não lidos; apresentar aviso quando restar exatamente uma unidade.
- Não criar segunda página de Campanhas nem duplicar widgets de rolagem; integrar com as telas e serviços atuais.

## Segurança e validação

Tests: 401/403, BOLA/IDOR, dados inválidos, tentativa de exceder total por concorrência, leitura cruzada de campanha, projetos privados, idempotência de eventos de sessão/noite, visibilidade de notificações e auditoria. Revisar OWASP Top 10/ASVS. Rodar TypeScript/lint/testes, auditoria de dependências e revisão pré-commit antes de marcar implementação concluída.

## Persistência de desenvolvimento

Definir em `tasks.md` o DATABASE_URL de destino seguro **sem registrar segredo**, confirmar que é ambiente isolado de teste e aplicar migração recriável/seed. Não executar drop nem limpeza por esta SPEC documental. Rollback: remover apenas novas estruturas antes de conter dados úteis, ou preparar migration de reversão específica.
