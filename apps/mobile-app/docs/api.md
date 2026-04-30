# API Reference

**Project:** Garden Mobile App  
**Version:** 1.2.0  
**Last Updated:** 2026-04-25  
**Status:** Active

---

## Change Log

### v1.2.0 (2026-04-25)
- Added invoice creation/download endpoints: `getGardenerJobInvoice()` and `getClientJobInvoice()`
- Added `InvoiceViewer` component for displaying and downloading PDFs in mobile app
- Invoices are only available for closed jobs

---

## Purpose

Documents every function exported by `services/api.ts`, the shared request infrastructure, data types, and the normalisation layer.

---

## Scope

Covers `services/api.ts` and `constants/api.ts`. Does not cover backend controller implementations.

---

## Base URL

Configured in `constants/api.ts`:

```typescript
export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ??
  Platform.select({
    android: 'http://10.0.2.2:5055',
    default:  'http://localhost:5055',
  })
) as string
```

Set `EXPO_PUBLIC_API_URL` in your environment for physical device testing (ngrok tunnel or LAN IP).

---

## Core Request Function

All API functions call the internal `request<T>()` function.

### Behaviour

- Sets `Content-Type: application/json`
- Sets `Authorization: Bearer <token>` when a token is provided
- Automatically adds `ngrok-skip-browser-warning: true` when `API_BASE_URL` contains `ngrok`
- Serialises the `body` object to JSON
- On non-OK response: parses the body for `{ message }` and throws an `Error`
- On `204 No Content` or empty body: returns `undefined`
- Otherwise: parses and returns the JSON body as `T`

---

## Shared Types

### Profile

```typescript
type Profile = {
  id: string
  email: string
  role: string
  companyName?: string
  name?: string
}
```

### Paged\<T\>

```typescript
type Paged<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
}
```

### JobDto

```typescript
type JobDto = {
  jobId: string
  name: string
  clientId?: string
  client?: { id: string; name: string; email: string }
  taskCount?: number
  finishedTaskCount?: number
  inProgressTaskCount?: number
  notStartedTaskCount?: number
  progressPercent?: number
  isClosed?: boolean
  createdAt?: string
}
```

### TaskDto

```typescript
type TaskDto = {
  taskId: string
  jobId: string
  name: string
  description?: string
  taskTypeName?: string
  taskTypeId?: string
  estimatedTimeMinutes?: number
  actualTimeMinutes?: number
  startedAt?: string
  finishedAt?: string
  totalMaterialCost?: number
  materials?: {
    materialId: string
    name: string
    amountType: string
    usedQuantity: number
    pricePerAmount: number
  }[]
}
```

### TaskScheduleDto

```typescript
type ScheduleStatus = 'Pending' | 'Approved' | 'Declined' | 'ProposedAlternative' | 'Rescheduled'

type TaskScheduleDto = {
  scheduleRequestId: string
  taskId: string
  jobId: string
  taskName: string
  gardenerId: string
  gardenerName: string
  clientId: string
  clientName: string
  scheduledAtUtc: string
  proposedAtUtc?: string
  approvedAtUtc?: string
  declinedAtUtc?: string
  status: ScheduleStatus
  createdAtUtc: string
}
```

### GetCalendarResponse

```typescript
type GetCalendarResponse = {
  scheduledTasks: TaskScheduleDto[]
  totalCount: number
  page: number
  pageSize: number
}
```

---

## Auth Endpoints

### `login(email, password)`

```
POST /auth/login
Body: { email, password }
Returns: { accessToken: string }
```

### `getMyProfile(token)`

```
GET /auth/profile
Auth: Bearer token
Returns: Profile (with role decoded from JWT)
```

The role is extracted from the JWT payload under `role` or the Microsoft claims URI fallback.

### `logout(token)`

```
POST /auth/logout
Auth: Bearer token
Returns: void
```

### `registerPushToken(token, expoPushToken)`

```
POST /api/users/push-token
Auth: Bearer token
Body: { expoPushToken: string }
Returns: void
```

Stores the device's Expo push token in the backend. Called automatically after login via `registerExpoPushToken()` in the notifications hook.

---

## Gardener: Jobs

### `getGardenerJobs(token, page?, pageSize?)`

```
GET /api/gardener/jobs?page=&pageSize=
Auth: Bearer token
Returns: Paged<JobDto>
```

### `getGardenerJobById(token, jobId)`

```
GET /api/gardener/jobs/{jobId}
Auth: Bearer token
Returns: JobDto
```

### `createGardenerJob(token, body)`

```
POST /api/gardener/jobs
Auth: Bearer token
Body: { name: string; clientId?: string }
Returns: JobDto
```

### `updateGardenerJob(token, jobId, body)`

```
PUT /api/gardener/jobs/{jobId}
Auth: Bearer token
Body: { name: string }
Returns: JobDto
```

### `deleteGardenerJob(token, jobId)`

```
DELETE /api/gardener/jobs/{jobId}
Auth: Bearer token
Returns: void
```

