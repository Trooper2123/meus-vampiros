# SPEC-SESSION-012 — Mensagens entre Personagens (SMS da Crônica)

**Status:** proposed · **Versão:** 1.0 · **Módulos:** Personagem / Campanha / Hub do Jogador / Gestão da Mesa
**Base:** develop · **Dependência funcional:** SPEC-SESSION-011 — Projetos dos Jogadores e Coterie
**Natureza:** funcionalidade do aplicativo; não é uma mecânica oficial de V5.

## 1. Objetivo

Criar um sistema persistente de mensagens *in character*, com aparência de SMS/mensageiro, independente de uma sessão estar iniciada. As mensagens são trocadas entre identidades de personagens da mesma campanha ou direcionadas à Coterie.

**Regras mandatórias:**
1. O **Narrador acessa todas as mensagens da sua campanha**, inclusive conversas privadas entre jogadores e conversas da Coterie, sem precisar ser destinatário.
2. O Narrador **envia e responde assumindo a identidade ficcional de NPCs ou de qualquer outro personagem pertencente à campanha**. A identidade real do operador permanece registrada, mesmo quando não exibida aos jogadores.
3. O **Jogador visualiza apenas mensagens endereçadas a um de seus personagens autorizados ou à Coterie da qual esse personagem é destinatário**. Não possui acesso global a conversas da campanha.
4. Um jogador **só pode enviar como personagem que controla**, nunca se passar por outro jogador, NPC, Narrador ou membro de outra campanha.
5. As mensagens persistem entre sessões; **não reutilizar o chat temporário do LiveKit**.

## 2. Limites do escopo

### Incluído na entrega inicial

- Caixa de entrada com conversas diretas e conversas de Coterie; envio, respostas, histórico e busca nas conversas autorizadas.
- Mensagens de texto (até 2.000 caracteres), ordenação cronológica, paginação e indicador de não lidas.
- Narrador: visão global por campanha, filtros e composição sob identidades fictícias válidas.
- Jogador: seleção do próprio personagem emissor e destinatário, lista filtrada, leitura e envio.
- Permissão e auditoria aplicadas no backend, sem depender de controles visuais.
- Uso tanto no Hub da campanha fora de sessão quanto durante a sessão.
- Notificações internas na aplicação, sem pressupor push, e-mail ou SMS telefônico.

### Fora do escopo inicial

- SMS real via operadora, WhatsApp, integração com telefones, anexos/mídia, criptografia ponta a ponta, edição de mensagens já entregues, exclusão física, automações por IA ou leitura secreta por outros jogadores.
- Envio a usuários que não pertençam à campanha ou envio de mensagens por personagens desvinculados.
- Revelação automática a todos os participantes da campanha: **Coterie não é sinônimo de campanha**.

## 3. Identidades, atores e terminologia

- **Actor:** usuário autenticado (Auth0, ID persistido), responsável técnico pela ação.
- **Sender Character:** personagem ficcional exibido como remetente ao destinatário.
- **Recipient Character:** personagem ficcional autorizado a receber uma mensagem direta.
- **Coterie:** grupo definido pela entidade própria da SPEC-SESSION-011, com membros historizados.
- **Narrator:** proprietário da campanha (campaigns.master_user_id).
- **Thread:** conversa persistente dentro de uma única campanha, do tipo DIRECT ou COTERIE.
- **Message:** entrada imutável do histórico de uma Thread.
- **Visible sender:** identificação ficcional apresentada ao jogador; não concede privilégios técnicos.

**O Narrador fala como um personagem, mas nunca autentica como ele.** Exemplo: uma mensagem exibida como “NPC: Xerife” contém sender_character_id do Xerife e created_by_actor_id da conta do Narrador. O cliente do jogador recebe apenas a identidade ficcional pertinente; a Gestão da Mesa exibe também o operador real na auditoria.

## 4. Matriz de permissões

