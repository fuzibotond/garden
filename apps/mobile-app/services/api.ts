import { API_BASE_URL } from '@/constants/api';

/**
 * The backend stores media URLs with the local base URL (e.g. http://localhost:5000).
 * In development with ngrok, the phone cannot reach localhost, so we rewrite any
 * localhost origin to the current API_BASE_URL so images load on physical devices.
 */
function rewriteMediaUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      const apiOrigin = new URL(API_BASE_URL).origin;
      return url.replace(parsed.origin, apiOrigin);
    }
  } catch {
    // not a valid URL — return as-is
  }
  return url;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

export async function request<T>(
  path: string,
  opts: { method?: HttpMethod; body?: unknown; token?: string | null } = {},
): Promise<T> {
  const { method = 'GET', body, token } = opts
  const headers: Record<string, string> = {}
  if (body != null) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = `Bearer ${token}`
  // ngrok shows an interstitial browser-warning page unless this header is present
  if (API_BASE_URL.includes('ngrok')) headers['ngrok-skip-browser-warning'] = 'true'

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => 'Request failed')
    // HTML response means the tunnel is down, URL has changed, or the server is not running
    if (text.trimStart().startsWith('<')) {
      throw new Error(`Server unreachable (HTTP ${res.status}). Check that the backend is running and the tunnel URL is current.`)
    }
    let message = text
    try {
      const json = JSON.parse(text) as {
        message?: string
        title?: string
        errors?: Record<string, unknown>
      }
      if (json.errors) {
        const details = Object.entries(json.errors)
          .map(([k, v]) => {
            if (Array.isArray(v)) return `${k}: ${v.map((x) => String(x)).join(', ')}`
            return `${k}: ${String(v)}`
          })
          .join('; ')
        message = json.title ? `${json.title} — ${details}` : details
      } else if (json.title) {
        message = json.title
      } else if (json.message) {
        message = json.message
      }
    } catch {
      // use raw text
    }
    throw new Error(message || 'Request failed')
  }

  if (res.status === 204) return undefined as T
  const text = await res.text()
  if (!text) return undefined as T
  // HTML response on a success status also means the tunnel served the wrong page
  if (text.trimStart().startsWith('<')) {
    throw new Error('Server returned an HTML page instead of JSON. Check that the backend is running and the tunnel URL is current.')
  }
  try {
    return JSON.parse(text) as T
  } catch {
    return text as T
  }
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export type Profile = {
  id: string
  email: string
  role: string
  companyName?: string
  name?: string
}

