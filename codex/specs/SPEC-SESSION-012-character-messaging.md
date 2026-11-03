# SPEC-SESSION-012 — Mensagens entre Personagens (SMS da Crônica)

**Status:** proposed · **Versão:** 1.0 · **Módulos:** Personagem / Campanha / Hub do Jogador / Gestão da Mesa
**Base:** develop · **Dependência funcional:** SPEC-SESSION-011 — Projetos dos Jogadores e Coterie
**Natureza:** funcionalidade do aplicativo; não é uma mecânica oficial de V5.

## 1. Objetivo

Criar um sistema persistente de mensagens *in character*, com aparência de SMS/mensageiro, independente de uma sessão estar iniciada. As mensagens são trocadas entre identidades de personagens da mesma campanha ou direcionadas à Coterie.

**Regras mandatórias:**
1. O **Narrador acessa todas as mensagens da sua campanha**, inclusive conversas privadas entre jogadores e conversas da Coterie, sem precisar ser destinatário.
2. O Narrador **envia e responde assumindo a identidade ficcional de NPCs ou de qualquer outro personagem pertencente à campanha**. A identidade real do operador permanece registrada, mesmo quando não exibida aos jogadores.
3. O **Jogador visualiza mensagens endereçadas a um de seus personagens autorizados ou à Coterie da qual esse personagem é destinatário, além das mensagens enviadas pelo Narrador assumindo a identidade de um personagem seu**. Essa autoria ficcional dá visibilidade **somente à mensagem escrita como seu personagem**, não a todo o histórico de uma conversa alheia.
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
| Ler mensagens diretas | Mensagens recebidas pelo próprio personagem, enviadas legitimamente por ele ou enviadas pelo Narrador como esse personagem | Todas |
| Ler mensagens de Coterie | Somente mensagens entregues ao seu personagem enquanto membro destinatário | Todas |
| Iniciar conversa direta | Como personagem próprio e autorizado, com destinatário visível e elegível | Como qualquer personagem elegível da campanha, inclusive NPC |
| Enviar à Coterie | Como seu personagem membro, para sua Coterie | Como personagem elegível, inclusive NPC, para qualquer Coterie da campanha |
| Responder como outro personagem | Proibido | Permitido; registrar operador real |
| Ver mensagens do Narrador como seu personagem | Permitido para o conteúdo dessas mensagens, inclusive respostas; sem acesso automático às demais mensagens da thread | Todas, com autoria técnica |
| Consultar auditoria de impersonação | Proibido | Permitido |
| Consultar conversa de outro jogador | Proibido | Permitido |
| Listar todas as Coteries | Somente Coteries a que o personagem pertence | Todas |
| Reabrir dados após sair da Coterie | Somente histórico já entregue antes da saída, conforme política abaixo | Todo o histórico |
| Apagar/editar mensagens entregues | Não permitido | Não permitido; eventual moderação futura deve gerar evento auditado |

**Privacidade narrativa:** avisar nas interfaces que o Narrador possui acesso integral, inclusive a conversas diretas. Não rotular essas mensagens como “secretas do Narrador”.

## 5. Elegibilidade e autorização

Acesso a uma campanha exige ser Narrador ou controlar personagem válido nela. O acesso ao sistema deve validar o status atual e a elegibilidade do personagem, não apenas user_id. A política inicial para participação ativa é PLAYER_VAMPIRE com status APPROVED e não removido, desabilitado ou arquivado. O Narrador pode usar NPCs pertencentes à campanha, desde que existam e não estejam excluídos.

