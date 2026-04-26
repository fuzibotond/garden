# Garden Web App — Documentation

**Version:** 1.1.0  
**Last Updated:** 2026-04-26  
**Status:** Active

---

## Table of Contents

1. [Purpose](#purpose)
2. [Scope](#scope)
3. [Tech Stack](#tech-stack)
4. [Folder Structure](#folder-structure)
5. [Environment & Configuration](#environment--configuration)
6. [Authentication](#authentication)
7. [Routing & Route Guards](#routing--route-guards)
8. [Pages](#pages)
9. [API Client](#api-client)
10. [Component System](#component-system)
11. [Layout](#layout)
12. [Development Setup](#development-setup)
13. [Notes & Decisions](#notes--decisions)
14. [Change Log](#change-log)

---

---

## Purpose

This document covers the **React web app** (`apps/web`) — a browser-based management interface for the Garden platform. It serves Admin, Gardener, and Client roles, each with a tailored navigation and feature set.

---

## Scope

- Frontend-only: React SPA built with Vite
- Communicates exclusively with the Garden API (see `DEVELOPMENT_GUIDE.md`)
- No server-side rendering; all data is fetched client-side

---

## Tech Stack

| Concern | Technology |
|---|---|
| UI Framework | React 19 + TypeScript |
| Build Tool | Vite 8 |
| Routing | React Router DOM v7 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Component Primitives | Radix UI (`@radix-ui/react-select`, `@radix-ui/react-switch`, `@radix-ui/themes`) |
| Variant Styling | `class-variance-authority` + `clsx` + `tailwind-merge` |
| Auth | JWT in `localStorage`, manual base64url decode |
| API Communication | Native `fetch` via thin `apiRequest` wrapper |

---

## Folder Structure

```
apps/web/
├── docs/                        ← documentation (this file lives here)
├── public/                      ← static assets
├── src/
│   ├── app/
│   │   └── router/
│   │       └── AppRouter.tsx    ← all routes + ProtectedRoute guard
│   ├── components/
│   │   ├── common/
│   │   │   └── StatCard.tsx     ← metric display card
│   │   ├── layout/
│   │   │   └── AdminLayout.tsx  ← sidebar + header shell
│   │   ├── navigation/          ← (reserved)
│   │   └── ui/
│   │       └── GlassUI.tsx      ← full design system (GlassCard, GlassButton, GlassInput, …)
│   ├── hooks/
│   │   └── useIsClient/         ← (stub, not yet implemented)
│   ├── lib/
│   │   ├── auth.ts              ← JWT parsing, role extraction, localStorage helpers
│   │   ├── env.ts               ← env var access (VITE_API_URL)
│   │   └── utils.ts             ← shared utilities
│   ├── pages/                   ← one folder per page/route
│   │   ├── admin/               ← AdminToolsPage
│   │   ├── clients/             ← ClientsPage, ClientSignup
│   │   ├── dashboard/           ← DashboardPage
│   │   ├── gardeners/           ← GardenersPage
│   │   ├── invitations/         ← AcceptInvitationPage
│   │   ├── jobs/                ← JobsPage
│   │   ├── landing/             ← LandingPage
│   │   ├── login/               ← LoginPage
│   │   ├── materials/           ← MaterialsPage
│   │   ├── profile/             ← ProfilePage
│   │   ├── questions/           ← GardenerQuestionsPage, ClientQuestionsPage
│   │   ├── scheduling/          ← ClientSchedulingPage, GardenerSchedulingPage
│   │   ├── tasks/               ← TasksPage
│   │   └── users/               ← UsersPage
│   ├── services/
│   │   └── apiClient.ts         ← all API functions + shared DTOs
│   ├── styles/                  ← global CSS
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .env.local                   ← local overrides (not committed)
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## Environment & Configuration

### Environment Variables

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Base path for all `fetch` calls (set to `/api` locally to use Vite proxy) |
| `VITE_TARGET_URL` | Actual backend URL — used only by the Vite proxy, not exposed to the browser |

**`.env.local` example (local development):**

```
# Frontend calls /api/... → proxied to the backend
VITE_API_URL=/api

# Proxy target: local backend or ngrok tunnel
VITE_TARGET_URL=http://localhost:5055
```

To route through an ngrok tunnel instead:

```
VITE_TARGET_URL=https://<your-ngrok-subdomain>.ngrok-free.app
```

### Vite Proxy

The Vite dev server proxies two path prefixes to `VITE_TARGET_URL`:

| Browser path | Proxy behaviour | Example |
|---|---|---|
| `/api/*` | Strips `/api`, forwards to backend | `/api/auth/login` → `VITE_TARGET_URL/auth/login` |
| `/uploads/*` | Forwarded unchanged | `/uploads/question-media/file.png` → `VITE_TARGET_URL/uploads/question-media/file.png` |

This means the browser never makes a cross-origin request — CORS issues are avoided entirely during local development.

> **Note:** `VITE_API_URL` and `VITE_TARGET_URL` are separate intentionally. The proxy target is a server-side value; the browser only ever sees `VITE_API_URL` (a relative path). The `/uploads` proxy is needed because the backend stores media URLs with `http://localhost` as origin; `apiClient.ts` strips that origin and returns just the path so the browser fetches through the proxy.

---

## Authentication

### Token Storage

- JWT `accessToken` is stored in `localStorage` under the key `"accessToken"`.
- No refresh token is currently persisted or used in the UI.

### `lib/auth.ts` Helpers

| Function | Description |
|---|---|
| `getAccessToken()` | Returns JWT string from `localStorage` or `null` |
| `clearAccessToken()` | Removes JWT from `localStorage` |
| `parseClaimsFromToken(token)` | Decodes JWT payload (base64url), extracts claims |
| `getCurrentUser()` | Combines the two above; returns `AuthClaims \| null` |
| `hasRole(user, role)` | Returns `true` if the user's roles array includes the given role |

### `AuthClaims` Shape

```ts
type AuthClaims = {
  sub: string          // user ID
  email?: string
  roles: Role[]        // subset of ["Admin", "Gardener", "Client"]
  primaryRole: Role    // highest-priority role: Admin > Gardener > Client
  companyName?: string // Gardener/Admin only
  name?: string
  raw: unknown         // full decoded payload
}
```

### Login Flow

1. `POST /auth/login` with `{ email, password }`
2. Response `{ accessToken }` stored in `localStorage`
3. Claims parsed from JWT
4. Redirect based on `primaryRole`:
   - `Admin` → `/admin`
   - `Gardener` → `/admin/clients`
   - `Client` → `/profile`

### Logout Flow

1. `POST /auth/logout` (best-effort — errors swallowed)
2. `localStorage.removeItem("accessToken")`
3. Navigate to `/login`

---

## Routing & Route Guards

**File:** [src/app/router/AppRouter.tsx](../src/app/router/AppRouter.tsx)

Uses `BrowserRouter` + `Routes` from React Router DOM v7.

### `ProtectedRoute`

A wrapper component that enforces:
- **No token** → redirect to `/login`
- **Token present, wrong role** → redirect to `/profile`

### Route Table

| Path | Component | Allowed Roles |
|---|---|---|
| `/` | `LandingPage` | Public |
| `/login` | `LoginPage` | Public |
| `/signup` | `ClientSignup` | Public |
| `/invite/accept` | `AcceptInvitationPage` | Public (token-based) |
| `/profile` | `ProfilePage` | Any authenticated |
| `/admin` | `DashboardPage` | Admin |
| `/admin/users` | `UsersPage` | Admin |
| `/admin/gardeners` | `GardenersPage` | Admin |
| `/admin/tools` | `AdminToolsPage` | Admin |
| `/admin/clients` | `ClientsPage` | Admin, Gardener, Client |
| `/admin/jobs` | `JobsPage` | Admin, Gardener, Client |
| `/admin/tasks` | `TasksPage` | Admin, Gardener, Client |
| `/admin/materials` | `MaterialsPage` | Admin, Gardener |
| `/gardener/scheduling` | `GardenerSchedulingPage` | Admin, Gardener |
| `/client/scheduling` | `ClientSchedulingPage` | Client |
| `/gardener/questions` | `GardenerQuestionsPage` | Gardener |
| `/client/questions` | `ClientQuestionsPage` | Client |

---

## Pages

### Public Pages

#### `LandingPage` (`/`)
Marketing page. Feature grid (6 cards), 4-step "how it works" section, sticky nav with Sign In / Get Started links. No API calls.

#### `LoginPage` (`/login`)
Email + password form. On success stores token and redirects based on role. Uses `POST /auth/login`.

#### `ClientSignup` (`/signup`)
Accepts `?token=` from invitation email. Collects name, email, password, confirmPassword. Uses `POST /api/gardener/clients/invitations/accept`. Redirects to `/login` on success.

#### `AcceptInvitationPage` (`/invite/accept`)
Validates `?token=` on mount, shows gardener name and pre-filled email. On submit accepts the invitation and redirects to `/login`. No role required — token-based access.

---

### Authenticated Pages (Any Role)

#### `ProfilePage` (`/profile`)
Displays and edits the current user's profile. Clients edit `name`; Admins and Gardeners also edit `companyName`. Supports profile deletion (clears token, hard-redirects to `/login`).

- `GET /auth/profile`
- `PUT /auth/profile`
- `DELETE /auth/profile`

---

### Admin-Only Pages

#### `DashboardPage` (`/admin`)
Metrics grid using `StatCard` components.

- Admin: Total Gardeners (`GET /api/admin/gardeners/total`) + Total Clients (`GET /api/admin/clients/total`)
- Gardener view of same page: Total Clients only (`GET /api/gardener/clients/total`)

#### `GardenersPage` (`/admin/gardeners`)
Full CRUD for gardeners. Paginated list with expandable rows showing each gardener's clients.

- `GET/POST/PUT/DELETE /api/admin/gardeners`
- `GET /api/admin/gardeners/:id`

#### `UsersPage` (`/admin/users`)
Placeholder page — "Manage all platform users." No API calls implemented yet.

#### `AdminToolsPage` (`/admin/tools`)
Multi-tab admin utilities. **Task Types** tab: loads task types per gardener in parallel, supports bulk create (all gardeners or subset) and delete by name across gardeners.

- `GET /api/admin/gardeners`
- `GET /api/admin/task-types/gardener/:id`
- `POST /api/admin/task-types?gardenerId=`
- `DELETE /api/admin/task-types/:id`

---

### Admin + Gardener + Client Pages

#### `ClientsPage` (`/admin/clients`)
Role-aware client management.

- **Admin**: full CRUD via `/api/admin/clients`
- **Gardener**: invite via email (`POST /api/gardener/clients/invitations`), edit/delete via `/api/gardener/clients`
- Invitation status shown as color-coded pills: Accepted (green), Pending (yellow), Expired (red)
- Paginated (10/page) with toggle to filter accepted clients

#### `JobsPage` (`/admin/jobs`)
Role-aware job list with progress %, cost breakdown (material / labor / total), task counts.

- **Admin/Gardener**: create, edit, delete, close jobs; generate PDF invoice
- **Client**: read-only + download own invoice
- Close action requires `progressPercent >= 100`
- Clicking a job navigates to `/admin/tasks?jobId=...`
- Gardener endpoints: `GET/POST/PUT/DELETE /api/gardener/jobs`, `POST /api/gardener/jobs/:id/close`, `GET /api/gardener/jobs/:id/invoice`
- Client endpoints: `GET /api/client/jobs`, `GET /api/client/jobs/:id/invoice`

#### `TasksPage` (`/admin/tasks`)
Reads `?jobId=` from URL to pre-filter tasks. Supports multi-material rows per task.

- **Admin/Gardener**: full task CRUD + material assignment
- **Client**: read-only
- Gardener endpoints: `GET /api/gardener/jobs/:id/tasks`, `POST /api/gardener/jobs/:id/tasks`, `GET/PUT/DELETE /api/gardener/tasks/:id`, `GET /api/gardener/task-types`, `GET /api/gardener/materials`
- Client endpoints: `GET /api/client/jobs`, `GET /api/client/jobs/:id/tasks`

---

### Admin + Gardener Pages

#### `MaterialsPage` (`/admin/materials`)
Full CRUD for materials (name, amountType, pricePerAmount). Paginated (10/page).

- `GET/POST/PUT/DELETE /api/gardener/materials`

#### `GardenerSchedulingPage` (`/gardener/scheduling`)
Gardener-facing scheduling calendar. Two modals: **Schedule** (pick client → load tasks → pick task + date) and **Reschedule** (existing schedule, new date). Custom inline month calendar with click-to-view-events.

- `GET /api/gardener/scheduling/calendar`
- `POST /api/gardener/scheduling/schedule-task`
- `POST /api/gardener/scheduling/reschedule-task`
- `GET /api/gardener/clients`

---

### Client-Only Pages

#### `ClientSchedulingPage` (`/client/scheduling`)
Client-facing schedule viewer. Same custom calendar plus a list of schedule requests. Client can Approve, Decline, or Propose an Alternative Time for `Pending` / `Rescheduled` items. Status badges are color-coded.

| Status | Color |
|---|---|
| Pending | Yellow |
| Approved | Green |
| Declined | Red |
| ProposedAlternative | Blue |
| Rescheduled | Purple |
| Cancelled | Grey |

- `GET /api/client/scheduling/calendar`
- `POST /api/client/scheduling/approve-schedule`
- `POST /api/client/scheduling/decline-schedule`
- `POST /api/client/scheduling/propose-alternative-time`

---

### Q&A Pages

#### `GardenerQuestionsPage` (`/gardener/questions`)
Gardener-facing task Q&A. Gardeners select a job and task, then ask questions that the client must answer before or during the job.

**Flow:**
1. Select a job (active jobs only) → select a task
2. Click "Ask Question" → choose type (FreeText / MultipleChoice), enter text, optionally add option chips for MC
3. Questions are split into **Awaiting answer** and **Answered** sections
4. Each question card shows: status badge, type badge, timestamp, question text, MC option chips, attached media thumbnails (clickable → open in new tab), and the client's answer (text + media thumbnails)

- `GET /api/gardener/jobs`
- `GET /api/gardener/jobs/:id/tasks`
- `GET /api/tasks/:taskId/questions`
- `POST /api/tasks/:taskId/questions`

Role guard: `Gardener` only.

#### `ClientQuestionsPage` (`/client/questions`)
Client-facing task Q&A. Clients see questions asked by the gardener on each task and submit answers.

**Flow:**
1. Select a job → select a task
2. Warning banner shows count of unanswered questions
3. Pending questions are highlighted; each card shows question text, MC options, attached media thumbnails
4. "Answer →" button opens an inline modal:
   - **FreeText**: textarea for free-text reply
   - **MultipleChoice**: radio-style option buttons + optional custom text
5. On submit: optimistic update; reloads full answer data
6. Answered questions show the submitted answer text, media thumbnails, and timestamp

- `GET /api/client/jobs`
- `GET /api/client/jobs/:id/tasks`
- `GET /api/tasks/:taskId/questions`
- `POST /api/questions/:questionId/answers`

Role guard: `Client` only.

#### Media in Q&A

Both Q&A pages display media attached to questions and answers as thumbnail grids. Thumbnails are clickable (open in new tab). The `apiClient.ts` normalizer rewrites `localhost` media URLs to relative `/uploads/...` paths, which are served through the Vite dev proxy.

Media upload from the web is not supported — media is attached via the mobile app only.

---

## API Client

**File:** [src/services/apiClient.ts](../src/services/apiClient.ts)

### Base Request

```ts
apiRequest<T>(path: string, options: ApiRequestOptions): Promise<T>
```

- Prepends `env.apiUrl` to `path`
- Sets `Content-Type: application/json` when a body is provided
- Sets `Authorization: Bearer <token>` when a token is provided
- Throws with the backend error message on non-2xx responses
- Returns `undefined` on HTTP 204

### Normalization Utilities

| Utility | Purpose |
|---|---|
| `normalizeEmail` | Lowercases email strings |
| `normalizePagedResponse` | Handles both `items`/`totalCount` and `Items`/`TotalCount` keys |
| `normalizeJob` | Maps PascalCase/camelCase aliases from backend `JobDto` |
| `normalizeTaskType` / `normalizeTaskTypeList` | Normalizes task type field casing |
| `downloadBlobFromApi` | Fetches a blob response and triggers a browser file download |

### Key Shared DTOs

```ts
type PagedResponse<T> = { items: T[]; totalCount: number }
type TotalResponse = { total: number }

type JobDto = { id, clientId, clientName, gardenerId, description, progressPercent, status, … }
type TaskDto = { id, jobId, name, description, actualTimeHours, wagePerHour, materials[], … }
type TaskScheduleDto = { id, taskId, taskName, clientId, scheduledAtUtc, status, … }
type MaterialDto = { id, name, amountType, pricePerAmount }
type TaskTypeDto = { id, name, gardenerId }

// Q&A types
type QuestionType   = "FreeText" | "MultipleChoice"
type QuestionStatus = "Pending" | "Answered"
type QuestionOptionDto = { optionId: string; text: string }
type QuestionAnswerDto = { answerId, questionId, text, answeredAt, answeredByName?, mediaUrls? }
type TaskQuestionDto   = { questionId, taskId, taskName?, text, type, options?, status,
                           createdAt, askedByName?, mediaUrls?, answer? }
type CreateQuestionRequest = { text: string; type: QuestionType; options?: string[] }
```

### API Function Groups

| Group | Path Prefix | Functions |
|---|---|---|
| Auth | `/auth` | `login`, `logout`, `getMyProfile`, `updateMyProfile`, `deleteMyProfile`, `registerGardener`, `registerClient`, `adminCreateClient` |
| Admin Gardeners | `/api/admin/gardeners` | `getAdminGardeners`, `getAdminGardenerById`, `getNumberOfAdminGardeners`, `createAdminGardener`, `updateAdminGardener`, `deleteAdminGardener` |
| Admin Clients | `/api/admin/clients` | `getAdminClients`, `getAdminClientById`, `getNumberOfAdminClients`, `createAdminClient`, `updateAdminClient`, `deleteAdminClient` |
| Admin Relationships | `/api/admin/relationships` | `getAdminRelationships`, `getAdminRelationshipsByGardener`, `getAdminRelationshipsByClient`, `createAdminRelationship`, `deleteAdminRelationship` |
| Admin Task Types | `/api/admin/task-types` | `createAdminTaskType`, `getAdminTaskTypeById`, `deleteAdminTaskType`, `getAdminTaskTypesByGardener` |
| Gardener Clients | `/api/gardener/clients` | `getGardenerClients`, `getGardenerClientById`, `getNumberOfGardenerClients`, `createGardenerClient`, `updateGardenerClient`, `deleteGardenerClient` |
| Gardener Invitations | `/api/gardener/clients/invitations` | `inviteClientAsGardener`, `validateInvitationToken`, `acceptInvitation`, `acceptInvitationSignup`, `clientSignup` |
| Gardener Jobs | `/api/gardener/jobs` | `createGardenerJob`, `getGardenerJobs`, `getGardenerJobById`, `updateGardenerJob`, `deleteGardenerJob`, `closeGardenerJob`, `downloadGardenerJobInvoice` |
| Client Jobs | `/api/client/jobs` | `getClientJobs`, `getClientJobById`, `downloadClientJobInvoice` |
| Gardener Tasks | `/api/gardener/jobs/:id/tasks`, `/api/gardener/tasks` | `getGardenerJobTasks`, `getGardenerTasksByClientId`, `createTaskInGardenerJob`, `createGardenerTask`, `getGardenerTaskById`, `updateGardenerTask`, `deleteGardenerTask` |
| Client Tasks | `/api/client/jobs/:id/tasks` | `getClientJobTasks` |
| Gardener Task Types | `/api/gardener/task-types` | `getGardenerTaskTypes` |
| Gardener Materials | `/api/gardener/materials` | `createGardenerMaterial`, `getGardenerMaterials`, `getGardenerMaterialById`, `updateGardenerMaterial`, `deleteGardenerMaterial` |
| Gardener Scheduling | `/api/gardener/scheduling` | `gardenerScheduleTask`, `getGardenerSchedulingCalendar`, `gardenerRescheduleTask` |
| Client Scheduling | `/api/client/scheduling` | `getClientSchedulingCalendar`, `clientApproveSchedule`, `clientDeclineSchedule`, `clientProposeAlternativeTime` |
| Task Q&A | `/api/tasks`, `/api/questions`, `/api/answers` | `getTaskQuestions`, `createGardenerQuestion`, `answerClientQuestion` |

---

## Component System

**File:** [src/components/ui/GlassUI.tsx](../src/components/ui/GlassUI.tsx)

Dark emerald/lime glass-morphism design system built on `class-variance-authority` + Tailwind CSS + Radix UI primitives.

### `GlassCard`

```tsx
<GlassCard variant="elevated" padding="md">...</GlassCard>
```

| Prop | Values |
|---|---|
| `variant` | `default` · `elevated` · `outlined` · `glow` · `glow-violet` · `glow-pink` |
| `padding` | `none` · `sm` · `md` · `lg` · `xl` |

### `GlassButton`

```tsx
<GlassButton variant="primary" size="md" loading={isSubmitting}>Save</GlassButton>
```

| Prop | Values |
|---|---|
| `variant` | `primary` · `secondary` · `ghost` · `danger` |
| `size` | `xs` · `sm` · `md` · `lg` · `xl` |
| `fullWidth` | boolean |
| `loading` | boolean — shows spinner, disables click |

### `GlassInput`

```tsx
<GlassInput label="Email" error={errors.email} fullWidth />
```

Renders a `<label>` + `<input>` with optional `helperText` and `error` message.

### `GlassSelect`

Composite Radix Select wrapped with glass styling:

```tsx
<GlassSelect value={val} onValueChange={setVal}>
  <GlassSelectTrigger><GlassSelectValue placeholder="Pick one" /></GlassSelectTrigger>
  <GlassSelectContent>
    <GlassSelectItem value="a">Option A</GlassSelectItem>
  </GlassSelectContent>
</GlassSelect>
```

### `GlassSwitch`

```tsx
<GlassSwitch checked={enabled} onCheckedChange={setEnabled} />
```

Wraps Radix `Switch.Root` with animated checked/unchecked gradient.

### `StatCard`

```tsx
<StatCard label="Total Clients" value={150} description="Active accounts" />
```

Wraps `GlassCard variant="elevated"`. Used on `DashboardPage`.

---

## Layout

**File:** [src/components/layout/AdminLayout.tsx](../src/components/layout/AdminLayout.tsx)

Two-column shell used by all authenticated pages: `admin-sidebar` + `admin-main`.

### Sidebar Navigation (role-conditional)

| Link | Admin | Gardener | Client |
|---|---|---|---|
| Dashboard | ✅ | — | — |
| Users | ✅ | — | — |
| Gardeners | ✅ | — | — |
| Admin Tools | ✅ | — | — |
| Clients | ✅ | ✅ | — |
| Jobs | ✅ | ✅ | ✅ |
| Tasks | ✅ | ✅ | ✅ |
| Materials | ✅ | ✅ | — |
| Schedule | ✅ | ✅ | ✅ |
| Questions | — | ✅ | ✅ |
| My Profile | ✅ | ✅ | ✅ |

> Clients navigate to `/client/scheduling`; Admins and Gardeners navigate to `/gardener/scheduling`.

### Header

Displays page title, subtitle pill, and a **Logout** button (calls `POST /auth/logout`, clears token, navigates to `/login`).

---

## Development Setup

### Prerequisites

- Node.js 20+
- npm or pnpm
- Garden API running locally (or accessible via ngrok)

### Install & Run

```bash
cd apps/web
npm install
npm run dev
```

The app starts on `http://localhost:8082` by default (Vite assigns a free port if 8082 is busy).

### Environment

Create `.env.local` in `apps/web/`:

```
# All API calls go through the Vite proxy
VITE_API_URL=/api

# Local backend
VITE_TARGET_URL=http://localhost:5055

# OR: ngrok tunnel (avoids CORS when backend is behind ngrok)
# VITE_TARGET_URL=https://<subdomain>.ngrok-free.app
```

Restart `npm run dev` after changing `.env.local`.

### Build

```bash
npm run build
```

Output lands in `dist/`. Preview the build locally:

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

---

## Notes & Decisions

### Why Vite proxy instead of CORS headers?

During development the backend may be tunnelled through ngrok. The browser blocks cross-origin requests unless the backend sends `Access-Control-Allow-Origin`. Rather than requiring backend config changes per developer session, the Vite proxy forwards `/api/*` server-side — the browser never makes a cross-origin request.

### Why `/uploads` is also proxied

The backend stores media file URLs with its own `http://localhost` origin (e.g. `http://localhost:5000/uploads/question-media/file.png`). When the web app renders these as `<img src>`, the browser would request `localhost:5000` directly — which is unreachable in most dev setups. The `normalizeQuestion` function in `apiClient.ts` strips the `localhost` origin and returns just the path (`/uploads/...`). The Vite proxy then forwards those requests to `VITE_TARGET_URL`, making the images load correctly. The same rewrite logic mirrors what the mobile app does.

### Why `VITE_API_URL` and `VITE_TARGET_URL` are separate

`VITE_TARGET_URL` is consumed by `vite.config.ts` via `loadEnv` at build/dev-server startup — it is **never** embedded in the browser bundle. `VITE_API_URL` is the relative path (`/api`) the browser-side code calls. Keeping them separate ensures the actual backend address is never leaked to the client.

### JWT in localStorage

The app stores the `accessToken` in `localStorage`. This is intentional for simplicity in the current phase. `sessionStorage` or `httpOnly` cookie patterns can be adopted when stricter security requirements arise.

### No refresh token handling (UI)

The `LoginResponse` type declares a `refreshToken` field but the UI does not persist or use it. Expired tokens require the user to log in again.

### Data fetching pattern

All data fetching is done inline per page with `useEffect` + `useCallback` + `useState`. No global state library (Redux, Zustand, React Query) is used. This keeps the codebase simple at the current scale.

### `useIsClient` hook

The file exists as a stub. It is intended for hydration-safe rendering patterns but is not yet implemented or used.

---

## Change Log

### [1.1.0] - 2026-04-26

- Added Task Q&A feature: `GardenerQuestionsPage` and `ClientQuestionsPage`
- Added `/gardener/questions` and `/client/questions` routes
- Added `pages/questions/` folder to Folder Structure
- Added Questions nav links for Gardener and Client roles in sidebar table
- Added Q&A DTOs to Key Shared DTOs section
- Added `getTaskQuestions`, `createGardenerQuestion`, `answerClientQuestion` to API function group table
- Added media display in Q&A: question and answer thumbnail grids, clickable to open full-size
- Added `/uploads` Vite proxy for backend-stored media URLs
- Updated `normalizeQuestion` in `apiClient.ts` to rewrite `localhost` media URL origins to relative paths
- Added Notes section for `/uploads` proxy rationale

### [1.0.0] - 2026-04-24

- Initial web app documentation
- Covers: tech stack, folder structure, env/proxy setup, auth flow, routing, all pages, API client, design system, layout, development setup
