# Design: Calendário de Eventos e LiveKit

## Visão Geral

Este documento descreve o design técnico para a implementação dos calendários de marcação de mesa e de eventos da campanha, além do planejamento da integração LiveKit. O projeto segue as convenções do Next.js App Router, utiliza Auth0 para autenticação, PostgreSQL com Drizzle ORM para persistência, e CSS Modules para estilização.

---

## 1. Estrutura de Componentes

### 1.1. Componentes do Calendário de Eventos

#### `CampaignEventCalendar` (`components/campaign-event-calendar.tsx`)

**Props:**
```typescript
type CampaignEventCalendarProps = {
  campaignId: string
  master: boolean
  enabled: boolean
  onToggle: (enabled: boolean) => void
}
```

**Responsabilidades:**
- Renderizar o seletor de ano (dropdown ou botões anterior/próximo)
- Carregar e exibir lista de eventos do ano selecionado
- Mostrar botão para criar novo evento (apenas mestre)
- Gerenciar estado do modal de CRUD de eventos
- Exibir mensagem se o calendário estiver desabilitado

**Estrutura interna:**
- `yearSelector` state para armazenar o ano selecionado
- `events` state para armazenar os eventos carregados
- `isModalOpen` state para controle do modal de CRUD
- `selectedEvent` state para edição (opcional)

#### `CalendarYearSelector` (`components/calendar-year-selector.tsx`)

**Props:**
```typescript
type CalendarYearSelectorProps = {
  currentYear: number
  onSelectYear: (year: number) => void
}
```

**Responsabilidades:**
- Renderizar dropdown ou botões de navegação entre anos
- Permitir seleção de ano específico ou navegação relativa (anterior/próximo)
- Usar `America/Sao_Paulo` para todas as operações de data

#### `EventFormModal` (`components/event-form-modal.tsx`)

**Props:**
```typescript
type EventFormModalProps = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: EventFormData) => Promise<void>
  initialData?: EventFormData
  isEdit?: boolean
}
```

**Form Fields:**
- `title`: text (required, max 100 chars)
- `description`: textarea (optional, max 1000 chars)
- `eventDate`: date input (required)
- `eventTime`: time input (optional)
- `visibility`: select (required, options: 'master', 'everyone')

**Responsabilidades:**
- Validar inputs client-side antes de enviar
- Tratar loading state durante submissão
- Fechar modal após sucesso

#### `EventCard` (`components/event-card.tsx`)

**Props:**
```typescript
type EventCardProps = {
  event: CampaignEvent
  master: boolean
  onEdit?: (event: CampaignEvent) => void
  onDelete?: (event: CampaignEvent) => void
}
```

**Responsabilidades:**
- Exibir data, hora, título e descrição
- Mostrar badge de visibilidade (`VisibilityBadge`)
- Renderizar botões de editar/excluir apenas para mestre
- Usar `VisibilityBadge` para indicar se o evento é visível para todos ou apenas mestre

#### `VisibilityBadge` (`components/visibility-badge.tsx`)

**Props:**
```typescript
type VisibilityBadgeProps = {
  visibility: 'master' | 'everyone'
}
```

**Responsabilidades:**
- Renderizar badge com texto e ícone correspondente
- 'master': ícone de cadeado, texto "Apenas mestre"
- 'everyone': ícone de olho, texto "Todos participantes"

### 1.2. Componentes do Toggle de Calendários

#### `CampaignCalendarToggle` (`components/campaign-calendar-toggle.tsx`)

**Props:**
```typescript
type CampaignCalendarToggleProps = {
  campaignId: string
  type: 'scheduling' | 'event'
  label: string
  enabled: boolean
  onToggle: (enabled: boolean) => void
  onEnableIntro?: () => void
}
```

**Responsabilidades:**
- Renderizar botão com estado atual (habilitado/desabilitado)
- Executar toggle quando clicado
- Disparar callback para mostrar modal de instruções ao habilitar pela primeira vez

#### `SchedulingCalendarIntroModal` (`components/scheduling-calendar-intro-modal.tsx`)

**Props:**
```typescript
type SchedulingCalendarIntroModalProps = {
  isOpen: boolean
  onClose: () => void
}
```

**Responsabilidades:**
- Explicar como funciona o calendário de marcação
- Mostrar fluxo: mestre habilita → jogadores marcam disponibilidade → mestre vê resumo
- Botão "Entendi" para fechar
- Não mostrar novamente após habilitado (persistência via localStorage)

