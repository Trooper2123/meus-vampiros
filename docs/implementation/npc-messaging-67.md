# NPCs nas mensagens — issue #67

## Comportamento

- O Narrador inicia e responde a conversas como um NPC narrativo ativo, não template, vinculado à mesa. NPCs não são copiados para `characters`.
- Jogadores enviam apenas como seus personagens aprovados; NPCs com `name` ou `identity` revelados aparecem como destinatários.
- Mensagens de NPC oculto iniciadas pelo Narrador chegam com o nome **NPC não revelado** e sem seu ID no DTO do jogador. O jogador não pode iniciar nem responder ao NPC oculto até a identidade ser revelada.
- O Narrador pode usar um NPC em conversas de Coterie; isso não o torna membro da Coterie. As entregas continuam restritas aos membros e às identidades participantes da mensagem.
- Arquivar, desvincular ou transformar o NPC em template impede novos envios. O histórico entregue continua disponível, com identidade redigida quando o vínculo/revelação deixam de existir.
- Configuração de SMS, quota por ator, idempotência, paginação e autoria auditável são preservadas. O frontend recebe `isNarrator` coerente com o papel calculado no servidor.

## Contrato compatível

Os campos existentes `senderCharacterId` e `recipientCharacterId` continuam válidos. Para NPC, enviar `senderNpcId`/`recipientNpcId` como alternativas exclusivas. Enviar os dois tipos de identidade para o mesmo participante é inválido. As referências são UUIDs separados por tipo, inclusive quando entidades diferentes possuem o mesmo UUID.

`senderCharacterId` é `null` para mensagens NPC. `senderNpcId` aparece somente ao Narrador ou quando a identidade está revelada na campanha. Campos de payload, notas, ficha e detalhes privados do NPC não são retornados pelos contatos/histórico.

## Schema e implantação

Pré-requisitos: bootstrap de personagens/SMS e migração `20261023_npcs_sheet_narrative.sql` do domínio de NPCs. A migração `20261111_sms_npc_participants.sql` adiciona referências NPC nas threads, mensagens e entregas, mantendo as referências Character antigas. Substitui a PK composta de entregas por índices únicos parciais e checks XOR; os registros existentes não são apagados nem reidentificados. As FKs NPC impedem exclusão física de identidades referenciadas.

O SQL também é usado pelo bootstrap de SMS em `lib/character-sms-npc-schema.ts`; há teste de igualdade entre as duas representações. A migração usa lock consultivo transacional para serializar reaplicações. Ela foi validada apenas no PostgreSQL 16 local descartável, schema `meus_vampiros_test`, com dados fictícios. Nenhum banco Neon/Vercel foi acessado ou alterado nesta entrega.

Antes de publicar: conferir backup e pré-requisitos no ambiente de destino, aplicar a migração de forma controlada e homologar com Narrador/jogador. O bootstrap também a executará no primeiro acesso de SMS após a entrega; planejar a aplicação antes de receber tráfego evita DDL no primeiro acesso.

Rollback: voltar o código e preservar as colunas e registros novos; a versão antiga não interpreta mensagens NPC. Não remover colunas/entregas NPC para rollback sem exportar dados e definir um procedimento específico. Não restaurar `NOT NULL` legado enquanto existirem mensagens NPC.

## Verificação

31 testes focados: unidade, montagem dos payloads na UI, integração PostgreSQL, ida/volta jogador↔NPC, NPC oculto, isolamento, falsificação de remetente, revogação de acesso, troca de Narrador, SMS desabilitado, paginação, Coterie, quota compartilhada, concorrência/replay, checks de integridade e upgrade reaplicável de tabelas legadas.

Há workflow específico de PR para `main` e `develop`, com PostgreSQL 16 efêmero e os testes acima. O workflow foi adicionado, mas ainda não executou no GitHub.

QA manual Safari/iPad e fluxo autenticado no deploy permanecem pendentes. Esta implementação não encerra automaticamente a issue #67 nem aplica migração em produção.
