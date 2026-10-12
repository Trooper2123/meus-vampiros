# Tasks: Calendário de Eventos e LiveKit

## Phases

### Phase 1: Database Migrations (4 tasks)

- [x] **task-001**: Atualizar `lib/db.ts` com as 4 novas tabelas
  - **Description**: Adicionar as tabelas `campaign_event_calendars`, `campaign_events`, `campaign_scheduling_calendars` e `livekit_rooms` à função `ensureAllTables()` em `lib/db.ts`, seguindo o schema do design document.
  - **Dependencies**: none
  - **Status**: completed

- [x] **task-002**: Atualizar `lib/db.ts` com funções auxiliares para as novas tabelas
  - **Description**: Criar funções auxiliares para operações CRUD das novas tabelas: `getCampaignEventCalendarStatus`, `toggleCampaignEventCalendar`, `getCampaignSchedulingCalendarStatus`, `toggleCampaignSchedulingCalendar`, `createCampaignEvent`, `getCampaignEventsByYear`, `updateCampaignEvent`, `deleteCampaignEvent`, `getLiveKitRoom`, `createLiveKitRoom`.
  - **Dependencies**: task-001
  - **Status**: completed

- [x] **task-003**: Executar migration e verificar tabelas
  - **Description**: Executar a migration via `/api/migrate` e verificar se as 4 tabelas foram criadas corretamente no banco de dados.
  - **Dependencies**: task-002
  - **Status**: completed

- [x] **task-004**: Atualizar API `/api/campaigns/route.ts` para criar toggle de calendário de marcação
  - **Description**: Atualizar a rota de criação de campanhas para inserir registro em `campaign_scheduling_calendars` ao criar nova mesa (com valor padrão do checkbox do formulário).
  - **Dependencies**: task-002
  - **Status**: completed

### Phase 2: API Routes (10 tasks)

- [x] **task-005**: Criar API route GET/POST/PATCH/DELETE `/api/campaign-events/route.ts`
  - **Description**: Implementar todas as operações CRUD para eventos da campanha: GET para listar por ano, POST para criar, PATCH para atualizar, DELETE para excluir. Implementar validação, autenticação e autorização (apenas mestre para POST/PATCH/DELETE).
  - **Dependencies**: task-002
  - **Status**: completed

- [x] **task-006**: Criar API route GET/PATCH `/api/campaign-event-calendar/status/route.ts`
  - **Description**: Implementar endpoint para verificar status de habilitação do calendário de eventos. GET deve retornar `enabled: boolean` e handle caso não exista registro (retornar false). Implementar autorização (apenas participantes da mesa).
  - **Dependencies**: task-002
  - **Status**: completed

- [x] **task-007**: Criar API route PATCH `/api/campaign-event-calendar/toggle/route.ts`
  - **Description**: Implementar endpoint para habilitar/desabilitar o calendário de eventos. Usar `INSERT ... ON CONFLICT` para garantir unicidade e evitar race conditions. Implementar autorização (apenas mestre).
  - **Dependencies**: task-002
  - **Status**: completed

- [x] **task-008**: Criar API route GET/PATCH `/api/campaign-scheduling-calendar/status/route.ts`
  - **Description**: Implementar endpoint para verificar status de habilitação do calendário de marcação. Seguir mesmo padrão do task-006 (GET para status).
  - **Dependencies**: task-002
  - **Status**: completed

- [x] **task-009**: Criar API route PATCH `/api/campaign-scheduling-calendar/toggle/route.ts`
  - **Description**: Implementar endpoint para habilitar/desabilitar o calendário de marcação. Seguir mesmo padrão do task-007 (PATCH para toggle).
  - **Dependencies**: task-002
  - **Status**: completed

- [~] **task-010**: Criar API route GET `/api/livekit/room/route.ts`
  - **Description**: Implementar endpoint GET para obter informações da sala LiveKit (roomName, roomUrl, hostUserId, isHost). Criar sala se não existir e o usuário for mestre. Implementar autorização (apenas participantes da mesa).
  - **Dependencies**: task-015, task-002
  - **Status**: not_started