### 1.3. Componentes LiveKit

#### `LiveKitRoomLink` (`components/livekit-room-link.tsx`)

**Props:**
```typescript
type LiveKitRoomLinkProps = {
  campaignId: string
  roomUrl: string
  master: boolean
}
```

**Responsabilidades:**
- Exibir link da sala como texto
- Botão "Copiar link"
- Botão "Entrar como host" (apenas mestre) ou "Entrar na sala" (jogadores)
- Mostrar indicador se o usuário é o host

#### `LiveKitRoom` (`components/livekit-room.tsx`)

**Props:**
```typescript
type LiveKitRoomProps = {
  campaignId: string
  roomName: string
  token: string
  master: boolean
}
```

**Responsabilidades:**
- Integrar com `@livekit/components-react`
- Renderizar o componente `<Room>` com configuração adequada
- Aplicar estilos com `@livekit/components-styles`
- Manipular estados de conexão e erros

---

## 2. API Route Specifications

### 2.1. Calendário de Eventos

#### `GET /api/campaign-events`

**Query Params:**
- `campaignId` (required): string (UUID)
- `year` (required): number

**Headers:**
- Authorization: Bearer token (JWT do Auth0)

**Response (200 OK):**
```json
{
  "events": [
    {
      "id": "uuid",
      "campaignId": "uuid",
      "title": "Festa na noite",
      "description": "Celebração de 100 anos do coven",
      "eventDate": "2026-03-15",
      "eventTime": "20:00",
      "visibility": "everyone",
      "createdAt": "2026-01-15T10:30:00.000Z"
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized`: Usuário não autenticado
- `403 Forbidden`: Usuário não é participante da mesa
- `400 Bad Request`: Parâmetros inválidos (missing campaignId/year, year formato inválido)

**Authorization:**
- Usuário deve ser participante da mesa (verificado via `isUserInCampaign`)

**Implementation Notes:**
- Usar query param para `year` (não query string inteira)
- Converter year para string para SQL query
- Retornar eventos ordenados por `event_date ASC, event_time ASC`

#### `POST /api/campaign-events`

**Body:**
```json
{
  "campaignId": "uuid",
  "title": "string",
  "description": "string | null",
  "eventDate": "YYYY-MM-DD",
  "eventTime": "HH:MM | null",
  "visibility": "master | everyone"
}
```

**Response (201 Created):**
```json
{
  "event": { /* created event object */ }
}
```

**Error Responses:**
- `401 Unauthorized`: Usuário não autenticado
- `403 Forbidden`: Usuário não é mestre da mesa
- `400 Bad Request`: Validação falhou (falta title/eventDate, formato inválido, visibility inválido)

**Authorization:**
- Apenas mestre da mesa pode criar eventos

**Validation:**
- `campaignId`: UUID format
- `title`: string não vazia, max 100 chars
- `description`: string max 1000 chars (opcional)
- `eventDate`: YYYY-MM-DD format
- `eventTime`: HH:MM format (opcional)
- `visibility`: 'master' ou 'everyone'

#### `PATCH /api/campaign-events`

**Body:**
```json
{
  "eventId": "uuid",
  "title": "string | null",
  "description": "string | null",
  "eventDate": "YYYY-MM-DD | null",
  "eventTime": "HH:MM | null",
  "visibility": "master | everyone | null"
}
```

**Response (200 OK):**
```json
{
  "event": { /* updated event object */ }
}
```

**Error Responses:**
- `401 Unauthorized`: Usuário não autenticado
- `403 Forbidden`: Usuário não é mestre da mesa
- `404 Not Found`: Evento não encontrado
- `400 Bad Request`: Validação falhou

**Authorization:**
- Apenas mestre da mesa pode atualizar eventos

**Implementation Notes:**
- Usar SQL `UPDATE ... SET ... WHERE id = $1 AND campaign_id = $2`
- Retornar evento atualizado

#### `DELETE /api/campaign-events`

**Body:**
```json
{
  "eventId": "uuid"
}
```

**Response (200 OK):**
```json
{
  "ok": true
}
```

**Error Responses:**
- `401 Unauthorized`: Usuário não autenticado
- `403 Forbidden`: Usuário não é mestre da mesa
- `404 Not Found`: Evento não encontrado

**Authorization:**
- Apenas mestre da mesa pode excluir eventos

### 2.2. Toggle de Calendário de Eventos

#### `GET /api/campaign-event-calendar/status`