| Operação | Jogador | Narrador da campanha |
|---|---|---|
| Listar threads | Somente threads com mensagens entregues ao(s) seu(s) personagem(ns) | Todas da campanha |
| Ler mensagens diretas | Apenas se um personagem seu for destinatário efetivo, ou remetente legítimo | Todas |
| Ler mensagens de Coterie | Somente mensagens entregues ao seu personagem enquanto membro destinatário | Todas |
| Iniciar conversa direta | Como personagem próprio e autorizado, com destinatário visível e elegível | Como qualquer personagem elegível da campanha, inclusive NPC |
| Enviar à Coterie | Como seu personagem membro, para sua Coterie | Como personagem elegível, inclusive NPC, para qualquer Coterie da campanha |
| Responder como outro personagem | Proibido | Permitido; registrar operador real |
| Consultar auditoria de impersonação | Proibido | Permitido |
| Consultar conversa de outro jogador | Proibido | Permitido |
| Listar todas as Coteries | Somente Coteries a que o personagem pertence | Todas |
| Reabrir dados após sair da Coterie | Somente histórico já entregue antes da saída, conforme política abaixo | Todo o histórico |
| Apagar/editar mensagens entregues | Não permitido | Não permitido; eventual moderação futura deve gerar evento auditado |

**Privacidade narrativa:** avisar nas interfaces que o Narrador possui acesso integral, inclusive a conversas diretas. Não rotular essas mensagens como “secretas do Narrador”.

## 5. Elegibilidade e autorização

Acesso a uma campanha exige ser Narrador ou controlar personagem válido nela. O acesso ao sistema deve validar o status atual e a elegibilidade do personagem, não apenas user_id. A política inicial para participação ativa é PLAYER_VAMPIRE com status APPROVED e não removido, desabilitado ou arquivado. O Narrador pode usar NPCs pertencentes à campanha, desde que existam e não estejam excluídos.

- A consulta de envio deve confirmar campaign_id do emissor, campaign_id do destinatário, tipo e propriedade de ambos. Não aceitar sender_actor_id, created_by_actor_id ou is_narrator enviados pelo cliente.
- Para o Narrador, permitir selecionar qualquer personagem da campanha em sua função de remetente, inclusive personagens dos jogadores; o servidor registra a atuação do Narrador.
- Jogadores podem selecionar somente um de seus próprios personagens APPROVED; para conversa direta, o destinatário deve ser um personagem da campanha permitido pelo catálogo de contatos visíveis. NPCs ocultos não podem ser descobertos por enumeração.
- O acesso ao histórico deve ser decidido por destinatários persistidos por mensagem, não por um filtro ingênuo de campaign_id ou pela participação atual em uma thread.
- Caso um ator controle várias fichas da mesma campanha, as caixas de entrada podem ser agregadas por usuário **apenas** quando cada linha devolvida pertencer a uma de suas fichas. O envio sempre identifica explicitamente o personagem escolhido.
- Caso a pessoa também seja Narrador da campanha, a experiência em modo Jogador deve usar as permissões restritas do personagem selecionado; somente o endpoint/visão administrativa do Narrador expõe tudo. Nunca misturar os resultados em um mesmo payload.

### 5.1 Política de Coterie

**Destinatários de mensagem à Coterie são resolvidos e materializados no momento do envio.** Considerar membros com joined_at <= envio e left_at IS NULL ou left_at > envio, com personagem elegível na campanha. Cada mensagem cria registros de entrega para os membros incluídos naquele instante.

- Quem ingressar depois não recebe retroativamente mensagens anteriores.
- Quem sair mantém acesso somente às mensagens que foram entregues ao seu personagem, se sua ficha continuar acessível ao proprietário; não lê mensagens futuras.
- Se a campanha tiver múltiplas Coteries, selecionar explicitamente o coterie_id; **nunca expandir para todas as Coteries**.
- O próprio remetente também recebe uma cópia na thread, para composição de histórico.
- Mudanças futuras de grupo não devem recalcular destinatários de mensagens antigas.

**Dependência:** a SPEC-SESSION-011 descreve coterie_members, mas o schema operacional deve ser verificado antes da migração. Se o domínio da Coterie ainda não existir, não simular lista de membros por todas as fichas da campanha: habilitar inicialmente apenas DIRECT e apresentar COTERIE como indisponível até implantação da dependência.

## 6. Tipos e fluxos

### 6.1 Mensagem direta (DIRECT)

Fluxo:
1. Jogador escolhe um de seus personagens e um destinatário autorizado.
2. Digita a mensagem e confirma o envio.
3. Backend revalida autor, destinatário, campanha e thread.
4. Mensagem é persistida de forma transacional, com entregas ao remetente e ao destinatário.
5. Ambos veem a conversa. O Narrador vê a conversa em sua caixa global.
6. O Narrador pode responder como o destinatário original, um NPC ou outro personagem elegível, **sem falsificar quem executou a ação**.

