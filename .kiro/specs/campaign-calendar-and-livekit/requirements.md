# Requisitos: Calendário de Eventos e LiveKit

## Visão Geral

Implementar dois sistemas de calendário para mesas de Vampire the Masquerade: (1) Calendário de marcação de mesa para agendamento de sessões com todos os participantes, e (2) Calendário de eventos da mesa para o mestre organizar eventos da campanha. Ambos devem ser habilitáveis/desabilitáveis sem perda de dados. Além disso, planejar integração do LiveKit como mesa virtual.

---

## 1. Background

### Problema atual

- Apenas existe um calendário de disponibilidade (`DateAvailabilityCalendar`) que permite jogadores e mestre indicarem disponibilidade para datas.
- Não há forma de o mestre planejar eventos da campanha (como festas, missões, reuniões importantes) com visibilidade seletiva.
- Não existe uma forma de mesa virtual com link único por mesa.

### Objetivos

1. Permitir habilitar/desabilitar o calendário de marcação de mesa na criação da mesa (opcional).
2. Criar calendário de eventos para o mestre organizar a campanha com eventos (data, hora, descrição) e visibilidade seletiva.
3. Ambos os calendários devem preservar dados ao serem desabilitados e reabilitados.
4. Planejar implementação de LiveKit para mesa virtual (link único por mesa, mestre como host).

---

## 2. User Stories

### Calendário de Marcação de Mesa

1. Como mestre, quero poder habilitar ou desabilitar o calendário de marcação de mesa ao criar uma nova mesa, para controlar se os jogadores podem marcar disponibilidade.

2. Como mestre, quero poder habilitar/desabilitar o calendário de marcação de mesa em qualquer momento, sem perder as marcações existentes, para adaptar a funcionalidade conforme necessário.

### Calendário de Eventos

3. Como mestre, quero poder criar eventos da campanha (data, hora, descrição), para organizar o planejamento da crônica.

4. Como mestre, quero poder definir a visibilidade de cada evento (apenas para mim ou compartilhado com todos da mesa), para controlar o nível de detalhe compartilhado.

5. Como mestre, quero poder selecionar um ano para visualizar os eventos, para organizar a timeline da campanha.

6. Como mestre, quero poder habilitar/desabilitar o calendário de eventos em qualquer momento, sem perder os eventos criados, para controlar se os jogadores veem esses eventos.

### LiveKit (Planejamento)

7. Como mestre, quero um link único para cada mesa, para meus jogadores entrarem na mesa virtual.

8. Como mestre, quero ser o host da chamada (poder controlar entrada de participantes), para manter organização da sessão.

---

## 3. Requisitos Funcionais

### 3.1. Calendário de Marcação de Mesa

| ID | Requisito | Descrição |
|----|-----------|-----------|
| RF01 | Habilitação na criação | Ao criar uma mesa, o formulário deve perguntar se o mestre deseja habilitar o calendário de marcação. |
| RF02 | Toggle de ativação | Deve existir uma opção no painel da mesa para ligar/desligar o calendário de marcação. |
| RF03 | Preservação de dados | Ao desabilitar, as marcações existentes devem ser mantidas no banco de dados. |
| RF04 | Reabilitação | Ao reabilitar, as marcações anteriores devem continuar visíveis. |
| RF05 | Modal de instruções | Ao habilitar pela primeira vez, mostrar um modal curto explicando como funciona o calendário. |

### 3.2. Calendário de Eventos

| ID | Requisito | Descrição |
|----|-----------|-----------|
| RF06 | Visualização por ano | O calendário de eventos deve permitir selecionar um ano para carregar os eventos. |
| RF07 | CRUD de eventos | O mestre pode criar, ler, atualizar e excluir eventos (data, hora, descrição). |
| RF08 | Visibilidade seletiva | Cada evento tem um campo para definir se é visível apenas para o mestre ou compartilhado com toda a mesa. |
| RF09 | Toggle de ativação | Deve existir uma opção no painel da mesa para ligar/desligar o calendário de eventos. |
| RF10 | Preservação de dados | Ao desabilitar, os eventos existentes devem ser mantidos no banco de dados. |
| RF11 | Reabilitação | Ao reabilitar, os eventos anteriores devem continuar visíveis. |

### 3.3. LiveKit (Planejamento)