- A consulta de envio deve confirmar campaign_id do emissor, campaign_id do destinatário, tipo e legitimidade de acesso. Jogador deve ser proprietário do próprio personagem; **o Narrador é exceção autorizada para enviar como outro personagem**. Não aceitar sender_actor_id, created_by_actor_id ou is_narrator enviados pelo cliente.
- Para o Narrador, permitir selecionar qualquer personagem da campanha em sua função de remetente, inclusive personagens dos jogadores; o servidor registra a atuação do Narrador.
- Jogadores podem selecionar somente um de seus próprios personagens APPROVED; para conversa direta, o destinatário deve ser um personagem da campanha permitido pelo catálogo de contatos visíveis. NPCs ocultos não podem ser descobertos por enumeração.
- O acesso ao histórico deve ser decidido por **entregas/visibilidade persistida por mensagem**, não por um filtro ingênuo de campaign_id ou pela participação atual em uma thread. Também deve existir uma entrega especial ao proprietário do personagem quando **o Narrador envia como esse personagem**, sem entregar automaticamente as outras mensagens da conversa.
- Caso um ator controle várias fichas da mesma campanha, as caixas de entrada podem ser agregadas por usuário **apenas** quando cada linha devolvida pertencer a uma de suas fichas. O envio sempre identifica explicitamente o personagem escolhido.
- Caso a pessoa também seja Narrador da campanha, a experiência em modo Jogador deve usar as permissões restritas do personagem selecionado; somente o endpoint/visão administrativa do Narrador expõe tudo. Nunca misturar os resultados em um mesmo payload.

### 5.1 Política de Coterie

**Destinatários de mensagem à Coterie são resolvidos e materializados no momento do envio.** Considerar membros com joined_at <= envio e left_at IS NULL ou left_at > envio, com personagem elegível na campanha. Cada mensagem cria registros de entrega para os membros incluídos naquele instante.

- Quem ingressar depois não recebe retroativamente mensagens anteriores.
- Quem sair mantém acesso somente às mensagens que foram entregues ao seu personagem, se sua ficha continuar acessível ao proprietário; não lê mensagens futuras.
- Se a campanha tiver múltiplas Coteries, selecionar explicitamente o coterie_id; **nunca expandir para todas as Coteries**.
- O jogador controlador do personagem remetente recebe sua cópia tanto quando envia pessoalmente quanto quando **o Narrador envia ou responde assumindo esse personagem**. A entrega do envio do Narrador deve ser explícita e restrita a essa mensagem, mesmo quando o personagem não é destinatário da conversa. Isso **não** concede ao jogador acesso às demais mensagens de outros participantes da thread.
- Mudanças futuras de grupo não devem recalcular destinatários de mensagens antigas.

**Dependência:** a SPEC-SESSION-011 descreve coterie_members, mas o schema operacional deve ser verificado antes da migração. Se o domínio da Coterie ainda não existir, não simular lista de membros por todas as fichas da campanha: habilitar inicialmente apenas DIRECT e apresentar COTERIE como indisponível até implantação da dependência.

## 6. Tipos e fluxos

### 6.1 Mensagem direta (DIRECT)

Fluxo:
1. Jogador escolhe um de seus personagens e um destinatário autorizado.
2. Digita a mensagem e confirma o envio.
3. Backend revalida autor, destinatário, campanha e thread.
4. Mensagem é persistida de forma transacional, com entrega ao destinatário e **cópia visível ao controlador do personagem remetente**; isso inclui mensagens cujo remetente ficcional foi assumido pelo Narrador.
5. Ambos veem a conversa. O Narrador vê a conversa em sua caixa global.
6. O Narrador pode responder como o destinatário original, um NPC ou outro personagem elegível, **sem falsificar quem executou a ação**.

**Identidade da thread:** não assumir que toda thread DIRECT tem sempre os mesmos dois interlocutores ao permitir respostas de terceiros pelo Narrador. A primeira entrega pode usar pares de personagens e permitir ao Narrador escolher uma thread já existente e responder nela; o modelo deve registrar o remetente ficcional e o ator autenticado de cada mensagem. Quando o Narrador inserir novo personagem em conversa de terceiros, exigir escolha explícita entre:
- **Participar da conversa existente:** nova mensagem visível apenas aos destinatários selecionados da mensagem, com indicação de novo participante; ou
- **Abrir outra conversa:** thread distinta com participantes elegíveis.

Na primeira entrega, a escolha mais segura é exigir **nova thread** ao mudar o conjunto de destinatários; o Narrador pode responder como outro personagem mantendo os destinatários originais. O controlador do personagem assumido pelo Narrador recebe **a mensagem enviada como seu personagem**, mas não ganha acesso a mensagens alheias da thread. Toda listagem de mensagens deve filtrar por visibilidade por mensagem, inclusive quando a thread já está na caixa de entrada.