---

## Gardener: Tasks

### `getGardenerJobTasks(token, jobId, page?, pageSize?)`

```
GET /api/gardener/jobs/{jobId}/tasks?page=&pageSize=
Auth: Bearer token
Returns: Paged<TaskDto>
```

### `getGardenerTaskById(token, taskId)`

```
GET /api/gardener/tasks/{taskId}
Auth: Bearer token
Returns: TaskDto
```

### `createTask(token, body)`

```
POST /api/gardener/tasks
Auth: Bearer token
Body: CreateTaskRequest
Returns: TaskDto
```

```typescript
type CreateTaskRequest = {
  jobId: string
  taskTypeId?: string
  name: string
  description?: string
  estimatedTimeMinutes?: number
  materials?: { materialId: string; usedQuantity: number }[]
}
```

### `updateGardenerTask(token, taskId, body)`

```
PUT /api/gardener/tasks/{taskId}
Auth: Bearer token
Body: UpdateTaskRequest
Returns: void
```

```typescript
type UpdateTaskRequest = {
  name?: string
  description?: string
  estimatedTimeMinutes?: number
  actualTimeMinutes?: number
  startedAt?: string
  finishedAt?: string
  materials?: { materialId: string; usedQuantity: number }[]
}
```

### `deleteGardenerTask(token, taskId)`

```
DELETE /api/gardener/tasks/{taskId}
Auth: Bearer token
Returns: void
```

### `getGardenerTaskTypes(token)`

```
GET /api/gardener/task-types
Auth: Bearer token
Returns: TaskTypeDto[]
```

```typescript
type TaskTypeDto = { id: string; name: string }
```

### `getGardenerMaterials(token, page?, pageSize?)`

```
GET /api/gardener/materials?page=&pageSize=
Auth: Bearer token
Returns: { items: MaterialDto[]; total: number }
```

```typescript
type MaterialDto = {
  materialId: string
  name: string
  amountType: string
  pricePerAmount: number
}
```

---

## Gardener: Clients

### `getGardenerClients(token, page?, pageSize?)`

```
GET /api/gardener/clients?page=&pageSize=
Auth: Bearer token
Returns: Paged<GardenerClientDto>
```

```typescript
type GardenerClientDto = {
  clientId: string
  fullName: string
  email: string
  createdAt?: string
  invitationStatus?: string
}
```

### `getNumberOfGardenerClients(token)`

```
GET /api/gardener/clients/total
Auth: Bearer token
Returns: { numItems: number }
```

---

## Gardener: Scheduling

### `getGardenerCalendar(token, page?, pageSize?)`

```
GET /api/gardener/scheduling/calendar?page=&pageSize=
Auth: Bearer token
Returns: GetCalendarResponse
```

### `scheduleTask(token, taskId, clientId, scheduledAtUtc)`

```
POST /api/gardener/scheduling/schedule-task
Auth: Bearer token
Body: { taskId, clientId, scheduledAtUtc }
Returns: TaskScheduleDto
```

### `rescheduleTask(token, scheduleRequestId, rescheduledAtUtc)`

```
POST /api/gardener/scheduling/reschedule-task
Auth: Bearer token
Body: { scheduleRequestId, rescheduledAtUtc }
Returns: TaskScheduleDto
```

---

## Client: Jobs

### `getClientJobs(token, page?, pageSize?)`

```
GET /api/client/jobs?page=&pageSize=
Auth: Bearer token
Returns: Paged<JobDto>
```

### `getClientJobTasks(token, jobId, page?, pageSize?)`

```
GET /api/client/jobs/{jobId}/tasks?page=&pageSize=
Auth: Bearer token
Returns: Paged<TaskDto>
```

---

## Invoice

### `getGardenerJobInvoice(token, jobId)`

Downloads the PDF invoice for a closed job (gardener view).

```
GET /api/gardener/jobs/{jobId}/invoice
Auth: Bearer token
Returns: string (base64-encoded PDF data)
```

**Notes:**
- Only available for closed jobs
- Returns the invoice as base64-encoded PDF data
- Used by `InvoiceViewer` component to download and display PDFs

### `getClientJobInvoice(token, jobId)`

Downloads the PDF invoice for a closed job (client view).

```
GET /api/client/jobs/{jobId}/invoice
Auth: Bearer token
Returns: string (base64-encoded PDF data)
```

**Notes:**
- Only available for closed jobs
- Returns the invoice as base64-encoded PDF data
- Used by `InvoiceViewer` component to download and display PDFs

---

## Client: Scheduling

### `getClientCalendar(token, page?, pageSize?)`

```
GET /api/client/scheduling/calendar?page=&pageSize=
Auth: Bearer token
Returns: GetCalendarResponse
```

### `approveSchedule(token, scheduleRequestId)`

```
POST /api/client/scheduling/approve-schedule
Auth: Bearer token
Body: { scheduleRequestId }
Returns: TaskScheduleDto
```

