# SPEC — Trilha sonora sincronizada com YouTube no Modo Sessão

## Objetivo
Evoluir `SessionSoundtrack` (atualmente Web Audio original local) para oferecer fonte `AMBIENT` ou `YOUTUBE`, com controle exclusivo do Narrador e reprodução sincronizada para jogadores autorizados. Não usar áudio da chamada LiveKit como canal de distribuição de música.

## Permissões
- Narrador autorizado da sessão ativa: selecionar fonte, definir vídeo/playlist, iniciar, pausar, retomar, trocar faixa, avançar/voltar e posicionar a reprodução compartilhada.
- Jogador: **somente leitura** do estado da trilha. Controles locais de ativar áudio, volume e silenciar; nenhum comando de reprodução global.
- Autorização obrigatória no servidor, reaproveitando `getGameSession` e `assertGameSessionManager`. Não confiar no atributo `canManage` enviado pelo cliente.
- Trilha não deve expor conteúdo privado do Narrador nem alterar permissões de handouts ou da sessão.

## YouTube
- Usar **YouTube IFrame Player API** e player incorporado oficial; não baixar, extrair ou retransmitir o áudio, nem usar proxy para contornar restrições.
- Aceitar URLs `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/playlist?list=` e IDs válidos; normalizar para `videoId` e/ou `playlistId` no servidor. Rejeitar URLs arbitrárias, esquemas inseguros e parâmetros não reconhecidos.
- Vídeos indisponíveis, privados, bloqueados para incorporação ou região devem mostrar erro compreensível, sem impedir o restante da sessão.
- O navegador pode bloquear autoplay: oferecer ação explícita **Ativar áudio** a cada participante. Não prometer reprodução audível sem interação do usuário.
- Volume e mute individuais; os comandos globais não modificam volume pessoal.

## Estado persistido por sessão
Adicionar à `session_soundtrack_state`:
- `source`: `AMBIENT | YOUTUBE`
- `youtube_video_id`, `youtube_playlist_id` (opcionais; validados)
- `position_seconds` (não negativo)
- `started_at` como âncora temporal da posição ao iniciar/retomar
- `playing`, `mood` (para fonte AMBIENT), `revision`, `updated_by_user_id`, `updated_at`

A posição esperada é `position_seconds + (serverNow - started_at)` enquanto `playing=true`, limitada à duração conhecida do vídeo. Quando pausado, persistir a posição exata e limpar/ignorar a âncora. Troca de vídeo zera a posição salvo comando explícito.

## API
- `GET /api/sessions/[id]/soundtrack`: estado autorizado com fonte, identificadores, posição, âncora e revisão, mais `serverNow` para compensar diferença de relógios.
- `POST`: comandos discriminados `SELECT_SOURCE`, `LOAD_MEDIA`, `PLAY`, `PAUSE`, `SEEK`, `NEXT`, `PREVIOUS` e seleção de mood. Validar payload estritamente.
- Preservar idempotência por `idempotencyKey`, controle de concorrência por `expectedRevision` e transação atômica. Hash deve incluir tipo e parâmetros do comando.
- Proibir escrita de jogador (403), alterações em sessão encerrada (409), e dados inválidos (400).
- Evitar alteração incompatível silenciosa do endpoint atual; atualizar seus consumidores e testes na mesma entrega.

## Sincronização
- Manter SWR/polling como fallback inicial (até 5 s), com atualização imediata após comandos do Narrador. Evolução opcional para eventos em tempo real.
- Em cada cliente, reconciliar `videoId`, `playing`, `position` e `revision`. Corrigir drift somente acima de tolerância configurável (ex.: 2 s), evitando loops de `seekTo`.
- Participantes que entrarem após o início recebem mídia e posição atuais. Trocas e pausas do Narrador propagam-se a todos.
- Eventos locais do player dos jogadores **não** enviam comandos globais; fim de vídeo da playlist deve ser coordenado pelo estado do Narrador/servidor para evitar divergência.

## UI e responsividade
- Painel compacto e acessível no Hub do Narrador e do Jogador, sempre dentro da largura disponível; sem sobrepor chat, câmeras ou controles LiveKit.
- Narrador: seletor Ambiente/YouTube, URL/ID de vídeo ou playlist, estado, controles globais e erros.
- Jogador: nome da faixa e estado, player incorporado quando exigido pelo YouTube, botão de ativar áudio, volume e mute locais; sem controles de gestão global.
- Considerar regras de apresentação e controles obrigatórios do YouTube; não ocultar marca, anúncios ou links exigidos pelo player.
- Foco visível, rótulos acessíveis, botões com área de toque adequada, layout responsivo e estados de carregamento.

## Critérios de aceite
1. Apenas Narrador consegue alterar a trilha; POST de jogador retorna 403.
2. Jogadores recebem seleção, play/pause e seek do Narrador sem recarregar a página.
3. Entrada tardia inicia na posição sincronizada, respeitando restrições de autoplay.
4. Mute e volume de um participante não alteram o de outros.
5. Troca para AMBIENT interrompe corretamente o player YouTube; troca inversa encerra osciladores locais.
6. Falha ou bloqueio de embed apresenta mensagem e preserva chamada e chat.
7. Layout de ambas as funções permanece utilizável em desktop e mobile.
8. Testes de autorização, idempotência, revisão, validação de URL e sincronização passam em CI.

## Estado atual
Implementação inicial de playlists e vídeos no PR de integração. Validar a sincronização da transição entre faixas e autoplay em navegadores reais antes de publicar.
