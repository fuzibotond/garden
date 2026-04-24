import { API_BASE_URL } from '@/constants/api';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

async function request<T>(
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
    let message = text
    try {
      const json = JSON.parse(text) as { message?: string }
      if (json.message) message = json.message
    } catch {
      // use raw text
    }
    throw new Error(message || 'Request failed')
  }

  if (res.status === 204) return undefined as T
  const text = await res.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
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