- [~] **task-011**: Criar API route POST `/api/livekit/room/route.ts`
  - **Description**: Implementar endpoint POST para criar uma nova sala LiveKit. Gerar `room_name` único (`campanha-{campaignId}`), salvar em `livekit_rooms` com `host_user_id` do mestre, e gerar `room_url`. Implementar autorização (apenas mestre).
  - **Dependencies**: task-015, task-002
  - **Status**: not_started

- [~] **task-012**: Criar utilitário `lib/livekit.ts` para geração de tokens
  - **Description**: Implementar função `generateLiveKitToken` que usa `@livekit/components-core` para gerar JWT tokens com identity do usuário e room name apropriado. Implementar validação de env vars e tratamento de erros.
  - **Dependencies**: task-015
  - **Status**: not_started

- [~] **task-013**: Atualizar `lib/auth/authorization.ts` com função para verificar se usuário é host da LiveKit room
  - **Description**: Criar função `isLiveKitHost` que verifica se o usuário é o host da sala LiveKit de uma campanha. Reutilizar lógica existente de autorização.
  - **Dependencies**: task-002
  - **Status**: not_started

- [~] **task-014**: Testar todas as API routes
  - **Description**: Testar cada endpoint manualmente com curl/postman para validar: autenticação, autorização, validação de inputs, respostas corretas, e tratamento de erros.
  - **Dependencies**: task-005, task-006, task-007, task-008, task-009, task-010, task-011
  - **Status**: not_started

### Phase 3: Frontend Components (8 tasks)

- [x] **task-015**: Criar tipos TypeScript (`CampaignEvent`, `EventFormData`)
  - **Description**: Criar arquivo `lib/types/campaign-event.ts` com interfaces `CampaignEvent` e `EventFormData` seguindo o schema do banco de dados e validações do design.
  - **Dependencies**: none
  - **Status**: completed

- [~] **task-016**: Criar componente `VisibilityBadge`
  - **Description**: Criar componente `VisibilityBadge.tsx` que renderiza um badge com ícone e texto baseado no valor de `visibility` ('master': cadeado + "Apenas mestre", 'everyone': olho + "Todos participantes"). Usar design system e CSS Modules.
  - **Dependencies**: task-015
  - **Status**: not_started

- [~] **task-017**: Criar componente `CalendarYearSelector`
  - **Description**: Criar componente `CalendarYearSelector.tsx` com dropdown ou botões para seleção de ano. Deve permitir navegação relativa (anterior/próximo) e seleção direta de ano. Usar `America/Sao_Paulo` para todas as operações de data.
  - **Dependencies**: task-015
  - **Status**: not_started

- [~] **task-018**: Criar componente `EventFormModal`
  - **Description**: Criar componente `EventFormModal.tsx` com formulário completo para criar/editar eventos (title, description, eventDate, eventTime, visibility). Implementar validação client-side, loading state e tratamento de erros.
  - **Dependencies**: task-015, task-016
  - **Status**: not_started

- [~] **task-019**: Criar componente `EventCard`
  - **Description**: Criar componente `EventCard.tsx` para exibição individual de evento. Deve mostrar data, hora, título, descrição, badge de visibilidade, e botões de editar/excluir (apenas mestre). Usar `VisibilityBadge`.
  - **Dependencies**: task-015, task-016
  - **Status**: not_started

- [~] **task-020**: Criar componente `CampaignEventCalendar`
  - **Description**: Criar componente `CampaignEventCalendar.tsx` principal que integra o seletor de ano, lista de eventos, modal de CRUD e botão de criar. Gerenciar estado local, carregar eventos via API, e mostrar mensagem se desabilitado.
  - **Dependencies**: task-016, task-017, task-018, task-019
  - **Status**: not_started

- [~] **task-021**: Criar componente `CampaignCalendarToggle`
  - **Description**: Criar componente `CampaignCalendarToggle.tsx` para renderizar botão de toggle (habilitar/desabilitar) com estado atual e callback. Usar API routes para persistência e mostrar mensagem de sucesso/error.
  - **Dependencies**: task-006, task-007
  - **Status**: not_started