**Query Params:**
- `campaignId` (required): string (UUID)

**Response (200 OK):**
```json
{
  "enabled": true
}
```

**Error Responses:**
- `401 Unauthorized`: Usuário não autenticado
- `403 Forbidden`: Usuário não é participante da mesa
- `404 Not Found`: Campanha não existe

**Authorization:**
- Usuário deve ser participante da mesa

**Implementation Notes:**
- Se não existir registro em `campaign_event_calendars`, retornar `enabled: false`
- Usar `ON CONFLICT DO NOTHING` ao inserir registro padrão

#### `PATCH /api/campaign-event-calendar/toggle`

**Body:**
```json
{
  "campaignId": "uuid",
  "enabled": true
}
```

**Response (200 OK):**
```json
{
  "enabled": true
}
```

**Error Responses:**
- `401 Unauthorized`: Usuário não autenticado
- `403 Forbidden`: Usuário não é mestre da mesa
- `400 Bad Request`: Parâmetros inválidos

**Authorization:**
- Apenas mestre da mesa pode togglear o calendário

**Implementation Notes:**
- Usar `INSERT INTO ... ON CONFLICT (campaign_id) DO UPDATE SET enabled = EXCLUDED.enabled`
- Retornar novo valor de `enabled`

### 2.3. Toggle de Calendário de Marcação

#### `GET /api/campaign-scheduling-calendar/status`

**Query Params:**
- `campaignId` (required): string (UUID)

**Response (200 OK):**
```json
{
  "enabled": true
}
```

**Error Responses:**
- `401 Unauthorized`: Usuário não autenticado
- `403 Forbidden`: Usuário não é participante da mesa
- `404 Not Found`: Campanha não existe

**Authorization:**
- Usuário deve ser participante da mesa

#### `PATCH /api/campaign-scheduling-calendar/toggle`

**Body:**
```json
{
  "campaignId": "uuid",
  "enabled": true
}
```

**Response (200 OK):**
```json
{
  "enabled": true
}
```

**Error Responses:**
- `401 Unauthorized`: Usuário não autenticado
- `403 Forbidden`: Usuário não é mestre da mesa
- `400 Bad Request`: Parâmetros inválidos

**Authorization:**
- Apenas mestre da mesa pode togglear o calendário

### 2.4. LiveKit

#### `GET /api/livekit/room`

**Query Params:**
- `campaignId` (required): string (UUID)

**Response (200 OK):**
```json
{
  "roomName": "campanha-uuid",
  "roomUrl": "https://your-project.livekit.cloud?room=campanha-uuid",
  "hostUserId": "auth0|123456",
  "isHost": true
}
```

**Error Responses:**
- `401 Unauthorized`: Usuário não autenticado
- `403 Forbidden`: Usuário não é participante da mesa
- `404 Not Found`: Sala não existe (ou campanha não existe)

**Authorization:**
- Usuário deve ser participante da mesa

**Implementation Notes:**
- Se não existir sala, criar uma nova (ver POST)
- Gerar URL com room name e Auth0 token do usuário
- Retornar `isHost` baseado no `hostUserId`

#### `POST /api/livekit/room`

**Body:**
```json
{
  "campaignId": "uuid"
}
```

**Response (201 Created):**
```json
{
  "roomName": "campanha-uuid",
  "roomUrl": "https://your-project.livekit.cloud?room=campanha-uuid",
  "hostUserId": "auth0|123456"
}
```

**Error Responses:**
- `401 Unauthorized`: Usuário não autenticado
- `403 Forbidden`: Usuário não é mestre da mesa
- `400 Bad Request`: Parâmetros inválidos
- `409 Conflict`: Sala já existe para esta campanha

**Authorization:**
- Apenas mestre da mesa pode criar sala

**Implementation Notes:**
- Gerar `roomName` único (ex: `campanha-{campaignId}`)
- Salvar em `livekit_rooms` com `hostUserId = master_user_id`
- Gerar `roomUrl` com base no LiveKit config (host, project name, room name)
- O LiveKit SDK deve ser configurado nas variáveis de ambiente

---

## 3. Database Schema Details

### 3.1. Nova Tabela: `campaign_event_calendars`

