# SPEC-RPG-021 — Bloqueio temporário de recursos por eventos e projetos

**Status:** proposed · **Versão:** 1.1 · **Módulo:** Personagem / Mesa / Projetos / Atualizações da Mesa
**Branch de referência:** `develop`
**Dependência:** [SPEC-SESSION-011 — Projects e Coterie](../SPEC-SESSION-011-projects-coterie.md)

## Objetivo

Permitir ao Narrador restringir temporariamente pontos de Antecedentes (Backgrounds) de um personagem ou Coterie por evento, conflito ou projeto. O recurso mantém seus pontos adquiridos, mas os pontos bloqueados não podem ser usados em testes, ações ou novos projetos. Exibir progresso e enviar lembretes internos para jogadores e Narrador por **noites narrativas** ou **sessões concluídas**.

## Terminologia e fundamento

- `totalDots`: pontos adquiridos; `blockedDots`: soma dos bloqueios ativos; `availableDots = max(0, totalDots - blockedDots)`.
- `PROJECT_STAKE`: compromisso regido pelo Appendix II — Projects do livro básico de V5 (pp. 417–420). A SPEC-SESSION-011 continua responsável por Launch Roll, Scope, Increment, Project Die, Goal Roll e perdas; este módulo somente materializa a indisponibilidade da Stake.
- `NARRATIVE_LOCK`: bloqueio criado pelo Narrador, extensão funcional do app, não regra oficial de duração uniforme para todos os Backgrounds.
- Perda permanente é operação separada, registrada no histórico de alterações do recurso; não deve ser confundida com o bloqueio.

## Requisitos funcionais

| ID | Obrigatoriedade | Requisito |
|---|---|---|
| RF-01 | MUST | Narrador cria, altera, prorroga, reduz e encerra bloqueios sobre Antecedentes próprios ou compartilhados da campanha. |
| RF-02 | MUST | Bloqueio parcial ou total em pontos, sem alterar pontos adquiridos nem XP. |
| RF-03 | MUST | Cada bloqueio registra origem `PROJECT`, `NARRATIVE_EVENT`, `CONFLICT`, `STORYTELLER_DECISION` ou `OTHER`, motivo e opcional `originId`. |
| RF-04 | MUST | Não permitir que a soma de bloqueios ativos exceda os pontos adquiridos; validar concorrentemente no servidor. |
| RF-05 | MUST | Duração `MANUAL`, `NIGHTS`, `SESSIONS`, `DATE`, `PROJECT_END` ou `NARRATIVE_CONDITION`. Para noites/sessões, aceitar inteiro positivo. |
| RF-06 | MUST | Noites avançam somente por ação explícita do Narrador no calendário da crônica, não pelo relógio real. |
| RF-07 | MUST | Sessões contam uma única vez, quando concluídas. Sessão cancelada não conta; ao criar bloqueio durante sessão, Narrador decide se a sessão atual será elegível. |
| RF-08 | MUST | Ao chegar ao prazo, executar `AUTO_RELEASE` ou `REQUIRE_CONFIRMATION`; exigir confirmação como padrão para projetos ou condições narrativas. |
| RF-09 | MUST | Publicar atualizações de criação, prazo restante de 1 unidade, expiração, liberação e prorrogação no feed `Atualizações da Mesa`; acompanhar leitura por participante. |
| RF-10 | MUST | Visibilidade `PUBLIC`, `PARTIAL`, `HIDDEN`; ocultar origem e motivo privados em API, notificações e feed do jogador. |
| RF-11 | MUST | Mostrar total/bloqueado/disponível na ficha e usar disponibilidade efetiva nas operações mecânicas de Backgrounds. |
| RF-12 | MUST | Preservar trilha de auditoria de quem alterou bloqueio, evento de tempo e liberação; manter histórico após encerramento. |
| RF-13 | MUST | Bloqueios de Coterie afetam cada membro que consome o mesmo Background compartilhado, sem descontar múltiplas vezes. |
| RF-14 | SHOULD | Narrador visualiza painel de bloqueios ativos/pendentes com filtros de personagem, recurso e origem. |

## Semântica temporal

- `NIGHTS`: incluir a noite de início como primeira noite **quando confirmado pelo Narrador**; liberação no encerramento da N-ésima noite elegível. Avanços de múltiplas noites devem gerar eventos de noite distintos ou um evento com faixa verificável para não perder contagem.
- `SESSIONS`: apenas transição válida para `COMPLETED`; reabrir/reconcluir a mesma sessão não incrementa novamente. Se criada durante sessão, opção `countCurrentSession` controla elegibilidade.
- `DATE`: usar horário com fuso da campanha; relógio real permitido somente nesta modalidade.
- `PROJECT_END` / `NARRATIVE_CONDITION`: desfecho e consequências controlados pelo Narrador e/ou pelo serviço de Projects; nunca liberar apenas por contagem de tempo.
- Correções retroativas precisam de registro e reavaliação controlada; não reverter silenciosamente perdas ou liberação já efetivadas.
- Se `AUTO_RELEASE`, ao fim da unidade elegível a liberação ocorre uma vez; se `REQUIRE_CONFIRMATION`, fica `AWAITING_RELEASE` e o recurso permanece indisponível até confirmação.

## Experiência do usuário

- Formulário do Narrador: Background, pontos, origem, justificativa privada, descrição visível, duração/quantidade, contar sessão/noite atual, política de expiração e visibilidade.
- Ficha do jogador: pontos totais, indisponíveis, disponíveis, progresso `2 / 3 noites`, detalhes públicos conforme visibilidade.
- Feed da Mesa: itens por bloqueio com mensagem em linguagem de jogo, aviso quando faltar 1 unidade, conclusão e liberação; marcador de não lido.
- Notificação para Narrador na confirmação pendente; notificações internas suficientes para MVP (não exigir push/e-mail).
- Informações `HIDDEN` jamais revelam projetos secretos, motivos, identificadores de origens ou nomes de NPCs.

## Critérios de aceite

1. Recurso Resources 4 com 2 pontos bloqueados aparece como 4/2/2, sem remover a aquisição; todas as operações que utilizem o Antecedente consideram 2.
2. Duas requisições simultâneas não podem bloquear 3+2 pontos de um recurso com total 4.
3. Bloqueio de 3 noites encerrado na terceira noite elegível libera exatamente uma vez e emite uma única atualização.
4. Bloqueio de 2 sessões não é consumido por sessão cancelada, nem duplicado ao concluir a mesma sessão novamente.
5. Atingir o prazo em modo confirmação mantém pontos indisponíveis, emite solicitação ao Narrador e só libera após ação autorizada.
6. Jogador sem permissão não cria/libera bloqueio; participante de outra campanha não acessa detalhes, bloqueios, feed ou eventos.
7. Motivos privados e vínculos `HIDDEN` não aparecem em respostas públicas, feed nem mensagens.
8. Stake de projeto usa somente os pontos disponíveis, integra com `project_stakes` existente/previsto, sem alterar as regras de `Project Die`.
9. Bloqueios compartilhados e correções temporais são idempotentes e auditáveis.
10. Suíte de testes contempla 401/403, IDOR/BOLA, manipulação de quantidade, concorrência, idempotência e visibilidade.

## Fora de escopo

Bloquear Atributos, Habilidades, Disciplinas, Fome, Vitalidade e Força de Vontade; notificações externas; resolver automaticamente consequências narrativas ou todas as regras de Projects.