- [~] **task-022**: Criar componente `SchedulingCalendarIntroModal`
  - **Description**: Criar modal `SchedulingCalendarIntroModal.tsx` que explica como funciona o calendário de marcação (3 passos). Implementar lógica para não mostrar novamente após o usuário clicar em "Entendi" (persistência via localStorage).
  - **Dependencies**: none
  - **Status**: not_started

- [~] **task-023**: Criar componente `LiveKitRoomLink`
  - **Description**: Criar componente `LiveKitRoomLink.tsx` que exibe o link da sala LiveKit com botão de copiar e botão de entrar. Mostrar indicador se usuário é host e botões condicionais baseados no role.
  - **Dependencies**: task-015, task-010, task-011
  - **Status**: not_started

- [~] **task-024**: Criar componente `LiveKitRoom`
  - **Description**: Criar componente `LiveKitRoom.tsx` que integra com `@livekit/components-react` e renderiza o componente `<Room>`. Gerenciar estados de conexão, erros e aplicar estilos com `@livekit/components-styles`.
  - **Dependencies**: task-015, task-012
  - **Status**: not_started

### Phase 4: UI Updates (2 tasks)

- [~] **task-025**: Atualizar página `/campaigns/new/page.tsx`
  - **Description**: Adicionar checkbox "Habilitar calendário de marcação" no formulário de criação de mesa. Default: checked. Enviar `enableSchedulingCalendar` no body da API e mostrar modal de instruções após criação se marcado.
  - **Dependencies**: task-004, task-022
  - **Status**: not_started

- [~] **task-026**: Atualizar página `/campaigns/[id]/page.tsx`
  - **Description**: Integração completa dos novos componentes na página de detalhes da mesa: `CampaignEventCalendar`, `CampaignCalendarToggle` (scheduling), `LiveKitRoomLink`. Carregar status dos toggles em paralelo e renderizar condicionalmente.
  - **Dependencies**: task-020, task-021, task-023
  - **Status**: not_started

### Phase 5: LiveKit Integration (2 tasks)

- [~] **task-027**: Instalar dependências LiveKit SDK
  - **Description**: Instalar `@livekit/components-react` e `@livekit/components-styles` como dependências do projeto. Verificar compatibilidade com Next.js e ajustar configuração se necessário.
  - **Dependencies**: none
  - **Status**: not_started

- [~] **task-028**: Configurar variáveis de ambiente LiveKit
  - **Description**: Criar arquivo `.env.local.example` com variáveis `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`. Criar documentação no README.md explicando como configurar o LiveKit account e obter credentials.
  - **Dependencies**: task-027
  - **Status**: not_started

### Phase 6: Testing and Polish (3 tasks)

- [~] **task-029**: Testar funcionalidade completa (unit + integration)
  - **Description**: Criar testes unitários para funções auxiliares do banco de dados (CRUD de eventos, toggles, LiveKit). Criar testes de integração para fluxos principais: habilitar calendário → criar evento → toggle off/on → verificar persistência → criar sala LiveKit.
  - **Dependencies**: task-002, task-005, task-006, task-007, task-008, task-009, task-010, task-011, task-012
  - **Status**: not_started

- [~] **task-030**: Verificar acessibilidade e ajustar UI
  - **Description**: Revisar todos os componentes para garantir WCAG 2.1 nível AA: labels, keyboard navigation, contrast, screen reader support. Ajustar elementos de UI com base em feedback e best practices.
  - **Dependencies**: task-016, task-017, task-018, task-019, task-020, task-021, task-023, task-024
  - **Status**: not_started

- [~] **task-031**: Ajustar performance e polimento final
  - **Description**: Otimizar carregamento de eventos (indexes, queries), adicionar loading states e skeleton loaders, testar com diferentes quantidades de dados, garantir tempo de resposta < 1s. Executar `npm run lint` e `npm run build` para garantir sem erros.
  - **Dependencies**: task-029, task-030
  - **Status**: not_started

---

## Summary

| Phase | Tasks | Total |
|-------|-------|-------|
| Database | 001-004 | 4 |
| API Routes | 005-014 | 10 |
| Frontend Components | 015-024 | 10 |
| UI Updates | 025-026 | 2 |
| LiveKit Integration | 027-028 | 2 |
| Testing and Polish | 029-031 | 3 |
| **Total** | 001-031 | **31** |