| ID | Requisito | Descrição |
|----|-----------|-----------|
| RF12 | Link único por mesa | Cada mesa deve ter um link único para acesso à sala virtual. |
| RF13 | Mestre como host | O mestre deve ter permissões de host na sala (poder remover participantes, controlar o ambiente). |
| RF14 | Autenticação | Apenas participantes da mesa podem entrar na sala virtual. |

---

## 4. Requisitos Não-Funcionais

| ID | Requisito | Descrição |
|----|-----------|-----------|
| RNF01 | Timezone | Todo calendário deve usar `America/Sao_Paulo` como timezone. |
| RNF02 | Performance | Carregamento de eventos deve ser rápido (max 1s para carregar eventos de um ano). |
| RNF03 | Acessibilidade | Calendários devem seguir WCAG 2.1 nível AA (labels, keyboard navigation, contrast). |
| RNF04 | Segurança | Apenas mestres e participantes da mesa podem acessar os dados da mesa. |
| RNF05 | UI em PT-BR | Todo texto de interface deve estar em português do Brasil. |

---

## 5. Modelagem de Dados

### 5.1. Tabelas Existentes (Calendário de Marcação)

```sql
campaign_availability
-----------------------
id (uuid)
campaign_id (uuid)
user_id (uuid)
date (date)
status (text: 'disponível' | 'talvez' | 'indisponível')
suggested (boolean)
created_at (timestamp)
updated_at (timestamp)
```

### 5.2. Tabelas Existentes (Campanha)

```sql
campaigns
---------
id (uuid)
master_user_id (uuid)
name (text)
theme (text)
principios (text)
average_xp (integer)
status (text)
last_session_at (date)
session_start_time (time)
session_end_time (time)
created_at (timestamp)
updated_at (timestamp)
```

### 5.3. Novas Tabelas

#### 5.3.1. `campaign_event_calendars` (Toggle de ativação do calendário de eventos)

```sql
campaign_event_calendars
------------------------
campaign_id (uuid) PK
enabled (boolean)
created_at (timestamp)
updated_at (timestamp)
```

**Descrição:** Tabela de toggle para ativar/desativar o calendário de eventos por mesa. A chave estrangeira para `campaigns.id` garante unicidade.

#### 5.3.2. `campaign_events` (Eventos da campanha)

```sql
campaign_events
---------------
id (uuid)
campaign_id (uuid)
title (text)
description (text)
event_date (date)
event_time (time)
visibility (text: 'master' | 'everyone')
created_at (timestamp)
updated_at (timestamp)
```

**Descrição:** Armazena os eventos da campanha com data, hora, descrição e visibilidade. O campo `visibility` define se o evento é visível apenas para o mestre (`master`) ou compartilhado com toda a mesa (`everyone`).

#### 5.3.3. `campaign_scheduling_calendars` (Toggle de ativação do calendário de marcação)

```sql
campaign_scheduling_calendars
-----------------------------
campaign_id (uuid) PK
enabled (boolean)
created_at (timestamp)
updated_at (timestamp)
```

**Descrição:** Tabela de toggle para ativar/desativar o calendário de marcação por mesa. A chave estrangeira para `campaigns.id` garante unicidade.

#### 5.3.4. `livekit_rooms` (Salas LiveKit por mesa)

```sql
livekit_rooms
-------------
campaign_id (uuid) PK
room_name (text)
room_url (text)
host_user_id (uuid)
created_at (timestamp)
updated_at (timestamp)
```

**Descrição:** Armazena as informações da sala LiveKit por mesa. `room_name` e `room_url` são gerados pelo sistema e `host_user_id` aponta para o mestre.

### 5.4. Migration Plan

As seguintes alterações devem ser adicionadas ao arquivo `lib/db.ts`, na função `ensureAllTables()`:

```sql
CREATE TABLE IF NOT EXISTS campaign_event_calendars (
  campaign_id UUID PRIMARY KEY REFERENCES campaigns(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaign_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  visibility TEXT NOT NULL CHECK (visibility IN ('master', 'everyone')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaign_scheduling_calendars (
  campaign_id UUID PRIMARY KEY REFERENCES campaigns(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS livekit_rooms (
  campaign_id UUID PRIMARY KEY REFERENCES campaigns(id) ON DELETE CASCADE,
  room_name TEXT NOT NULL,
  room_url TEXT NOT NULL,
  host_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 6. API Routes Planejadas

### 6.1. Calendário de Eventos

#### GET `/api/campaign-events/route.ts`

```typescript
export async function GET(request: Request) {
  // Query params: ?campaignId=xxx&year=2026
  // Autenticação: Apenas participantes da mesa
  // Response: { events: CampaignEvent[] }
}
```

**Descrição:** Carregar todos os eventos de uma mesa para um ano específico.

#### POST `/api/campaign-events/route.ts`

```typescript
export async function POST(request: Request) {
  // Body: { campaignId, title, description, eventDate, eventTime, visibility }
  // Autenticação: Apenas mestre da mesa
  // Response: { event: CampaignEvent }
}
```

**Descrição:** Criar um novo evento.

#### PATCH `/api/campaign-events/route.ts`

```typescript
export async function PATCH(request: Request) {
  // Body: { eventId, title?, description?, eventDate?, eventTime?, visibility? }
  // Autenticação: Apenas mestre da mesa
  // Response: { event: CampaignEvent }
}
```

**Descrição:** Atualizar um evento existente.

#### DELETE `/api/campaign-events/route.ts`

```typescript
export async function DELETE(request: Request) {
  // Body: { eventId }
  // Autenticação: Apenas mestre da mesa
  // Response: { ok: true }
}
```

**Descrição:** Excluir um evento.

### 6.2. Toggle de Calendário de Eventos

#### GET `/api/campaign-event-calendar/status/route.ts`

```typescript
export async function GET(request: Request) {
  // Query params: ?campaignId=xxx
  // Autenticação: Apenas participantes da mesa
  // Response: { enabled: boolean }
}
```

**Descrição:** Verificar se o calendário de eventos está habilitado.

#### PATCH `/api/campaign-event-calendar/toggle/route.ts`

```typescript
export async function PATCH(request: Request) {
  // Body: { campaignId, enabled }
  // Autenticação: Apenas mestre da mesa
  // Response: { enabled: boolean }
}
```

**Descrição:** Habilitar/desabilitar o calendário de eventos.

### 6.3. Toggle de Calendário de Marcação

#### GET `/api/campaign-scheduling-calendar/status/route.ts`

```typescript
export async function GET(request: Request) {
  // Query params: ?campaignId=xxx
  // Autenticação: Apenas participantes da mesa
  // Response: { enabled: boolean }
}
```

**Descrição:** Verificar se o calendário de marcação está habilitado.

#### PATCH `/api/campaign-scheduling-calendar/toggle/route.ts`

```typescript
export async function PATCH(request: Request) {
  // Body: { campaignId, enabled }
  // Autenticação: Apenas mestre da mesa
  // Response: { enabled: boolean }
}
```

**Descrição:** Habilitar/desabilitar o calendário de marcação.

### 6.4. LiveKit

#### GET `/api/livekit/room/route.ts`

```typescript
export async function GET(request: Request) {
  // Query params: ?campaignId=xxx
  // Autenticação: Apenas participantes da mesa
  // Response: { roomName, roomUrl, hostUserId }
}
```

**Descrição:** Obter o link da sala LiveKit da mesa.

#### POST `/api/livekit/room/route.ts`

```typescript
export async function POST(request: Request) {
  // Body: { campaignId }
  // Autenticação: Apenas mestre da mesa
  // Response: { roomName, roomUrl, hostUserId }
}
```

**Descrição:** Criar uma nova sala LiveKit para a mesa.

---

## 7. Fluxo de UI

### 7.1. Criação de Mesa (Com Calendário de Marcação)

1. Mestre acessa `/campaigns/new` e preenche os dados da mesa.
2. O formulário mostra um checkbox **"Habilitar calendário de marcação"** (checked por padrão).
3. Ao criar, o backend cria a mesa e uma entrada em `campaign_scheduling_calendars` com `enabled=true` (se marcado).
4. Se marcado, o frontend mostra um modal curto explicando o calendário de marcação (como funciona, como jogadores marcam disponibilidade).

### 7.2. Painel da Mesa (Toggle de Calendários)

- **Calendário de Marcação:**
  - No painel da mesa, mostrar um botão **"Calendário de marcação"** (com ícone de calendário).
  - Se habilitado, o botão mostra "Desabilitar" e o calendário aparece na página da mesa.
  - Se desabilitado, o botão mostra "Habilitar" e o calendário não aparece.

- **Calendário de Eventos:**
  - No painel da mesa, mostrar um botão **"Calendário de eventos"** (com ícone de eventos).
  - Se habilitado, o botão mostra "Desabilitar" e o calendário aparece na página da mesa.
  - Se desabilitado, o botão mostra "Habilitar" e o calendário não aparece.

### 7.3. Calendário de Eventos (Interface)

1. O mestre abre o calendário de eventos.
2. Exibe um seletor de ano (ex: dropdown ou botões anterior/próximo).
3. Ao selecionar um ano, carrega todos os eventos daquele ano.
4. Exibe uma lista de eventos com data, hora, descrição e indicador de visibilidade.
5. Botão **"Novo evento"** abre um modal para criar evento (data, hora, descrição, visibilidade).
6. Cada evento tem botões de editar e excluir.

### 7.4. LiveKit (Interface)

1. No painel da mesa, botão **"Mesa virtual"** (com ícone de videochamada).
2. Ao clicar, mostra o link da sala e botão **"Entrar como host"**.
3. Se a sala não existir, cria uma nova sala e gera o link.
4. O link é único por mesa e pode ser copiado/sharing.

---

## 8. Considerações de Segurança

- **Autenticação:** Todas as API routes devem verificar se o usuário é participante da mesa. O mestre tem permissões adicionais (CRUD de eventos, toggle de calendários).
- **Autorização:**
  - Apenas mestre pode criar/atualizar/excluir eventos.
  - Apenas mestre pode habilitar/desabilitar calendários.
  - Apenas mestre pode criar/gerenciar sala LiveKit.
- **Validação:**
  - Validar que `campaignId` existe.
  - Validar formatos de data (`YYYY-MM-DD`) e hora (`HH:MM`).
  - Validar `visibility` como 'master' ou 'everyone'.
- **SQL Injection:** Usar queries parametrizadas (já feito no código atual).
- **Timezone:** Utilizar `America/Sao_Paulo` para todas as operações de data/hora.

### 8.1. Utilização da Autorização Existente

O projeto já tem as seguintes funções em `lib/auth/authorization.ts` e `lib/campaigns.ts` que podem ser utilizadas:

- `isMaster(user)` - Verifica se o usuário é mestre
- `hasMasterAccess(user)` - Verifica se o usuário tem acesso como mestre (tem mesas ou é mestre global)
- `isUserInCampaign(campaignId, userId)` - Verifica se o usuário participa da mesa (já existe em `lib/availability.ts`)

---

## 9. Tasks Planejadas

### 9.1. Banco de Dados

1. [ ] Atualizar `lib/db.ts` com as 4 novas tabelas: `campaign_event_calendars`, `campaign_events`, `campaign_scheduling_calendars`, `livekit_rooms`.
2. [ ] Atualizar `lib/db.ts` com funções auxiliares para as novas tabelas.
3. [ ] Executar migration via `/api/migrate` e verificar se as tabelas foram criadas.

### 9.2. API Routes

4. [ ] Criar API route GET/POST/PATCH/DELETE `/api/campaign-events/route.ts`.
5. [ ] Criar API route GET/PATCH `/api/campaign-event-calendar/status/route.ts` e `/api/campaign-event-calendar/toggle/route.ts`.
6. [ ] Criar API route GET/PATCH `/api/campaign-scheduling-calendar/status/route.ts` e `/api/campaign-scheduling-calendar/toggle/route.ts`.
7. [ ] Criar API route GET/POST `/api/livekit/room/route.ts`.

### 9.3. Frontend (Calendário de Eventos)

8. [ ] Criar tipo TypeScript `CampaignEvent` em `lib/campaigns.ts` ou arquivo separado.
9. [ ] Criar componente `CampaignEventCalendar` (seletor de ano, lista de eventos, modal de CRUD).
10. [ ] Criar componente `CalendarYearSelector` (dropdown ou botões para selecionar ano).
11. [ ] Criar componente `EventFormModal` (formulario para criar/editar evento).
12. [ ] Criar componente `EventCard` (exibição individual de evento com indicador de visibilidade).

### 9.4. Frontend (Toggle de Calendários)

13. [ ] Atualizar página `/campaigns/[id]` para mostrar botões de toggle para os calendários.
14. [ ] Atualizar formulário `/campaigns/new` para incluir checkbox de calendário de marcação.
15. [ ] Criar função auxiliar `useCampaignToggle` para gerenciar estado dos toggles.

### 9.5. Frontend (LiveKit)

16. [ ] Instalar `@livekit/components-react` e `@livekit/components-styles` como dependências.
17. [ ] Criar componente `LiveKitRoomLink` (link da sala, botão de copiar, botão de entrar).
18. [ ] Criar componente `LiveKitRoom` para integrar com o SDK e criar sala.
19. [ ] Integrar com backend para criar/salvar sala LiveKit ao acessar mesa.

### 9.6. Modal de Instruções

20. [ ] Criar modal `SchedulingCalendarIntroModal` (explica como funciona o calendário de marcação).
21. [ ] Implementar lógica para mostrar o modal apenas na primeira vez que o calendário é habilitado.

### 9.7. Testing e Polimento

22. [ ] Testar todas as rotas API com postman/curl.
23. [ ] Testar UI completa (criação, toggles, CRUD de eventos).
24. [ ] Verificar acessibilidade (keyboard navigation, screen readers).
25. [ ] Ajustar performance se necessário (carregamento de eventos).

---

## 10. Estimativa de Esforço

| Tarefa | Estimativa |
|--------|-----------|
| Migrations e banco de dados | 45 min |
| API Routes (5 rotas) | 2.5h |
| Componentes Calendário de Eventos (4 componentes) | 4h |
| Toggle de Calendários (3 componentes) | 2h |
| LiveKit (2 componentes + SDK) | 2.5h |
| Modal de Instruções | 1h |
| Testing e polimento | 2h |
| **Total** | **14.5h** |

---

## 11. Priorização

### Fase 1 (MVP - Calendários Funcionais)

1. **Migrations e Banco de Dados**
   - Atualizar `lib/db.ts` com as 4 novas tabelas
   - Executar e testar migration
   
2. **API Routes Básicas**
   - GET/POST `/api/campaign-events` (listar e criar eventos)
   - GET/PATCH `/api/campaign-event-calendar/status` e `/toggle`
   - GET/PATCH `/api/campaign-scheduling-calendar/status` e `/toggle`

3. **Componentes Fundamentais**
   - `CampaignEventCalendar` (seletor de ano + lista simples)
   - `EventFormModal` (formulario básico)
   - Atualizar `/campaigns/new` com checkbox
   
4. **Toggle de Calendários**
   - Botões de toggle no painel da mesa
   - Lógica para mostrar/esconder calendários

### Fase 2 (Aprimoramentos de Calendário)

5. **Polimento de UI**
   - Modal de instruções
   - Design system completo (CSS Modules)
   - Acessibilidade (labels, keyboard navigation)

6. **Testing**
   - Testes manuais de todas as funcionalidades
   - Verificação de performance

### Fase 3 (LiveKit)

7. **Integração LiveKit**
   - Instalação de dependências
   - Componente `LiveKitRoomLink`
   - Backend para criar/salvar salas
   
8. **Teste Completo**
   - Testar fluxo completo: criar mesa → habilitar calendários → criar eventos → acessar mesa virtual

---

## 12. Decisões de Design

### 12.1. Estrutura de Dados

- **Separar toggles por calendário:** Cada calendário (marcação e eventos) tem sua própria tabela de toggle. Isso permite habilitar/desabilitar cada um independentemente.
- **Eventos com `event_date` e `event_time` separados:** Isso permite filtrar por data e hora separadamente no futuro, e facilita validação.
- **Visibilidade com texto simples:** 'master' | 'everyone' é mais simples que usar boolean, e escala melhor se no futuro quisermos adicionar mais níveis (ex: 'players' | 'master').

### 12.2. Interface do Usuário

- **Botões de toggle no painel da mesa:** Não usar settings separado, para facilitar o acesso rápido.
- **Modal de CRUD de eventos:** Não usar modais aninhados, cada modal tem foco único (criar ou editar).
- **Ano como parâmetro de query:** Não usar estado global, para permitir compartilhamento direto de URL com ano específico.

### 12.3. LiveKit

- **Link único por mesa:** Usar `room_name` único (ex: `campanha-{campaignId}`) para evitar conflitos.
- **Mestre como host:** O host é definido na criação da sala e nunca muda (o mestre é o dono da campanha).
- **Salas permanentes:** A sala existe enquanto a campanha existir, não é criada/deletada a cada sessão.

---

## 13. Próximos Passos

1. **Revisão de Requisitos:** Validar com o time se todos os casos de uso estão cobertos.
2. **Planejamento de Task:** Dividir tasks em PRs menores (ex: um PR para migrations, outro para API routes, outro para frontend).
3. **Implementação:** Seguir priorização (Fase 1 → Fase 2 → Fase 3).
4. **Testing:** Testar manualmente cada funcionalidade antes de merge.
5. **Deploy:** Fazer deploy em staging first, validação, então production.