**Identidade da thread:** não assumir que toda thread DIRECT tem sempre os mesmos dois interlocutores ao permitir respostas de terceiros pelo Narrador. A primeira entrega pode usar pares de personagens e permitir ao Narrador escolher uma thread já existente e responder nela; o modelo deve registrar o remetente efetivo de cada mensagem. Quando o Narrador inserir novo personagem em conversa de terceiros, exigir escolha explícita entre:
- **Participar da conversa existente:** nova mensagem visível apenas aos destinatários selecionados da mensagem, com indicação de novo participante; ou
- **Abrir outra conversa:** thread distinta com participantes elegíveis.

Na primeira entrega, a escolha mais segura é exigir **nova thread** ao mudar o conjunto de destinatários; o Narrador pode responder como outro personagem mantendo os destinatários originais. O remetente substituto não ganha direito de leitura automática ao proprietário daquele personagem.

### 6.2 Mensagem da Coterie (COTERIE)

A thread se vincula a campaign_id e coterie_id. Jogador membro pode enviar à própria Coterie; Narrador pode enviar por qualquer personagem legítimo da campanha. O backend materializa os destinatários conforme §5.1. Quem estiver fora da Coterie não obtém leitura por fazer parte da campanha.

### 6.3 Narrador atuando como personagem

- Seletor “Responder como” na Gestão da Mesa, com personagens válidos da campanha; distinguir NPC e personagem controlado por jogador.
- Não expor o Auth0 ID do Narrador para destinatários.
- Registrar impersonated_by_narrator = true e created_by_actor_id no evento/mensagem, acessível apenas à auditoria da Gestão da Mesa.
- Não permitir que o Narrador use este recurso para alterar a autoria de mensagens anteriores.
- A interface do Narrador exibe a identificação “Enviado como [personagem] · Operado pelo Narrador”.
- Quando ele fala como personagem de jogador, a mensagem aparece na conversa com o personagem escolhido como remetente ficcional, mas **o jogador não deve receber privilégios para consultar conversas alheias por causa da autoria ficcional forjada**. A entrega e a autorização permanecem por destinatários materializados ou por autoria legítima daquele usuário.

## 7. Modelo de dados (proposta PostgreSQL)

Reutilizar campanhas, personagens, usuários, NPCs e Coteries. **Não** reutilizar session_chat_messages (chat LiveKit/sessão) nem notas.

### character_message_threads
- id UUID PK
- campaign_id UUID NOT NULL FK campaigns
- kind TEXT CHECK ('DIRECT','COTERIE')
- coterie_id UUID NULL FK coteries
- subject VARCHAR(160) NULL
- created_by_actor_id TEXT NOT NULL
- created_at TIMESTAMPTZ NOT NULL
- updated_at TIMESTAMPTZ NOT NULL
- closed_at TIMESTAMPTZ NULL
- constraints: COTERIE exige coterie_id, DIRECT proíbe; toda relação deve pertencer à mesma campanha.

### character_message_thread_participants
- thread_id UUID FK
- character_id UUID FK characters
- added_at TIMESTAMPTZ
- removed_at TIMESTAMPTZ NULL
- PRIMARY KEY (thread_id, character_id, added_at)
- Uso: participantes elegíveis e contexto de composição; **não confere acesso histórico por si só**.

### character_messages
- id UUID PK
- thread_id UUID NOT NULL FK character_message_threads
- campaign_id UUID NOT NULL FK campaigns (redundância validada no serviço)
- sender_character_id UUID NOT NULL FK characters
- created_by_actor_id TEXT NOT NULL
- impersonated_by_narrator BOOLEAN NOT NULL DEFAULT false
- body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000)
- idempotency_key UUID NOT NULL
- created_at TIMESTAMPTZ NOT NULL
- retracted_at TIMESTAMPTZ NULL (reservado à moderação auditável, sem excluir histórico)
- UNIQUE (campaign_id, created_by_actor_id, idempotency_key)