### 6.2 Mensagem da Coterie (COTERIE)

A thread se vincula a campaign_id e coterie_id. Jogador membro pode enviar à própria Coterie; Narrador pode enviar por qualquer personagem legítimo da campanha. O backend materializa os destinatários conforme §5.1. Quem estiver fora da Coterie não obtém leitura por fazer parte da campanha.

### 6.3 Narrador atuando como personagem

- Seletor “Responder como” na Gestão da Mesa, com personagens válidos da campanha; distinguir NPC e personagem controlado por jogador.
- Não expor o Auth0 ID do Narrador para destinatários.
- Registrar impersonated_by_narrator = true e created_by_actor_id no evento/mensagem, acessível apenas à auditoria da Gestão da Mesa.
- Não permitir que o Narrador use este recurso para alterar a autoria de mensagens anteriores.
- A interface do Narrador exibe a identificação “Enviado como [personagem] · Operado pelo Narrador”.
- Quando ele fala como personagem de jogador, o jogador **pode ver e acompanhar o texto enviado/respondido como seu personagem**, inclusive se não for destinatário da thread original. O backend materializa uma cópia de visibilidade para o personagem assumido; **a visibilidade não se estende automaticamente às demais mensagens da thread**, de modo a preservar conversas alheias.

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
- Uso: fonte de verdade de **quem pode ler** e dos indicadores de leitura; inclui destinatários diretos, membros da Coterie e cópia ao personagem cuja identidade foi utilizada pelo Narrador como remetente.
- Em COTERIE, materializa cada personagem da Coterie no momento do envio.
- Acrescentar `delivery_reason TEXT CHECK ('DIRECT_RECIPIENT','COTERIE_MEMBER','SENDER_COPY','NARRATOR_AS_CHARACTER')` (ou tabela de direitos equivalente). Garantir unicidade por mensagem/personagem mesmo quando mais de uma razão se aplica. A entrega `NARRATOR_AS_CHARACTER` é gerada independentemente de o ator real controlar o personagem.

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
- GET/PATCH /api/campaigns/[id]/settings/character-sms (PATCH exclusivo do Narrador)

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
- Mensagens enviadas pelo Narrador como o personagem selecionado aparecem no histórico do jogador como **mensagens enviadas por seu personagem**, com horário e conteúdo, inclusive respostas do Narrador. A visibilidade não autoriza abrir mensagens de outros personagens na mesma conversa.

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

## 11.1 Configuração da campanha: SMS habilitado/desabilitado

A área de Configurações da Mesa (`/campaigns/[id]?view=settings`) deve incluir um controle do Narrador: **“Permitir mensagens entre personagens (SMS)”**.

- Campo persistente por campanha: `campaigns.character_sms_enabled BOOLEAN NOT NULL DEFAULT true` (ou tabela `campaign_settings` existente, se houver).
- Somente o Narrador proprietário da campanha pode consultar a configuração administrativa e alterá-la por endpoint protegido. O jogador pode consultar somente o estado efetivo `enabled`.
- A alteração vale para **todos os participantes daquela campanha**, seja a sessão iniciada ou não. Não altera o chat LiveKit de sessão.
- **Habilitado:** permitir criar threads e enviar mensagens conforme autorização.
- **Desabilitado:** bloquear novas threads e mensagens para **todos**, inclusive o Narrador atuando como personagem, com resposta 409 `SMS_DISABLED`; apresentar a aba Mensagens como **histórico somente leitura**, com aviso “Mensagens desativadas pelo Narrador” e controles de composição desabilitados.
- Ao desabilitar, **preservar o histórico, a auditoria e a visibilidade já concedida**. Jogadores seguem podendo consultar apenas mensagens previamente autorizadas, inclusive as enviadas pelo Narrador como seus personagens. O Narrador mantém acesso global ao histórico.
- Suspender badges de novas mensagens e avisos de recebimento enquanto desabilitado; não apagar `read_at` nem descartar dados. Ao reativar, as conversas continuam a partir do histórico, sem republicação ou duplicação de notificações anteriores.
- Validação no servidor deve ocorrer **dentro da transação do envio**, para evitar corrida entre desligamento e envio; checagem apenas no frontend é insuficiente.
- Registrar cada alteração de estado em auditoria (ator, campanha, estado anterior/novo, timestamp), sem registrar conteúdo das mensagens.
- Endpoint sugerido: `GET/PATCH /api/campaigns/[id]/settings/character-sms`; PATCH com `{ "enabled": boolean }`, proteção CSRF/origin e verificação de proprietário da campanha.