export type JobDto = {
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

export type TaskDto = {
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
  materials?: { materialId: string; name: string; amountType: string; usedQuantity: number; pricePerAmount: number }[]
}

export type GardenerClientDto = {
  clientId: string
  fullName: string
  email: string
  createdAt?: string
  invitationStatus?: string
}

export type TaskTypeDto = { id: string; name: string }

export type MaterialDto = {
  materialId: string
  name: string
  amountType: string
  pricePerAmount: number
}

export type UpdateTaskRequest = {
  name?: string
  description?: string
  estimatedTimeMinutes?: number
  actualTimeMinutes?: number
  startedAt?: string
  finishedAt?: string
  materials?: { materialId: string; usedQuantity: number }[]
}

export type CreateTaskRequest = {
  jobId: string
  taskTypeId?: string
  name: string
  description?: string
  estimatedTimeMinutes?: number
  materials?: { materialId: string; usedQuantity: number }[]
}

export type Paged<T> = { items: T[]; total: number; page: number; pageSize: number }

// ─── Normalizers ───────────────────────────────────────────────────────────────

type RawJob = {
  jobId?: string; id?: string; clientId?: string; name?: string
  client?: { id?: string; clientId?: string; name?: string; fullName?: string; email?: string }
  taskCount?: number; finishedTaskCount?: number; inProgressTaskCount?: number
  notStartedTaskCount?: number; progressPercent?: number
  isClosed?: boolean; IsClosed?: boolean; createdAt?: string; createdAtUtc?: string
}

type RawPaged<T> = { items?: T[]; data?: T[]; jobs?: T[]; tasks?: T[]; total?: number; page?: number; pageSize?: number }

function normalizeJob(raw: RawJob): JobDto {
  return {
    jobId: raw.jobId ?? raw.id ?? '',
    name: raw.name ?? '',
    clientId: raw.clientId ?? raw.client?.id ?? raw.client?.clientId,
    client: raw.client
      ? {
          id: raw.client.id ?? raw.client.clientId ?? '',
          name: raw.client.name ?? raw.client.fullName ?? '',
          email: raw.client.email ?? '',
        }
      : undefined,
    taskCount: raw.taskCount,
    finishedTaskCount: raw.finishedTaskCount,
    inProgressTaskCount: raw.inProgressTaskCount,
    notStartedTaskCount: raw.notStartedTaskCount,
    progressPercent: raw.progressPercent,
    isClosed: raw.isClosed ?? raw.IsClosed,
    createdAt: raw.createdAt ?? raw.createdAtUtc,
  }
}

function normalizePaged<T>(raw: RawPaged<T> | undefined, page: number, pageSize: number): Paged<T> {
  const items = raw?.items ?? raw?.data ?? (raw as RawPaged<T>)?.jobs ?? (raw as RawPaged<T>)?.tasks ?? []
  return { items, total: raw?.total ?? items.length, page: raw?.page ?? page, pageSize: raw?.pageSize ?? pageSize }
}

// ─── Auth ──────────────────────────────────────────────────────────────────────

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const payload = token.split('.')[1]
    if (!payload) return {}
    // Convert base64url to standard base64 and add required padding
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const decoded = atob(padded)
    return JSON.parse(decoded) as Record<string, unknown>
  } catch {
    return {}
  }
}

export const login = (email: string, password: string) =>
  request<{ accessToken: string }>('/auth/login', { method: 'POST', body: { email, password } })

export const getMyProfile = (token: string) =>
  request<Record<string, unknown>>('/auth/profile', { token }).then((raw) => {
    const payload = decodeJwtPayload(token)
    const role =
      (payload['role'] as string | undefined) ??
      (payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] as string | undefined) ??
      ''
    return {
      id: (raw['gardenerId'] ?? raw['id'] ?? '') as string,
      email: (raw['email'] ?? '') as string,
      name: (raw['name'] ?? '') as string,
      companyName: (raw['companyName'] ?? '') as string,
      role,
    } as Profile
  })

export const logout = (token: string) =>
  request<void>('/auth/logout', { method: 'POST', token })

export const registerPushToken = (token: string, expoPushToken: string) =>
  request<void>('/api/users/push-token', { method: 'POST', body: { expoPushToken }, token })

// ─── Gardener: Jobs ────────────────────────────────────────────────────────────

export const getGardenerJobs = (token: string, page = 1, pageSize = 20) =>
  request<RawPaged<RawJob>>(`/api/gardener/jobs?page=${page}&pageSize=${pageSize}`, { token })
    .then((r) => { const p = normalizePaged(r, page, pageSize); return { ...p, items: p.items.map(normalizeJob) } })

export const getGardenerJobById = (token: string, jobId: string) =>
  request<RawJob>(`/api/gardener/jobs/${jobId}`, { token }).then(normalizeJob)

export const createGardenerJob = (token: string, body: { name: string; clientId?: string }) =>
  request<RawJob>(`/api/gardener/jobs`, { method: 'POST', body, token }).then(normalizeJob)

export const updateGardenerJob = (token: string, jobId: string, body: { name: string }) =>
  request<RawJob>(`/api/gardener/jobs/${jobId}`, { method: 'PUT', body, token }).then(normalizeJob)

export const deleteGardenerJob = (token: string, jobId: string) =>
  request<void>(`/api/gardener/jobs/${jobId}`, { method: 'DELETE', token })

// ─── Gardener: Tasks ───────────────────────────────────────────────────────────