### character_message_deliveries
- message_id UUID FK character_messages
- recipient_character_id UUID FK characters
- delivered_at TIMESTAMPTZ NOT NULL
- read_at TIMESTAMPTZ NULL
- PRIMARY KEY (message_id, recipient_character_id)
- Uso: fonte de verdade de **quem pode ler** e dos indicadores de leitura.
- Em COTERIE, materializa cada personagem da Coterie no momento do envio.

### character_message_audit_events
- id UUID PK
- campaign_id UUID NOT NULL
- message_id UUID NULL
- thread_id UUID NULL
- actor_id TEXT NOT NULL
- action TEXT NOT NULL (CREATED, SENT, READ, NARRATOR_IMPERSONATED, RETRACTED, ACCESS_DENIED)
- metadata JSONB (restrita e minimizada, sem tokens e preferencialmente sem duplicar corpo)
- created_at TIMESTAMPTZ NOT NULL

Índices recomendados: threads(campaign_id, updated_at DESC), messages(thread_id, created_at DESC, id DESC), deliveries(recipient_character_id, read_at, message_id), audit(campaign_id, created_at DESC). Índice exclusivo de idempotência por campanha/ator/chave.

**Atomicidade:** criação/validação da thread, inserção da mensagem, entregas e auditoria do envio na mesma transação. Falha parcial não pode tornar mensagem visível sem destinatários ou sem auditoria. Todas as mutações usam controle de idempotência.

## 8. API e contratos

Rotas sugeridas (nomes ajustáveis às convenções existentes):
- GET /api/campaigns/[id]/character-messages/threads?characterId=&cursor=&limit=
- POST /api/campaigns/[id]/character-messages/threads
- GET /api/campaigns/[id]/character-messages/threads/[threadId]?characterId=&cursor=&limit=
- POST /api/campaigns/[id]/character-messages/threads/[threadId]/messages
- PATCH /api/campaigns/[id]/character-messages/messages/[messageId]/read
- GET /api/campaigns/[id]/character-messages/contacts?characterId=
- GET /api/campaigns/[id]/character-messages/unread?characterId=
- GET /api/campaigns/[id]/narrator/character-messages?cursor=&limit=&sender=&recipient=&kind=
- GET /api/campaigns/[id]/narrator/character-messages/audit?cursor=&limit=

**Contrato de envio (exemplo):**
```json
{
  "threadId": "uuid",
  "senderCharacterId": "uuid",
  "target": { "kind": "DIRECT", "recipientCharacterId": "uuid" },
  "body": "Nos encontramos na Eixão às 23h.",
  "idempotencyKey": "uuid"
}
```

Para Coterie, target.kind = COTERIE e target.coterieId = UUID. Em resposta a uma thread existente, o backend mantém destinatários previstos e rejeita mudança implícita de público.

Respostas para jogador retornam somente: identificadores necessários, remetente ficcional, corpo, timestamp, estado de leitura próprio e destinatários que ele está autorizado a conhecer. **Não retornar** created_by_actor_id de terceiro, impersonated_by_narrator, audit, lista completa de leitores ocultos, propriedades de NPC não reveladas ou nomes de conversas às quais não pertence.

A API administrativa do Narrador retorna identidade ficcional e autoria técnica auditável. Todos os IDs são verificados por campanha/usuário em **cada requisição**, inclusive cursor e alteração de read_at.

Erros: 401 sem autenticação; 403 quando autorizado não pode operar; 404 para recursos não visíveis (preferível a revelar existência); 409 conflito/idempotência incompatível; 422 validação. Não confiar em parâmetros da URL como prova de vínculo.

## 9. UI do Jogador

Local: `/campaigns/player/[id]` → aba **Mensagens**, ao lado de Arquivos, Anotações, Eventos, Calendário, Coterie e Projetos. Durante uma sessão, disponibilizar o mesmo módulo no Hub do Jogador, **sem substituir o chat LiveKit**.

Layout “SMS da Crônica”:
- Lista lateral de conversas, busca, nome/ícone do personagem e contador de não lidas.
- Visão de conversa com balões de mensagens, horários e identidade ficcional do remetente.
- Seletor de “Falar como” limitado às próprias fichas autorizadas.
- “Nova conversa” com contatos elegíveis, ou “Mensagem para minha Coterie”.
- Campo de composição, envio, feedback, estados vazios e carregamento.
- Identidade da Coterie e indicadores de mensagens enviadas a todo o grupo.
- Preservar o design gótico da aplicação e a navegação lateral global existente.
- Informar de maneira acessível que **o Narrador pode ler todas as mensagens da campanha**.