```sql
CREATE TABLE IF NOT EXISTS campaign_event_calendars (
  campaign_id UUID PRIMARY KEY REFERENCES campaigns(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- PK: `campaign_id` (UUID)

**FK:**
- `campaign_id` → `campaigns(id)`

**Purpose:**
- Toggle para ativar/desativar calendário de eventos
- Existe uma linha por campanha (PK garante unicidade)

### 3.2. Nova Tabela: `campaign_events`

```sql
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
```

**Indexes:**
- PK: `id` (UUID)
- Composite: `(campaign_id, event_date)` para queries por campanha e data

**FK:**
- `campaign_id` → `campaigns(id)`

**Constraints:**
- `title`: NOT NULL (required)
- `event_date`: NOT NULL (required)
- `visibility`: CHECK constraint para 'master' ou 'everyone'

**Purpose:**
- Armazenar eventos da campanha com data, hora, descrição e visibilidade

### 3.3. Nova Tabela: `campaign_scheduling_calendars`

```sql
CREATE TABLE IF NOT EXISTS campaign_scheduling_calendars (
  campaign_id UUID PRIMARY KEY REFERENCES campaigns(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- PK: `campaign_id` (UUID)

**FK:**
- `campaign_id` → `campaigns(id)`

**Purpose:**
- Toggle para ativar/desativar calendário de marcação
- Permite habilitar/desabilitar independentemente do calendário de eventos

### 3.4. Nova Tabela: `livekit_rooms`

```sql
CREATE TABLE IF NOT EXISTS livekit_rooms (
  campaign_id UUID PRIMARY KEY REFERENCES campaigns(id) ON DELETE CASCADE,
  room_name TEXT NOT NULL,
  room_url TEXT NOT NULL,
  host_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- PK: `campaign_id` (UUID)

**FK:**
- `campaign_id` → `campaigns(id)`

**Purpose:**
- Armazenar informações da sala LiveKit por mesa
- `host_user_id` guarda o ID do mestre (Auth0 sub)

### 3.5. Migration Plan

Adicionar ao arquivo `lib/db.ts`, na função `ensureAllTables()`:

```sql
-- Calendário de eventos (toggle)
CREATE TABLE IF NOT EXISTS campaign_event_calendars (
  campaign_id UUID PRIMARY KEY REFERENCES campaigns(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Eventos da campanha
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

-- Calendário de marcação (toggle)
CREATE TABLE IF NOT EXISTS campaign_scheduling_calendars (
  campaign_id UUID PRIMARY KEY REFERENCES campaigns(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Salas LiveKit
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

## 4. State Management Approach

### 4.1. Calendário de Eventos

**Component State (React Hook State):**
```typescript
const [year, setYear] = useState(new Date().getFullYear())
const [events, setEvents] = useState<CampaignEvent[]>([])
const [isModalOpen, setIsModalOpen] = useState(false)
const [selectedEvent, setSelectedEvent] = useState<CampaignEvent | null>(null)
const [loading, setLoading] = useState(false)
```

**SWR / React Query:**
- Usar `useSWR` para carregar eventos por ano
- Key: `/api/campaign-events?campaignId=${campaignId}&year=${year}`
- Revalidate on focus, revalidate on reconnect

**Server Actions (Next.js 14+):**
- Para operações de mutate (POST/PATCH/DELETE), usar server actions
- Exemplo: `useTransition` com `await fetch('/api/campaign-events', {...})`

### 4.2. Toggle de Calendários

**Component State:**
```typescript
const [enabled, setEnabled] = useState(false)
const [isLoading, setIsLoading] = useState(false)
```

**Optimistic Updates:**
- Atualizar estado local antes de resposta do servidor
- Rollback em caso de erro

**Persistence:**
- Estado persistido no banco (não localStorage)
- Carregar ao montar componente via `useEffect` + `fetch`

### 4.3. LiveKit Room

**Component State:**
```typescript
const [room, setRoom] = useState<LiveKitRoom | null>(null)
const [isHost, setIsHost] = useState(false)
const [token, setToken] = useState<string | null>(null)
const [isLoading, setIsLoading] = useState(false)
```

**LiveKit SDK Integration:**
- Usar `@livekit/components-react` para `<Room>` componente
- Gerar token no backend (JWT com identity = userId)
- Conectar com `new Room({ serverUrl, token })`

---

## 5. UI Wireframes (Text-Based)

### 5.1. Calendário de Eventos (Página da Mesa)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Crônicas / gerenciamento                    Voltar às mesas  Sair │
├─────────────────────────────────────────────────────────────────────┤
│  Ficha da mesa                                                      │
│  Nome da Campanha · 3 jogadores vinculados                         │
├─────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Próximo encontro                                             │  │
│  │  Calendário de eventos                                        │  │
│  │  Organize os eventos da campanha.                             │  │
│  │                                                               │  │
│  │  [◀] 2026 [▶]                                                 │  │
│  │                                                               │  │
│  │  ┌─────────────────────────────────────────────────────────┐ │  │
│  │  │ 🔔 Festa na noite              🕐 20:00  👁️ Todos      │ │  │
│  │  │   Celebração de 100 anos do coven                         │ │  │
│  │  │                                      [edit] [delete]     │ │  │
│  │  │                                                           │ │  │
│  │  │ 🔒 Reunião secreta            (apenas mestre)           │ │  │
│  │  │   Discutir estratégia contra rival clã                  │ │  │
│  │  │                                      [edit] [delete]     │ │  │
│  │  └─────────────────────────────────────────────────────────┘ │  │
│  │                                                               │  │
│  │  [➕ Novo evento]                                            │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  [Toggle: Desabilitar calendário de eventos]                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2. Modal de Novo Evento

```
┌─────────────────────────────────────────────────────────────────────┐
│  Novo evento                                         [x]              │
├─────────────────────────────────────────────────────────────────────┤
│  Título                                                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Celebração de aniversário do coven                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Descrição                                                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Comemorar 100 anos desde a fundação do coven local.         │   │
│  │ Inclui jantar, apresentações e ritual noturno.             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Data                            Horário (opcional)                │
│  ┌──────────────┐              ┌──────────────┐                   │
│  │ 2026-03-15   │              │ 20:00        │                   │
│  └──────────────┘              └──────────────┘                   │
│                                                                     │
│  Visibilidade                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ▼ Todos participantes                                        │   │
│  │   Apenas mestre                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│              [Cancelar]              [Salvar evento]                │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.3. Toggle de Calendários (Painel da Mesa)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Calendário de disponibilidade              Toggle: Desabilitar    │
├─────────────────────────────────────────────────────────────────────┤
│  [📅 Calendário de eventos]              Toggle: Habilitar         │
│  [📅 Calendário de marcação]             Toggle: Desabilitar       │
│  [📹 Mesa virtual]                        Entrar na sala            │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.4. Modal de Instruções (Calendário de Marcação)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Calendário de marcação                              [x]            │
├─────────────────────────────────────────────────────────────────────┤
│  🔶 Como funciona                                                  │
│                                                                     │
│  1. Você habilita o calendário                                     │
│  2. Jogadores marcam disponibilidade                              │
│  3. Você vê o resumo e sugere datas                                │
│  4. Definido o horário, todos sabem quando é a sessão             │
│                                                                     │
│  Dados são preservidos se desabilitar e reabilitar.               │
│                                                                     │
│              [Entendi, entendi]                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Integration Points

### 6.1. Atualização de `/app/campaigns/[id]/page.tsx`

**Current:**
```typescript
import { DateAvailabilityCalendar } from '@/components/date-availability-calendar'

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // ...
  return (
    <div className="mt-8 flex flex-col gap-8">
      <DateAvailabilityCalendar campaignId={campaign.id} master />
      <CampaignPossessionsManager campaignId={campaign.id} />
    </div>
  )
}
```

**New:**
```typescript
import { DateAvailabilityCalendar } from '@/components/date-availability-calendar'
import { CampaignEventCalendar } from '@/components/campaign-event-calendar'
import { LiveKitRoomLink } from '@/components/livekit-room-link'

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // ...
  const [schedulingEnabled, eventCalendarEnabled] = await Promise.all([
    getCampaignSchedulingCalendarStatus(campaign.id),
    getCampaignEventCalendarStatus(campaign.id),
  ])
  
  return (
    <div className="mt-8 flex flex-col gap-8">
      <DateAvailabilityCalendar 
        campaignId={campaign.id} 
        master 
        enabled={schedulingEnabled} 
      />
      <CampaignEventCalendar 
        campaignId={campaign.id} 
        master 
        enabled={eventCalendarEnabled} 
      />
      <LiveKitRoomLink 
        campaignId={campaign.id} 
        master 
      />
      <CampaignPossessionsManager campaignId={campaign.id} />
    </div>
  )
}
```

### 6.2. Atualização de `/app/campaigns/new/page.tsx`

**Current:**
```typescript
// Form fields: name, theme, principios, status, lastSessionAt
```

**New:**
```typescript
const [enableSchedulingCalendar, setEnableSchedulingCalendar] = useState(true)

// Add to form:
<label className="sheet-field">
  <span>Calendário de marcação</span>
  <div className="flex items-center gap-3">
    <input
      type="checkbox"
      id="enable-scheduling-calendar"
      checked={enableSchedulingCalendar}
      onChange={(e) => setEnableSchedulingCalendar(e.target.checked)}
      className="h-5 w-5 accent-primary"
    />
    <span className="text-sm text-muted-foreground">
      Habilitar calendário para jogadores marcarem disponibilidade
    </span>
  </div>
</label>

// On submit, send to API:
body: JSON.stringify({
  name, theme, principios, status, lastSessionAt,
  enableSchedulingCalendar
})
```

**Backend API update (`/api/campaigns/route.ts`):**
```typescript
const enableSchedulingCalendar = body.enableSchedulingCalendar ?? true

// After creating campaign:
await db.execute(sql`
  INSERT INTO campaign_scheduling_calendars (campaign_id, enabled)
  VALUES (${campaign.id}, ${enableSchedulingCalendar})
`)
```

### 6.3. API Routes Integration

**All API routes must:**
1. Validate authentication (`getSessionOrDev()`)
2. Check authorization (mestre vs participant)
3. Ensure tables exist (`ensureAllTables()`)
4. Return structured JSON responses
5. Handle errors explicitly with appropriate HTTP status codes

**Example error handling pattern:**
```typescript
const session = await getSessionOrDev()
if (!session?.user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

const campaignId = typeof body.campaignId === 'string' ? body.campaignId : ''
if (!campaignId || !/^[0-9a-f-]{36}$/i.test(campaignId)) {
  return NextResponse.json({ error: 'ID da mesa inválido.' }, { status: 400 })
}

if (!(await canManageCampaign(session.user.sub, campaignId))) {
  return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })
}
```

### 6.4. LiveKit SDK Integration

**Dependencies to install:**
```bash
npm install @livekit/components-react @livekit/components-styles
```

**Environment variables needed:**
```env
LIVEKIT_URL=https://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
```

**Utility function (`lib/livekit.ts`):**
```typescript
import { Room, createToken } from '@livekit/components-core'

export async function generateLiveKitToken(campaignId: string, userId: string) {
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET
  if (!apiKey || !apiSecret) throw new Error('LiveKit config missing')

  // Room name: campanha-{campaignId}
  const roomName = `campanha-${campaignId}`
  
  // Token with user identity
  const token = createToken(apiKey, apiSecret, {
    identity: userId,
    name: userId,
    room: roomName,
  })

  return { roomName, token }
}
```

**API route for generating token:**
```typescript
// POST /api/livekit/token
export async function POST(request: Request) {
  // ...
  const { roomName, token } = await generateLiveKitToken(campaignId, session.user.sub)
  return NextResponse.json({ roomName, token })
}
```

---

## 7. Error Handling and Validation Requirements

### 7.1. Common Validation Rules

**Date format:**
- `YYYY-MM-DD` (ex: `2026-03-15`)
- Validate with regex: `/^\d{4}-\d{2}-\d{2}$/`

**Time format:**
- `HH:MM` (24-hour format, ex: `20:00`)
- Validate with regex: `/^([01]\d|2[0-3]):[0-5]\d$/`

**UUID format:**
- Standard UUID format
- Validate with regex: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`

**Text limits:**
- `title`: string, max 100 chars
- `description`: string, max 1000 chars (optional)
- `room_name`: string, max 64 chars (LiveKit constraint)

### 7.2. Validation Messages (PT-BR)

**Common error messages:**
- `Data ou disponibilidade inválida.` (400)
- `Você não pertence a esta mesa.` (403)
- `Apenas o mestre pode alterar o planejamento da mesa.` (403)
- `ID da mesa inválido.` (400)
- `Evento não encontrado.` (404)
- `Sala LiveKit não encontrada.` (404)

### 7.3. Timezone Handling

**All date/time operations must use `America/Sao_Paulo`:**
- When creating dates, use `new Date()` (JavaScript uses local timezone)
- When storing in PostgreSQL, use `TIMESTAMPTZ` (timestamp with timezone)
- When reading dates, convert to Brazil timezone:
  ```typescript
  const date = new Date(row.event_date + 'T12:00:00-03:00')
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'long',
  }).format(date)
  ```

### 7.4. Race Condition Prevention

**For toggle operations:**
- Use `INSERT ... ON CONFLICT (campaign_id) DO UPDATE` to avoid race conditions
- Add `updated_at` column to detect stale updates

**Example:**
```typescript
await db.execute(sql`
  INSERT INTO campaign_event_calendars (campaign_id, enabled)
  VALUES (${campaignId}, ${enabled})
  ON CONFLICT (campaign_id) DO UPDATE SET
    enabled = EXCLUDED.enabled,
    updated_at = now()
  RETURNING enabled
`)
```

---

## 8. Testing Considerations

### 8.1. Unit Tests

**Test files to create:**
- `lib/campaign-event-calendar.test.ts` - functions for CRUD operations
- `lib/campaign-scheduling-calendar.test.ts` - toggle functions
- `lib/livekit.test.ts` - token generation, room name logic

**Test cases:**
- CRUD de eventos: create, read, update, delete
- Toggle functionality: enable/disable, persistence
- LiveKit room creation: unique room name, host assignment
- Validation: invalid inputs, missing required fields
- Authorization: mestre vs participant permissions
- Timezone: ensure all dates are in America/Sao_Paulo

### 8.2. Integration Tests

**Test scenarios:**
1. Create campaign with scheduling calendar enabled
2. Toggle scheduling calendar off and on, verify data persistence
3. Create multiple events across different years
4. Filter events by year, verify correct data loaded
5. Create LiveKit room, verify room name format
6. Attempt unauthorized operations, verify 403 responses

### 8.3. E2E Tests (Optional)

**Test flows:**
1. Master enables scheduling calendar → Player marks availability → Master sees summary
2. Master enables event calendar → Master creates event → Player sees event
3. Master creates LiveKit room → Player joins room → Host controls entry

---

## 9. Performance Considerations

### 9.1. Database Queries

**Optimize with indexes:**
- `campaign_events(campaign_id, event_date)` for filtering by year
- `campaign_event_calendars(campaign_id)` for toggle checks
- `livekit_rooms(campaign_id)` for room lookup

**Avoid N+1 queries:**
- Load all events for a year in one query
- Use `Promise.all()` for parallel requests (toggle status, events, etc.)

### 9.2. Frontend Optimization

**Lazy loading:**
- Modal components only mount when open
- LiveKit SDK only loads when user enters room

**Suspense boundaries:**
- Wrap event calendar in `<Suspense>` with fallback
- Show skeleton loader while fetching events

**SWR caching:**
- Events cached by year, auto-revalidate on focus
- Toggle status cached with revalidate on mount

---

## 10. Security Considerations

### 10.1. Authentication & Authorization

**All routes must:**
1. Verify user is authenticated (`session?.user`)
2. Check if user is participant of campaign (`isUserInCampaign`)
3. For mestre-only actions, verify `canManageCampaign`

**Never trust client data:**
- Validate all inputs server-side
- Sanitize HTML in `description` field
- Escape user data before rendering

### 10.2. LiveKit Token Security

**Token generation:**
- Never expose API secret to frontend
- Generate tokens server-side only
- Set short expiration (ex: 1 hour)
- Use room name constraint to prevent unauthorized room access

**Example token claim:**
```typescript
{
  identity: userId,
  name: user.name,
  room: roomName,
  roomAdmin: isHost, // grant host privileges
  video: {
    join: true,
    leave: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  }
}
```

### 10.3. SQL Injection Prevention

**Use parameterized queries:**
- Always use Drizzle ORM or `db.execute(sql`...`, [params])`
- Never concatenate user input into SQL strings

**Example safe query:**
```typescript
await db.execute(sql`
  SELECT * FROM campaign_events
  WHERE campaign_id = ${campaignId}::uuid
  AND EXTRACT(YEAR FROM event_date) = ${year}
`)
```

---

## 11. Future Enhancements

### 11.1. Calendário de Eventos

- **Recurring events:** Permitir eventos recorrentes (semanal, mensal)
- **Calendar view:** Visualização mensal com eventos marcados no grid
- **Notifications:** Alertar participantes sobre eventos próximos

### 11.2. LiveKit

- **Recording:** Salvar sessões para revisão
- **Breakout rooms:** Salas separadas para grupos menores
- **Guest access:** Permitir convidados externos (com moderação)

### 11.3. General

- **Calendar import/export:** ICS file download/upload
- **Multi-language:** Suporte para inglês (com tradução)
- **Mobile app:** App React Native com sync offline-first

---

## 12. Migration Checklist

### Phase 1: Database

- [ ] Add `campaign_event_calendars` table
- [ ] Add `campaign_events` table
- [ ] Add `campaign_scheduling_calendars` table
- [ ] Add `livekit_rooms` table
- [ ] Run migration on staging
- [ ] Verify tables created in DB

### Phase 2: API Routes

- [ ] `GET/POST/PATCH/DELETE /api/campaign-events`
- [ ] `GET/PATCH /api/campaign-event-calendar/status`
- [ ] `GET/PATCH /api/campaign-event-calendar/toggle`
- [ ] `GET/PATCH /api/campaign-scheduling-calendar/status`
- [ ] `GET/PATCH /api/campaign-scheduling-calendar/toggle`
- [ ] `GET/POST /api/livekit/room`
- [ ] Test each route with curl/postman
- [ ] Verify authorization rules

### Phase 3: Frontend Components

- [ ] `CampaignEventCalendar` component
- [ ] `CalendarYearSelector` component
- [ ] `EventFormModal` component
- [ ] `EventCard` component
- [ ] `VisibilityBadge` component
- [ ] `CampaignCalendarToggle` component
- [ ] `SchedulingCalendarIntroModal` component
- [ ] `LiveKitRoomLink` component
- [ ] `LiveKitRoom` component
- [ ] Update `/campaigns/new/page.tsx`
- [ ] Update `/campaigns/[id]/page.tsx`

### Phase 4: Integration & Testing

- [ ] Install LiveKit SDK
- [ ] Configure environment variables
- [ ] Test end-to-end flows
- [ ] Verify timezone handling
- [ ] Run linting (`npm run lint`)
- [ ] Run build (`npm run build`)
- [ ] Test accessibility (keyboard navigation, screen readers)

### Phase 5: Deployment

- [ ] Deploy to staging
- [ ] Smoke test in staging
- [ ] Deploy to production
- [ ] Monitor for errors
- [ ] Update CHANGELOG.md

---

## 13. Estimativa de Esforço

| Tarefa | Estimativa |
|--------|-----------|
| **Database migrations** | 30 min |
| **API Routes (6 endpoints)** | 3h |
| **Frontend Components (8 componentes)** | 4h |
| **LiveKit Integration** | 2h |
| **Modals e toggles** | 1.5h |
| **Testing (unit + integration)** | 2h |
| **Polishing e docs** | 1h |
| **Total** | **11h** |

---

## 14. Decisões de Design

### 14.1. Toggle Separado por Calendário

**Decision:** Cada calendário tem sua própria tabela de toggle (`campaign_event_calendars` vs `campaign_scheduling_calendars`).

**Rationale:**
- Permite habilitar/desabilitar cada um independentemente
- Escalável para futuro adicionar mais calendários
- Não há acoplamento funcional entre os dois

### 14.2. Evento com `event_date` e `event_time` Separados

**Decision:** Dois campos separados (DATE e TIME).

**Rationale:**
- Mais flexível para queries futuras
- Permite eventos apenas com data (sem hora)
- Facilita validação e exibição
- Padrão comum em sistemas de calendário

### 14.3. Visibilidade Simples: 'master' | 'everyone'

**Decision:** Usar texto simples com 2 opções.

**Rationale:**
- Simples de entender e implementar
- Escalável (fácil adicionar 'players' no futuro)
- Não precisa de modelo complexo de permissões
- Mapeia direto para需求 de usuário

### 14.4. Sala LiveKit por Campanha (Não por Sessão)

**Decision:** Uma sala por campanha, não por sessão.

**Rationale:**
- Link permanente para mesa (fácil de compartilhar)
- Histórico de sala mantido (se recording habilitado)
- Mestre como host fixo
- Não precisa gerenciar ciclo de vida da sala

### 14.5. Room Name Format: `campanha-{campaignId}`

**Decision:** Nome da sala baseado no ID da campanha.

**Rationale:**
- Único e previsível
- Fácil de identificar no dashboard do LiveKit
- Não precisa de mapeamento extra

---

## 15. Next Steps

1. **Review this design** com o time
2. **Approve database schema** antes de implementar
3. **Setup LiveKit account** e obter credentials
4. **Implement database migrations** primeiro
5. **Build API routes** e testar com curl
6. **Implement frontend components** em ordem de dependência
7. **Test end-to-end** antes de deploy

---

**Last updated:** 2026-01-15
**Author:** Kiro Design Agent