export const getGardenerJobTasks = (token: string, jobId: string, page = 1, pageSize = 50) =>
  request<RawPaged<TaskDto>>(`/api/gardener/jobs/${jobId}/tasks?page=${page}&pageSize=${pageSize}`, { token })
    .then((r) => normalizePaged(r, page, pageSize))

export const getGardenerTaskById = (token: string, taskId: string) =>
  request<TaskDto>(`/api/gardener/tasks/${taskId}`, { token })

export const updateGardenerTask = (token: string, taskId: string, body: UpdateTaskRequest) =>
  request<void>(`/api/gardener/tasks/${taskId}`, { method: 'PUT', body, token })

export const createTask = (token: string, body: CreateTaskRequest) =>
  request<TaskDto>(`/api/gardener/tasks`, { method: 'POST', body, token })

export const deleteGardenerTask = (token: string, taskId: string) =>
  request<void>(`/api/gardener/tasks/${taskId}`, { method: 'DELETE', token })

export const getGardenerTaskTypes = (token: string): Promise<TaskTypeDto[]> =>
  request<{ taskTypes?: { Id?: string; id?: string; Name?: string; name?: string }[] }>(
    '/api/gardener/task-types', { token },
  ).then((r) =>
    (r.taskTypes ?? []).map((t) => ({ id: t.Id ?? t.id ?? '', name: t.Name ?? t.name ?? '' })).filter((t) => !!t.id)
  )

export const getGardenerMaterials = (token: string, page = 1, pageSize = 50): Promise<{ items: MaterialDto[]; total: number }> =>
  request<Record<string, unknown>>(`/api/gardener/materials?page=${page}&pageSize=${pageSize}`, { token })
    .then((r) => {
      const raw = (r.materials ?? r.Materials ?? r.items ?? []) as Record<string, unknown>[]
      return {
        items: raw.map((m) => ({
          materialId: String(m.materialId ?? m.MaterialId ?? ''),
          name: String(m.name ?? m.Name ?? ''),
          amountType: String(m.amountType ?? m.AmountType ?? ''),
          pricePerAmount: Number(m.pricePerAmount ?? m.PricePerAmount ?? 0),
        })),
        total: Number(r.total ?? r.Total ?? raw.length),
      }
    })

// ─── Gardener: Clients ────────────────────────────────────────────────────────

export const getGardenerClients = (token: string, page = 1, pageSize = 50) =>
  request<RawPaged<GardenerClientDto>>(`/api/gardener/clients?page=${page}&pageSize=${pageSize}`, { token })
    .then((r) => normalizePaged(r, page, pageSize))

export const getNumberOfGardenerClients = (token: string) =>
  request<{ numItems: number }>('/api/gardener/clients/total', { token })

// ─── Client: Jobs ─────────────────────────────────────────────────────────────

export const getClientJobs = (token: string, page = 1, pageSize = 20) =>
  request<RawPaged<RawJob>>(`/api/client/jobs?page=${page}&pageSize=${pageSize}`, { token })
    .then((r) => { const p = normalizePaged(r, page, pageSize); return { ...p, items: p.items.map(normalizeJob) } })

export const getClientJobTasks = (token: string, jobId: string, page = 1, pageSize = 50) =>
  request<RawPaged<TaskDto>>(`/api/client/jobs/${jobId}/tasks?page=${page}&pageSize=${pageSize}`, { token })
    .then((r) => normalizePaged(r, page, pageSize))

// ─── Invoice ───────────────────────────────────────────────────────────────────

/**
 * Fetch invoice PDF as a blob for gardener
 * Returns the PDF data as a base64 string that can be displayed in a PDF viewer
 */