## 10. UI do Narrador

Local: `/campaigns/[id]?view=messages`, substituindo o placeholder já existente; usar a mesma fonte de dados e regras de autorização.

- Caixa **Todas as mensagens**, incluindo directs e Coteries.
- Filtros por remetente, destinatário, Coterie, não lidas, intervalo e pesquisa textual.
- Conversa detalhada, com autoria ficcional e autoria técnica distinguíveis.
- Seletor **Responder como**: NPC ou qualquer personagem elegível da campanha.
- Resposta à thread existente mantendo público efetivo; criação de nova thread para destinatários diferentes.
- Trilha de auditoria administrativa e indicador de ações feitas pelo Narrador.
- Acesso ao módulo independentemente de sessão ativa.
- Não permitir que a escolha de um personagem para resposta abra ao controlador desse personagem todo o histórico global do Narrador.

## 11. Notificações e atualização

- Badges de não lidas na aba Mensagens e na linha da conversa.
- Atualização periódica com SWR (ex.: 10 s) e atualização otimista somente depois de confirmação segura do envio; limpar cache ao trocar usuário, personagem ou campanha.
- Notificação interna discreta ao receber mensagem, fora e durante sessão; preservar foco e não sobrepor controles essenciais.
- Não incluir o texto de mensagens privadas em notificações globais para outro usuário/campanha; em notificações do Narrador pode constar o personagem autor, sem revelar dados para terceiros.
- Sem depender de WebSockets/LiveKit nesta fase; preparar serviço para eventos em tempo real futuros.

## 12. Segurança, moderação e observabilidade

- Isolamento total por campaign_id; negar IDOR/BOLA tanto em leitura quanto envio e read receipts.
- Consultas de listagem devem ser restritivas no SQL; não buscar tudo e filtrar no cliente.
- Não deixar que identidade ficcional substitua identidade autenticada em autorização.
- O Narrador tem visibilidade integral, mas isso não equivale a autorização cross-campaign.
- Mensagem renderizada como texto; escapar HTML, não executar Markdown/HTML não confiável.
- CSRF/origin para mutações, limites de tamanho, rate limit de envio, paginação e validação estrita.
- Registros de auditoria do Narrador devem permanecer acessíveis somente a ele, mesmo quando o personagem for controlado por jogador.
- Desvinculação/arquivamento de ficha: bloquear novas ações segundo a política; histórico recebido permanece disponível apenas quando a ficha continuar acessível conforme controle da conta. Exclusão/remoção definitiva exige política explícita de retenção; não apagar audit trail silenciosamente.
- Não declarar criptografia de ponta a ponta: acesso integral do Narrador é requisito.
- Erros nunca devem incluir mensagens privadas de outras threads nem dados de autenticação.
- Registrar contadores de mensagens enviadas, erros 403/404/409, latência de consultas, sem logar conteúdo de SMS por padrão.

## 13. Plano técnico de implementação

1. Revisar estrutura real das Coteries da SPEC-SESSION-011 e compatibilidade com os personagens existentes.
2. Criar tabelas, constraints, índices e testes de migração/seed. Durante desenvolvimento, recriação de schema é aceita; não inventar dados históricos.
3. Implementar serviço de autorização centralizado e projeções distintas PLAYER/NARRATOR.
4. Implementar criação e leitura de threads, mensagem transacional, entregas, read_at e idempotência.
5. Implementar visão administrativa do Narrador e auditoria do envio como personagem.
6. Implementar aba SMS no Hub permanente do Jogador, incluindo contato, conversa e badge.
7. Reutilizar o mesmo módulo no Hub durante a sessão, sem alterar chat/câmeras LiveKit.
8. Revisar acessibilidade, privacidade, erros e desempenho; executar testes, TypeScript, lint e build.
9. Validar visual das novas telas com mockup aprovado **antes de estilização final**, seguindo o padrão de SPEC-SESSION-011.

## 14. Cenários de teste obrigatórios

