# Design: Regras de criação de fichas VtM V5

## 1. Visão geral

A solução adiciona uma camada de domínio em `lib/vtm-v5/`, independente de React e banco, responsável por normalização, presets, cálculos e validação. A API usa esse motor para gerar relatórios e controlar submissões. O JSON atual permanece como fonte dos detalhes da ficha enquanto colunas comuns permitem consulta, autorização e workflow.

## 2. Estado atual

- `characters` possui colunas resumidas e um campo `data JSONB` flexível.
- `CharacterFormClient` salva rascunhos automaticamente e não bloqueia distribuições inválidas.
- Status existe, mas não há máquina de estados nem relatório estruturado.
- Desenvolvimento sem banco usa `lib/dev-db.ts`.

## 3. Arquitetura proposta

| Componente/arquivo | Responsabilidade | Entradas e saídas |
|---|---|---|
| `lib/vtm-v5/types.ts` | Contratos do domínio | ficha normalizada e relatório |
| `lib/vtm-v5/presets.ts` | Distribuições e presets públicos | constantes imutáveis |
| `lib/vtm-v5/validation.ts` | Regras puras e cálculos | `CharacterRulesInput -> ValidationReport` |
| `app/api/characters/[id]/validate/route.ts` | Relatório autenticado | `GET/POST -> ValidationReport` |
| `app/api/characters/[id]/status/route.ts` | Workflow da ficha | `PATCH -> status` |
| `CharacterFormClient` | Tipo, perfil, relatório e submissão | campos + feedback |

## 4. Modelo de dados e migração

Adicionar de forma idempotente a `characters`:

- `created_by_user_id TEXT` preenchido a partir de `user_id` para legado.
- `character_type TEXT NOT NULL DEFAULT 'PLAYER_VAMPIRE'`.
- `visibility TEXT NOT NULL DEFAULT 'PLAYER_VISIBLE'`.
- `validation_report JSONB`.
- `validated_at TIMESTAMPTZ`.

Dados detalhados continuam em `data`, incluindo `creationType`, touchstones, presets e overrides. Isso reduz risco de migração e permite normalização gradual para tabelas relacionais futuras.

## 5. Contratos de API

### `POST /api/characters/[id]/validate`

- Autenticação obrigatória; dono ou Mestre da campanha.
- Valida a versão persistida e retorna `{ valid, errors, warnings, derived }`.
- Persiste o último relatório quando houver banco.

### `PATCH /api/characters/[id]/status`

- Jogador: `DRAFT -> PENDING_REVIEW` somente com relatório válido.
- Mestre: pode mover para `APPROVED`, `ARCHIVED`, `DISABLED` ou devolver para `DRAFT`.
- Retorna `409` para transição inválida e `422` para ficha inválida.

## 6. Interface e acessibilidade

- Identidade recebe tipo de personagem e perfil de criação.
- Atributos, habilidades, disciplinas e vantagens exibem a regra aplicável, pontos usados/restantes e bloqueiam incrementos que tornem a distribuição impossível.
- Habilidades usam um dos perfis rápidos persistidos na ficha: generalista, equilibrado ou especialista.
- “Selar ficha” valida primeiro; erros aparecem em painel com links textuais para campos quando possível.
- O botão de submissão diferencia salvar rascunho de enviar para revisão.
- NPCs e retentores terão formulários especializados em fases posteriores, reutilizando o mesmo relatório.

## 7. Segurança

- Nunca confiar no tipo/status enviado pelo cliente sem autorização.
- A interface recebe do servidor os tipos permitidos para o perfil atual, e a API rejeita tipos exclusivos do Mestre em criações e atualizações feitas por jogadores.
- Validar UUID, limites numéricos, enums e tamanhos no servidor.
- Campos `privateNotes`, dados mecânicos secretos e overrides são removidos de respostas para jogadores não proprietários.

## 8. Estratégia de testes

- Unitários: atributos, habilidades, convicções, disciplinas, geração/BP, predadores, thin-blood, NPC simples, ghoul, Blood Bond e transições.
- Integração: rota sem sessão retorna `401`; dono valida; Mestre aprova.
- Validação final: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## 9. Riscos e mitigação

| Risco | Impacto | Mitigação |
|---|---|---|
| JSON legado incompleto | validação falsa negativa | normalizador com defaults e relatório explícito |
| Regras opcionais da crônica | bloqueio indevido | avisos e futuro override do Mestre |
| Escopo amplo de NPC/lacaios | entrega longa | fases independentes sobre motor comum |
| Conteúdo dos livros | manutenção/licença | armazenar apenas regras e nomes necessários |

## 10. Decisões e desvios

- A primeira implementação prioriza fundação, vampiro jogável e APIs. NPCs e lacaios recebem contratos e validadores puros antes de UIs completas.
- Tabelas altamente normalizadas sugeridas na fonte serão introduzidas somente quando houver necessidade de consulta relacional; o JSON existente será mantido nesta fase.
- Jogadores podem criar `PLAYER_VAMPIRE` e `RETAINER`; `HUMAN_NPC` e `VAMPIRE_NPC` ficam restritos ao Mestre tanto na interface quanto na API.
- A assistência de preenchimento reutiliza as distribuições do domínio para evitar divergência entre dicas, bloqueios da interface e validação final.