async function requestBinary(path: string, token: string): Promise<string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  }
  if (API_BASE_URL.includes('ngrok')) {
    headers['ngrok-skip-browser-warning'] = 'true'
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    headers,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => 'Request failed')
    if (text.trimStart().startsWith('<')) {
      throw new Error(`Server unreachable (HTTP ${res.status}). Check that the backend is running and the tunnel URL is current.`)
    }
    throw new Error(text || 'Failed to download invoice')
  }

  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Extract base64 part (remove "data:application/pdf;base64," prefix if present)
      const base64 = result.includes(',') ? result.split(',')[1] : result
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export const getGardenerJobInvoice = (token: string, jobId: string): Promise<string> =>
  requestBinary(`/api/gardener/jobs/${jobId}/invoice`, token)

export const getClientJobInvoice = (token: string, jobId: string): Promise<string> =>
  requestBinary(`/api/client/jobs/${jobId}/invoice`, token)

// ─── Scheduling Types ──────────────────────────────────────────────────────────

export type ScheduleStatus = 'Pending' | 'Approved' | 'Declined' | 'ProposedAlternative' | 'Rescheduled'

export type TaskScheduleDto = {
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

export type GetCalendarResponse = {
  scheduledTasks: TaskScheduleDto[]
  totalCount: number
  page: number
  pageSize: number
}

export type ScheduleTaskResponse = {
  scheduleRequestId: string
  taskId: string
  clientId: string
  scheduledAtUtc: string
  status: string
  createdAtUtc: string
}

// ─── Gardener: Scheduling ─────────────────────────────────────────────────────

export const getGardenerCalendar = (token: string, page = 1, pageSize = 50) =>
  request<GetCalendarResponse>(`/api/gardener/scheduling/calendar?page=${page}&pageSize=${pageSize}`, { token })

export const scheduleTask = (token: string, taskId: string, clientId: string, scheduledAtUtc: string) =>
  request<ScheduleTaskResponse>('/api/gardener/scheduling/schedule-task', {
    method: 'POST',
    body: { taskId, clientId, scheduledAtUtc },
    token,
  })

export const rescheduleTask = (token: string, scheduleRequestId: string, rescheduledAtUtc: string) =>
  request<ScheduleTaskResponse>('/api/gardener/scheduling/reschedule-task', {
    method: 'POST',
    body: { scheduleRequestId, rescheduledAtUtc },
    token,
  })

// ─── Client: Scheduling ───────────────────────────────────────────────────────

export const getClientCalendar = (token: string, page = 1, pageSize = 50) =>
  request<GetCalendarResponse>(`/api/client/scheduling/calendar?page=${page}&pageSize=${pageSize}`, { token })

export const approveSchedule = (token: string, scheduleRequestId: string) =>
  request<ScheduleTaskResponse>('/api/client/scheduling/approve-schedule', {
    method: 'POST',
    body: { scheduleRequestId },
    token,
  })

export const declineSchedule = (token: string, scheduleRequestId: string) =>
  request<ScheduleTaskResponse>('/api/client/scheduling/decline-schedule', {
    method: 'POST',
    body: { scheduleRequestId },
    token,
  })

export const proposeAlternativeTime = (token: string, scheduleRequestId: string, proposedAtUtc: string) =>
  request<ScheduleTaskResponse>('/api/client/scheduling/propose-alternative-time', {
    method: 'POST',
    body: { scheduleRequestId, proposedAtUtc },
    token,
  })

// ─── Q&A Types ────────────────────────────────────────────────────────────────

export type QuestionType = 'MultipleChoice' | 'FreeText'
export type QuestionStatus = 'Pending' | 'Answered'

export type QuestionOptionDto = {
  optionId: string
  text: string
}

export type QuestionAnswerDto = {
  answerId: string
  questionId: string
  text: string
  selectedOptionId?: string
  answeredAt: string
  answeredByName?: string
  mediaUrls?: string[]
}

export type TaskQuestionDto = {
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

export type CreateQuestionRequest = {
  taskId: string
  text: string
  type: QuestionType
  options?: string[]
}

export type AnswerQuestionRequest = {
  text: string
}

// ─── Q&A Media Registration ──────────────────────────────────────────────────

export const addQuestionMedia = (
  token: string,
  questionId: string,
  mediaUrl: string,
  mediaType: string,
  fileName: string,
) =>
  request<void>(`/api/questions/${questionId}/media`, {
    method: 'POST',
    body: { questionId, mediaUrl, mediaType, fileName },
    token,
  })

export const addAnswerMedia = (
  token: string,
  answerId: string,
  mediaUrl: string,
  mediaType: string,
  fileName: string,
) =>
  request<void>(`/api/answers/${answerId}/media`, {
    method: 'POST',
    body: { answerId, mediaUrl, mediaType, fileName },
    token,
  })

// ─── Questions ────────────────────────────────────────────────────────────────

type RawQuestionMedia = {
  mediaId: string
  mediaUrl: string
  mediaType: string
  fileName: string
  uploadedAt: string
}

type RawAnswerDto = {
  answerId: string
  clientId?: string
  answerText: string
  createdAt: string
  media: RawQuestionMedia[]
}

type RawQuestion = {
  questionId: string
  taskId: string
  gardenerId?: string
  questionText: string
  questionType: 0 | 1 | 'FreeText' | 'MultipleChoice'
  predefinedOptions?: string[] | null
  createdAt: string
  answers: RawAnswerDto[]
  media: RawQuestionMedia[]
}

function normalizeQuestion(raw: RawQuestion): TaskQuestionDto {
  const firstAnswer = raw.answers?.[0]
  const isMultipleChoice = raw.questionType === 1 || raw.questionType === 'MultipleChoice'
  return {
    questionId: raw.questionId,
    taskId: raw.taskId,
    text: raw.questionText,
    type: isMultipleChoice ? 'MultipleChoice' : 'FreeText',
    options: raw.predefinedOptions?.map((opt, i) => ({ optionId: String(i), text: opt })),
    status: (raw.answers?.length ?? 0) > 0 ? 'Answered' : 'Pending',
    createdAt: raw.createdAt,
    mediaUrls: raw.media?.map((m) => rewriteMediaUrl(m.mediaUrl)),
    answer: firstAnswer
      ? {
          answerId: firstAnswer.answerId,
          questionId: raw.questionId,
          text: firstAnswer.answerText,
          answeredAt: firstAnswer.createdAt,
          mediaUrls: firstAnswer.media?.map((m) => rewriteMediaUrl(m.mediaUrl)),
        }
      : undefined,
  }
}

export const getTaskQuestions = (token: string, taskId: string) =>
  request<{ questions: RawQuestion[] }>(`/api/tasks/${taskId}/questions`, { token })
    .then((r) => ({ items: r.questions.map(normalizeQuestion) }))

export const createGardenerQuestion = (token: string, body: CreateQuestionRequest) =>
  request<RawQuestion>(`/api/tasks/${body.taskId}/questions`, {
    method: 'POST',
    body: {
      questionText: body.text,
      questionType: body.type === 'MultipleChoice' ? 1 : 0,
      predefinedOptions: body.options,
    },
    token,
  })
    .catch((err) => {
      const message = err instanceof Error ? err.message.toLowerCase() : ''
      const isEnumConversionError =
        message.includes('questiontype') &&
        (message.includes('could not be converted') || message.includes('json value'))

      if (!isEnumConversionError) throw err

      // Backend enum binding may be configured for string values in some environments.
      return request<RawQuestion>(`/api/tasks/${body.taskId}/questions`, {
        method: 'POST',
        body: {
          questionText: body.text,
          questionType: body.type,
          predefinedOptions: body.options,
        },
        token,
      })
    })
    .then((raw) => normalizeQuestion({ ...raw, answers: raw.answers ?? [], media: raw.media ?? [] }))

export type CreateAnswerResult = {
  answerId: string
  questionId: string
  answerText: string
  createdAt: string
}

export const answerQuestion = (token: string, questionId: string, body: AnswerQuestionRequest) =>
  request<CreateAnswerResult>(`/api/questions/${questionId}/answers`, {
    method: 'POST',
    body: { answerText: body.text },
    token,
  })