### `declineSchedule(token, scheduleRequestId)`

```
POST /api/client/scheduling/decline-schedule
Auth: Bearer token
Body: { scheduleRequestId }
Returns: TaskScheduleDto
```

### `proposeAlternativeTime(token, scheduleRequestId, proposedAtUtc)`

```
POST /api/client/scheduling/propose-alternative-time
Auth: Bearer token
Body: { scheduleRequestId, proposedAtUtc }
Returns: TaskScheduleDto
```

---

## Q&A Types

### QuestionType / QuestionStatus

```typescript
type QuestionType = 'MultipleChoice' | 'FreeText'
type QuestionStatus = 'Pending' | 'Answered'
```

### QuestionOptionDto

```typescript
type QuestionOptionDto = {
  optionId: string
  text: string
}
```

### QuestionAnswerDto

```typescript
type QuestionAnswerDto = {
  answerId: string
  questionId: string
  text: string
  selectedOptionId?: string
  answeredAt: string
  answeredByName?: string
  mediaUrls?: string[]
}
```

### TaskQuestionDto

```typescript
type TaskQuestionDto = {
  questionId: string
  taskId: string
  taskName?: string
  jobId?: string
  text: string
  type: QuestionType
  options?: QuestionOptionDto[]
  status: QuestionStatus
  createdAt: string
  askedByName?: string
  answer?: QuestionAnswerDto
  mediaUrls?: string[]
}
```

### CreateQuestionRequest

```typescript
type CreateQuestionRequest = {
  taskId: string
  text: string
  type: QuestionType
  options?: string[]      // option texts for MultipleChoice
  mediaUrls?: string[]
}
```

### AnswerQuestionRequest

```typescript
type AnswerQuestionRequest = {
  text: string
  selectedOptionId?: string
  mediaUrls?: string[]
}
```

---

## Media Upload

### `uploadMedia(token, uri, mimeType, filename)`

```
POST /api/media/upload
Auth: Bearer token
Body: multipart/form-data — field "file"
Returns: { url: string }
```

Uploads a photo or video picked from the device library. Returns the hosted URL to embed in `mediaUrls` fields of questions or answers.

---

## Gardener: Questions

### `getGardenerQuestions(token, taskId?, page?, pageSize?)`

```
GET /api/gardener/questions?taskId=&page=&pageSize=
Auth: Bearer token
Returns: Paged<TaskQuestionDto>
```

Omit `taskId` to fetch questions for all tasks.

### `createGardenerQuestion(token, body)`

```
POST /api/gardener/questions
Auth: Bearer token
Body: CreateQuestionRequest
Returns: TaskQuestionDto
```

### `deleteGardenerQuestion(token, questionId)`

```
DELETE /api/gardener/questions/{questionId}
Auth: Bearer token
Returns: void
```

Only unanswered questions can be deleted.

---

## Client: Questions

### `getClientQuestions(token, taskId?, page?, pageSize?)`

```
GET /api/client/questions?taskId=&page=&pageSize=
Auth: Bearer token
Returns: Paged<TaskQuestionDto>
```

### `answerQuestion(token, questionId, body)`

```
POST /api/client/questions/{questionId}/answer
Auth: Bearer token
Body: AnswerQuestionRequest
Returns: TaskQuestionDto
```

---

## Data Normalisation

The API response shapes vary across endpoints. Two internal helpers standardise them before returning to callers:

### `normalizeJob(raw)`

Handles field name variance:
- `jobId` or `id` → `jobId`
- `client.clientId` or `client.id` → `client.id`
- `client.fullName` or `client.name` → `client.name`
- `IsClosed` or `isClosed` → `isClosed`
- `createdAtUtc` or `createdAt` → `createdAt`

### `normalizePaged<T>(raw, page, pageSize)`

Handles pagination envelope variance:
- Accepts `items`, `data`, `jobs`, or `tasks` arrays
- Fills in defaults for `total`, `page`, `pageSize` if absent

---

## Notes

- All `scheduledAtUtc`, `proposedAtUtc`, `createdAtUtc` values are ISO 8601 UTC strings. Convert to local time for display.
- Pagination defaults: `page = 1`, `pageSize = 20` for jobs; `pageSize = 50` for tasks and clients; `pageSize = 100` in notification polling.
- The `Authorization: Bearer` header is omitted when no `token` argument is provided (used only for `login`).

---

## Change Log

### [1.1.0] - 2026-04-24
- Added Q&A types: `QuestionType`, `QuestionStatus`, `QuestionOptionDto`, `QuestionAnswerDto`, `TaskQuestionDto`, `CreateQuestionRequest`, `AnswerQuestionRequest`
- Added `uploadMedia()` for multipart photo/video upload
- Added `getGardenerQuestions()`, `createGardenerQuestion()`, `deleteGardenerQuestion()`
- Added `getClientQuestions()`, `answerQuestion()`

### [1.0.0] - 2026-04-24
- Initial API reference documentation