| ID | Cenário | Resultado esperado |
|---|---|---|
| MSG-01 | Jogador A envia DIRECT ao personagem B | Somente A e B veem a mensagem, além do Narrador da campanha |
| MSG-02 | Jogador C tenta abrir ID da thread A↔B | 404/403, nenhum conteúdo vazado |
| MSG-03 | Jogador A tenta enviar como personagem B | Rejeitado e auditado |
| MSG-04 | Narrador envia como NPC | Destinatários veem NPC; auditoria identifica conta do Narrador |
| MSG-05 | Narrador envia como personagem de B | Remetente ficcional de B; B não recebe acesso a conversa alheia |
| MSG-06 | Narrador acessa thread privada A↔B | Leitura integral autorizada |
| MSG-07 | Jogador A da Coterie X recebe mensagem à X | Entrega presente |
| MSG-08 | Jogador da Coterie Y tenta ler mensagem à X | Acesso negado |
| MSG-09 | Novo membro entra em X após envio | Mensagem anterior indisponível |
| MSG-10 | Membro sai de X | Mantém somente entregas anteriores; não vê novas |
| MSG-11 | Remetente tem fichas em duas campanhas | Não ocorre cruzamento de dados |
| MSG-12 | Repetir POST com mesma idempotencyKey e mesmo payload | Uma mensagem e entregas únicas |
| MSG-13 | Repetir idempotencyKey com conteúdo diferente | 409 |
| MSG-14 | Ator forja actorId/narrator flag no corpo da requisição | Ignorado/rejeitado; não escala privilégios |
| MSG-15 | Narrador de campanha A tenta ler campanha B | 403/404 |
| MSG-16 | Abertura fora de sessão ativa | Mensagens disponíveis e persistentes |
| MSG-17 | Abertura durante sessão | SMS disponível sem afetar chat LiveKit |
| MSG-18 | Troca de conta/personagem enquanto há cache | Conteúdo anterior invalidado |
| MSG-19 | Coterie ainda sem domínio persistente | Envio COTERIE bloqueado de forma explícita, nunca difundido à campanha inteira |
| MSG-20 | Personagem arquivado/desabilitado tenta enviar | Bloqueado pela política de elegibilidade |
| MSG-21 | Mensagem de Narrador com remitente ficcional de jogador | Não altera autorização nem propriedade das mensagens |
| MSG-22 | Paginação de thread e listagem global | Sem fuga de dados e ordem determinística |

## 15. Critérios de aceite

- [ ] Jogador vê apenas mensagens efetivamente dirigidas às suas fichas ou Coterie.
- [ ] Narrador vê todas as mensagens da própria campanha, inclusive DIRECT.
- [ ] Narrador responde como NPC ou outro personagem, com auditoria da identidade real.
- [ ] Nenhum jogador pode falar como outro personagem.
- [ ] O conteúdo persiste sem sessão ativa.
- [ ] O SMS não se confunde nem substitui o chat temporário LiveKit.
- [ ] A Coterie recebe somente seus membros destinatários no instante do envio.
- [ ] Novos membros não ganham acesso retroativo.
- [ ] Autorizações e entregas são impostas no servidor e no banco.
- [ ] Indicadores de leitura/não lidas funcionam por personagem destinatário.
- [ ] A Gestão da Mesa substitui o placeholder “Mensagens da Mesa”.
- [ ] Hub permanente e Hub de sessão do jogador compartilham serviço e permissões.
- [ ] Testes de segurança, build, lint e TypeScript aprovados.
- [ ] A interface informa que o Narrador tem acesso integral às mensagens.
- [ ] Sem mensagens, identidades e destinatários fictícios criados automaticamente.

## 16. Fontes internas e decisões

**Base do código:** `app/campaigns/[id]/page.tsx` já contém o item “Mensagens da Mesa”, mas o conteúdo é placeholder e declara não haver domínio persistente; `components/player-campaigns/player-campaign-portal.tsx` é o Hub permanente; `components/game-session/session-player-workspace.tsx` é o Hub durante a sessão; `components/livekit/session-livekit-chat.tsx` é chat temporário separado.

**SPEC-SESSION-011:** entidades de Coterie, relação Campaign → N Coteries, membros e permissões Narrador/Jogador. Esta SPEC complementa, não implementa, o domínio da Coterie.

**Decisões específicas desta funcionalidade:** acesso integral do Narrador; atuação ficcional como NPC/outro personagem; leitura do Jogador apenas como destinatário direto ou da Coterie; histórico persistente e modelo SMS. Essas são regras do aplicativo definidas para a campanha, não regras oficiais de V5.