**A política de histórico somente leitura é o comportamento padrão adotado nesta SPEC.** Se houver necessidade narrativa de ocultar totalmente o arquivo, isso deverá ser uma configuração separada e explicitamente autorizada, não um efeito colateral de desabilitar o envio.

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
5. Implementar visão administrativa do Narrador e auditoria do envio como personagem, inclusive cópia visível ao jogador proprietário desse personagem.
5a. Adicionar configuração persistente de SMS no painel de Configurações do Narrador, enforcement transacional e modo somente leitura quando desabilitado.
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
| MSG-05 | Narrador envia ou responde como personagem de B | B visualiza **essa mensagem** como enviada pelo próprio personagem, sem acesso às demais mensagens de conversa alheia |
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
| MSG-21 | Mensagem do Narrador como personagem de jogador | O jogador vê essa mensagem, inclusive resposta, mas não as demais mensagens restritas da thread |
| MSG-22 | Paginação de thread e listagem global | Sem fuga de dados e ordem determinística |
| MSG-23 | Narrador envia mensagem como B em thread entre A e C | B vê somente essa mensagem; A/C veem o que lhes foi entregue; Narrador vê tudo |
| MSG-24 | Narrador desativa SMS com conversas existentes | GET de histórico continua autorizado; POST de thread/mensagem retorna 409 SMS_DISABLED para qualquer papel |
| MSG-25 | Jogador tenta alterar configuração SMS da campanha | 403; estado inalterado |
| MSG-26 | Narrador reativa SMS | Envio volta a funcionar, mantendo histórico e sem reenviar notificações antigas |
| MSG-27 | Narrador desativa SMS enquanto envio está em andamento | Transação serializa/valida o estado; nenhuma mensagem criada após desativação efetiva |
| MSG-28 | SMS desativado durante chamada LiveKit | Chat ao vivo permanece funcionando e independente |

## 15. Critérios de aceite

- [ ] Jogador vê mensagens entregues às próprias fichas ou Coterie **e mensagens enviadas pelo Narrador usando a identidade de uma ficha sua**, sem acesso às demais mensagens alheias.
- [ ] Narrador vê todas as mensagens da própria campanha, inclusive DIRECT.
- [ ] Narrador responde como NPC ou outro personagem, com auditoria da identidade real.
- [ ] Jogador vê cada mensagem que o Narrador enviou ou respondeu como seu personagem, mesmo sem ser destinatário original, sem acesso ao restante da conversa alheia.
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
- [ ] Narrador pode desativar e reativar SMS por campanha nas Configurações da Mesa.
- [ ] SMS desativado impede novos envios e threads, preservando histórico acessível em modo somente leitura.
- [ ] A restrição é verificada no backend, inclusive contra condições de corrida, sem afetar LiveKit.
- [ ] Sem mensagens, identidades e destinatários fictícios criados automaticamente.

## 16. Fontes internas e decisões

**Base do código:** `app/campaigns/[id]/page.tsx` já contém o item “Mensagens da Mesa”, mas o conteúdo é placeholder e declara não haver domínio persistente; `components/player-campaigns/player-campaign-portal.tsx` é o Hub permanente; `components/game-session/session-player-workspace.tsx` é o Hub durante a sessão; `components/livekit/session-livekit-chat.tsx` é chat temporário separado.

**SPEC-SESSION-011:** entidades de Coterie, relação Campaign → N Coteries, membros e permissões Narrador/Jogador. Esta SPEC complementa, não implementa, o domínio da Coterie.

**Decisões específicas desta funcionalidade:** acesso integral do Narrador; atuação ficcional como NPC/outro personagem; leitura do Jogador apenas como destinatário direto ou da Coterie; histórico persistente e modelo SMS. Essas são regras do aplicativo definidas para a campanha, não regras oficiais de V5.
