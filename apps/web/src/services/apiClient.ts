import { env } from "../lib/env"

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE"

type ApiRequestOptions = {
  method?: HttpMethod
  body?: unknown
  token?: string | null
}

async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = "GET", body, token } = options

  const headers = new Headers()

  if (body != null) {
    headers.set("Content-Type", "application/json")
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const response = await fetch(`${env.apiUrl}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "API request failed")
    let message = text
    try {
      const json = JSON.parse(text) as { message?: string }
      if (json.message) message = json.message
    } catch {
      // use raw text
    }
    throw new Error(message || "API request failed")
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

export async function apiGet<T>(path: string, token?: string | null): Promise<T> {
  return apiRequest<T>(path, { method: "GET", token: token ?? null })
}

// Auth & profile endpoints from Postman collection

export type LoginRequest = {
  email: string
  password: string
}

export type LoginResponse = {
  accessToken: string
  refreshToken?: string
}

export type ClientSignupResponse = {
  id: string
  email?: string
  name?: string
  message?: string
}

export function login(body: LoginRequest) {
  return apiRequest<LoginResponse>("/api/auth/login", {
    method: "POST",
    body,
  })
}

export function clientSignup(body: ClientSignupRequest) {
  return acceptInvitationSignup(body)
}

export function acceptInvitationSignup(body: ClientSignupRequest) {
  return apiRequest<ClientSignupResponse>("/api/gardener/clients/invitations/accept", {
    method: "POST",
    body,
  })
}

export type ClientSignupRequest = {
  token: string
  email: string
  fullName: string
  password: string
  confirmPassword: string
}

export type RegisterGardenerRequest = {
  email: string
  password: string
  companyName: string
}

export function registerGardener(body: RegisterGardenerRequest) {
  return apiRequest<unknown>("/api/auth/register/gardener", {
    method: "POST",
    body,
  })
}

export type RegisterClientRequest = {
  email: string
  password: string
  confirmPassword: string
  fullName: string
}

export function registerClient(body: RegisterClientRequest) {
  return apiRequest<unknown>("/api/auth/register/client", {
    method: "POST",
    body,
  })
}

export type AdminCreateClientRequest = {
  email: string
  name: string
}

export function adminCreateClient(body: AdminCreateClientRequest, adminToken: string) {
  return apiRequest<unknown>("/api/auth/admin/create-client", {
    method: "POST",
    body,
    token: adminToken,
  })
}

export type Profile = {
  id: string
  email: string
  role: "Gardener" | "Client" | "Admin" | string
  companyName?: string
  name?: string
}

export function getMyProfile(token: string) {
  return apiRequest<Profile>("/api/auth/profile", {
    method: "GET",
    token,
  })
}

export type UpdateProfileRequest = {
  companyName?: string
  name?: string
}

export function updateMyProfile(body: UpdateProfileRequest, token: string) {
  return apiRequest<Profile>("/api/auth/profile", {
    method: "PUT",
    body,
    token,
  })
}

export function deleteMyProfile(token: string) {
  return apiRequest<void>("/api/auth/profile", {
    method: "DELETE",
    token,
  })
}

export function logout(token: string) {
  return apiRequest<void>("/api/auth/logout", {
    method: "POST",
    token,
  })
}

// --- Email normalization (docs: trim + toLowerCase) ---
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

// --- Paged response ---
export type PagedResponse<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
}

type RawPagedResponse<T> = Partial<PagedResponse<T>> & {
  data?: T[]
  jobs?: T[]
  tasks?: T[]
  materials?: T[]
}

function normalizePagedResponse<T>(
  raw: RawPagedResponse<T> | undefined,
  fallbackPage: number,
  fallbackPageSize: number,
): PagedResponse<T> {
  const items = raw?.items ?? raw?.data ?? raw?.jobs ?? raw?.tasks ?? raw?.materials ?? []
  return {
    items,
    total: raw?.total ?? items.length,
    page: raw?.page ?? fallbackPage,
    pageSize: raw?.pageSize ?? fallbackPageSize,
  }
}

export type TotalResponse = {
  numItems: number
}

// --- Admin: Gardeners ---
export type AdminGardenerClientDto = {
  clientId: string
  fullName: string
  email: string
}

export type AdminGardenerDto = {
  gardenerId: string
  email: string
  companyName?: string
  contactName?: string
  clientsCount?: number
  clients?: AdminGardenerClientDto[]
  createdAt?: string
}

export type CreateGardenerRequest = {
  email: string
  password: string
  companyName: string
  contactName: string
}

export type UpdateGardenerRequest = {
  companyName?: string
  contactName?: string
  email?: string
}

export function getAdminGardeners(token: string, page = 1, pageSize = 20) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  return apiRequest<PagedResponse<AdminGardenerDto>>(
    `/api/admin/gardeners?${params}`,
    { method: "GET", token },
  )
}

export function getNumberOfAdminGardeners(token: string) {
  return apiRequest<TotalResponse>(
    `/api/admin/gardeners/total`,
    { method: "GET", token },
  )
}

export function getAdminGardenerById(token: string, gardenerId: string) {
  return apiRequest<AdminGardenerDto>(`/api/admin/gardeners/${gardenerId}`, {
    method: "GET",
    token,
  })
}

export function createAdminGardener(token: string, body: CreateGardenerRequest) {
  const payload = {
    ...body,
    email: normalizeEmail(body.email),
  }
  return apiRequest<AdminGardenerDto>("/api/admin/gardeners", {
    method: "POST",
    body: payload,
    token,
  })
}

export function updateAdminGardener(
  token: string,
  gardenerId: string,
  body: UpdateGardenerRequest,
) {
  const payload = { ...body }
  if (body.email !== undefined) payload.email = normalizeEmail(body.email)
  return apiRequest<void>(`/api/admin/gardeners/${gardenerId}`, {
    method: "PUT",
    body: payload,
    token,
  })
}

export function deleteAdminGardener(token: string, gardenerId: string) {
  return apiRequest<void>(`/api/admin/gardeners/${gardenerId}`, {
    method: "DELETE",
    token,
  })
}

// --- Admin: Clients ---
export type AdminClientDto = {
  clientId: string
  fullName: string
  email: string
  createdAt?: string
  invitationStatus?: string
  invitationSentAt?: string
  invitationAcceptedAt?: string
  invitationExpiresAt?: string
}

export type CreateClientRequest = {
  email: string
  fullName: string
  password?: string
}

export type UpdateClientRequest = {
  fullName?: string
  email?: string
}

export function getAdminClients(token: string, page = 1, pageSize = 20) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  return apiRequest<PagedResponse<AdminClientDto>>(
    `/api/admin/clients?${params}`,
    { method: "GET", token },
  )
}

export function getNumberOfAdminClients(token: string) {
  return apiRequest<TotalResponse>(
    `/api/admin/clients/total`,
    { method: "GET", token },
  )
}

export function getAdminClientById(token: string, clientId: string) {
  return apiRequest<AdminClientDto>(`/api/admin/clients/${clientId}`, {
    method: "GET",
    token,
  })
}

export function createAdminClient(token: string, body: InviteClientRequest) {
  const payload = {
    email: normalizeEmail(body.email),
  }
  return apiRequest<AdminClientDto>("/api/admin/clients", {
    method: "POST",
    body: payload,
    token,
  })
}

export function updateAdminClient(
  token: string,
  clientId: string,
  body: UpdateClientRequest,
) {
  const payload = { ...body }
  if (body.email !== undefined) payload.email = normalizeEmail(body.email)
  return apiRequest<void>(`/api/admin/clients/${clientId}`, {
    method: "PUT",
    body: payload,
    token,
  })
}

export function deleteAdminClient(token: string, clientId: string) {
  return apiRequest<void>(`/api/admin/clients/${clientId}`, {
    method: "DELETE",
    token,
  })
}

// --- Gardener: Clients (gardener's own clients) ---
export type GardenerClientDto = {
  clientId: string
  fullName: string
  email: string
  createdAt?: string
  invitationStatus?: string
  invitationSentAt?: string
  invitationAcceptedAt?: string
  invitationExpiresAt?: string
}

export function getGardenerClients(token: string, page = 1, pageSize = 20) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  return apiRequest<PagedResponse<GardenerClientDto>>(
    `/api/gardener/clients?${params}`,
    { method: "GET", token },
  )
}

export function getNumberOfGardenerClients(token: string) {

  return apiRequest<TotalResponse>(
    `/api/gardener/clients/total`,
    { method: "GET", token },
  )
}

export function getGardenerClientById(token: string, clientId: string) {
  return apiRequest<GardenerClientDto>(`/api/gardener/clients/${clientId}`, {
    method: "GET",
    token,
  })
}

export function createGardenerClient(token: string, body: CreateClientRequest) {
  const payload = {
    ...body,
    email: normalizeEmail(body.email),
  }
  return apiRequest<GardenerClientDto>("/api/gardener/clients", {
    method: "POST",
    body: payload,
    token,
  })
}

export function updateGardenerClient(
  token: string,
  clientId: string,
  body: UpdateClientRequest,
) {
  const payload = { ...body }
  if (body.email !== undefined) payload.email = normalizeEmail(body.email)
  return apiRequest<void>(`/api/gardener/clients/${clientId}`, {
    method: "PUT",
    body: payload,
    token,
  })
}

export function deleteGardenerClient(token: string, clientId: string) {
  return apiRequest<void>(`/api/gardener/clients/${clientId}`, {
    method: "DELETE",
    token,
  })
}

// --- Invitations ---

export type InvitationSummary = {
  invitationId: string
  email: string
  status: "Pending" | "Accepted" | "Expired" | string
  invitedAt: string
  acceptedAt?: string
}

export type InviteClientRequest = {
  email: string
}

export function inviteClientAsGardener(token: string, body: InviteClientRequest) {
  const payload: InviteClientRequest = {
    email: normalizeEmail(body.email),
  }
  return apiRequest<InvitationSummary>("/api/gardener/clients/invitations", {
    method: "POST",
    body: payload,
    token,
  })
}

export type ValidateInvitationResponse = {
  email: string
  gardenerName?: string
  status: "Pending" | "Accepted" | "Expired" | string
}

export function validateInvitationToken(tokenValue: string) {
  const params = new URLSearchParams({ token: tokenValue })
  return apiRequest<ValidateInvitationResponse>(`/api/gardener/clients/invitations/validate-token?${params.toString()}`, {
    method: "GET",
  })
}

export type AcceptInvitationRequest = {
  token: string
  password: string
  confirmPassword: string
  fullName: string
}

export function acceptInvitation(body: AcceptInvitationRequest) {
  return apiRequest<void>("/api/gardener/clients/invitations/accept", {
    method: "POST",
    body,
  })
}

// --- Gardener: Jobs ---
export type JobLinkedClientDto = {
  id: string
  name: string
  email: string
}

export type JobLinkedGardenerDto = {
  id: string
  name: string
  email: string
}

export type JobDto = {
  jobId: string
  clientId?: string
  name: string
  client?: JobLinkedClientDto
  linkedGardeners?: JobLinkedGardenerDto[]
  gardenerIds?: string[]
  taskCount?: number
  finishedTaskCount?: number
  inProgressTaskCount?: number
  notStartedTaskCount?: number
  progressPercent?: number
  totalMaterialCost?: number
  totalLaborCost?: number
  totalCost?: number
  totalEstimatedTimeMinutes?: number
  totalActualTimeMinutes?: number
  timeDifferenceMinutes?: number
  actualVsEstimatedPercent?: number
  isClosed?: boolean
  closedAt?: string
  invoiceNumber?: string
  createdAt?: string
}

type RawLinkedClient = {
  id?: string
  clientId?: string
  name?: string
  fullName?: string
  email?: string
}

type RawLinkedGardener = {
  id?: string
  gardenerId?: string
  name?: string
  fullName?: string
  contactName?: string
  companyName?: string
  email?: string
}

type RawJobDto = {
  jobId?: string
  id?: string
  clientId?: string
  name?: string
  client?: RawLinkedClient
  linkedGardeners?: RawLinkedGardener[]
  gardeners?: RawLinkedGardener[]
  gardenerIds?: string[]
  taskCount?: number
  finishedTaskCount?: number
  inProgressTaskCount?: number
  notStartedTaskCount?: number
  progressPercent?: number
  totalMaterialCost?: number
  TotalMaterialCost?: number
  totalLaborCost?: number
  TotalLaborCost?: number
  totalCost?: number
  TotalCost?: number
  totalEstimatedTimeMinutes?: number
  TotalEstimatedTimeMinutes?: number
  totalActualTimeMinutes?: number
  TotalActualTimeMinutes?: number
  timeDifferenceMinutes?: number
  TimeDifferenceMinutes?: number
  actualVsEstimatedPercent?: number
  ActualVsEstimatedPercent?: number
  isClosed?: boolean
  IsClosed?: boolean
  closedAt?: string
  ClosedAt?: string
  invoiceNumber?: string
  InvoiceNumber?: string
  createdAt?: string
  createdAtUtc?: string
}

function normalizeLinkedClient(raw: RawLinkedClient | undefined): JobLinkedClientDto | undefined {
  if (!raw) return undefined

  const id = raw.id ?? raw.clientId ?? ""
  const name = raw.name ?? raw.fullName ?? ""
  const email = raw.email ?? ""

  if (!id || !name || !email) return undefined
  return { id, name, email }
}

function normalizeLinkedGardener(raw: RawLinkedGardener): JobLinkedGardenerDto | null {
  const id = raw.id ?? raw.gardenerId ?? ""
  if (!id) return null

  return {
    id,
    name: raw.name ?? raw.fullName ?? raw.contactName ?? raw.companyName ?? "",
    email: raw.email ?? "",
  }
}

function normalizeJob(raw: RawJobDto | undefined): JobDto {
  const client = normalizeLinkedClient(raw?.client)
  const linkedGardeners = (raw?.linkedGardeners ?? raw?.gardeners ?? [])
    .map(normalizeLinkedGardener)
    .filter((item): item is JobLinkedGardenerDto => item !== null)

  return {
    jobId: raw?.jobId ?? raw?.id ?? "",
    clientId: raw?.clientId ?? client?.id,
    name: raw?.name ?? "",
    client,
    linkedGardeners,
    gardenerIds: raw?.gardenerIds,
    taskCount: raw?.taskCount,
    finishedTaskCount: raw?.finishedTaskCount,
    inProgressTaskCount: raw?.inProgressTaskCount,
    notStartedTaskCount: raw?.notStartedTaskCount,
    progressPercent: raw?.progressPercent,
    totalMaterialCost: raw?.totalMaterialCost ?? raw?.TotalMaterialCost,
    totalLaborCost: raw?.totalLaborCost ?? raw?.TotalLaborCost,
    totalCost: raw?.totalCost ?? raw?.TotalCost,
    totalEstimatedTimeMinutes: raw?.totalEstimatedTimeMinutes ?? raw?.TotalEstimatedTimeMinutes,
    totalActualTimeMinutes: raw?.totalActualTimeMinutes ?? raw?.TotalActualTimeMinutes,
    timeDifferenceMinutes: raw?.timeDifferenceMinutes ?? raw?.TimeDifferenceMinutes,
    actualVsEstimatedPercent: raw?.actualVsEstimatedPercent ?? raw?.ActualVsEstimatedPercent,
    isClosed: raw?.isClosed ?? raw?.IsClosed,
    closedAt: raw?.closedAt ?? raw?.ClosedAt,
    invoiceNumber: raw?.invoiceNumber ?? raw?.InvoiceNumber,
    createdAt: raw?.createdAt ?? raw?.createdAtUtc,
  }
}

export type CreateJobRequest = {
  clientId: string
  name: string
  gardenerIds: string[]
}

export type UpdateJobRequest = {
  name?: string
  gardenerIds?: string[]
}

export function createGardenerJob(token: string, body: CreateJobRequest) {
  return apiRequest<RawJobDto>("/api/gardener/jobs", {
    method: "POST",
    body,
    token,
  }).then((response) => normalizeJob(response))
}

export function getGardenerJobs(token: string, page = 1, pageSize = 20) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  return apiRequest<RawPagedResponse<RawJobDto>>(`/api/gardener/jobs?${params.toString()}`, {
    method: "GET",
    token,
  }).then((response) => {
    const normalized = normalizePagedResponse(response, page, pageSize)
    return {
      ...normalized,
      items: normalized.items.map((job) => normalizeJob(job)),
    }
  })
}

export function getClientJobs(token: string, page = 1, pageSize = 20) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  return apiRequest<RawPagedResponse<RawJobDto>>(`/api/client/jobs?${params.toString()}`, {
    method: "GET",
    token,
  }).then((response) => {
    const normalized = normalizePagedResponse(response, page, pageSize)
    return {
      ...normalized,
      items: normalized.items.map((job) => normalizeJob(job)),
    }
  })
}

export function getGardenerJobById(token: string, jobId: string) {
  return apiRequest<RawJobDto>(`/api/gardener/jobs/${jobId}`, {
    method: "GET",
    token,
  }).then((response) => normalizeJob(response))
}

export function getClientJobById(token: string, jobId: string) {
  return apiRequest<RawJobDto>(`/api/client/jobs/${jobId}`, {
    method: "GET",
    token,
  }).then((response) => normalizeJob(response))
}

export function updateGardenerJob(token: string, jobId: string, body: UpdateJobRequest) {
  return apiRequest<void>(`/api/gardener/jobs/${jobId}`, {
    method: "PUT",
    body,
    token,
  })
}

export function deleteGardenerJob(token: string, jobId: string) {
  return apiRequest<void>(`/api/gardener/jobs/${jobId}`, {
    method: "DELETE",
    token,
  })
}

export function closeGardenerJob(token: string, jobId: string) {
  return apiRequest<RawJobDto>(`/api/gardener/jobs/${jobId}/close`, {
    method: "POST",
    token,
  }).then((response) => normalizeJob(response))
}

async function downloadBlobFromApi(path: string, token: string, filename: string): Promise<void> {
  const response = await fetch(`${env.apiUrl}${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    const text = await response.text().catch(() => "Failed to download")
    throw new Error(text || "Failed to download")
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export function downloadGardenerJobInvoice(token: string, jobId: string, invoiceNumber?: string) {
  return downloadBlobFromApi(
    `/api/gardener/jobs/${jobId}/invoice`,
    token,
    `${invoiceNumber ?? jobId}.pdf`,
  )
}

export function downloadClientJobInvoice(token: string, jobId: string, invoiceNumber?: string) {
  return downloadBlobFromApi(
    `/api/client/jobs/${jobId}/invoice`,
    token,
    `${invoiceNumber ?? jobId}.pdf`,
  )
}

// --- Gardener: Tasks ---
export type TaskDto = {
  taskId: string
  jobId: string
  taskTypeId?: string
  taskTypeName?: string
  name: string
  description?: string
  estimatedTimeMinutes?: number
  actualTimeMinutes?: number
  wagePerHour?: number
  startedAt?: string
  finishedAt?: string
  materials?: TaskMaterialDto[]
  totalMaterialCost?: number
  totalLaborCost?: number
  totalCost?: number
}

export type TaskMaterialInput = {
  materialId: string
  usedQuantity: number
}

export type TaskMaterialDto = {
  materialId: string
  name: string
  amountType: string
  usedQuantity: number
  pricePerAmount: number
  totalCost: number
}

export type CreateTaskRequest = {
  jobId: string
  taskTypeId: string
  name: string
  description?: string
  estimatedTimeMinutes?: number
  wagePerHour?: number
  materials?: TaskMaterialInput[]
}

export type CreateTaskInJobRequest = {
  taskTypeId: string
  name: string
  description?: string
  estimatedTimeMinutes?: number
  wagePerHour?: number
  materials?: TaskMaterialInput[]
}

export type UpdateTaskRequest = {
  name?: string
  description?: string
  actualTimeMinutes?: number
  wagePerHour?: number
  startedAt?: string
  finishedAt?: string
  materials?: TaskMaterialInput[]
}

export function getGardenerJobTasks(token: string, jobId: string, page = 1, pageSize = 20) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  return apiRequest<RawPagedResponse<TaskDto>>(`/api/gardener/jobs/${jobId}/tasks?${params.toString()}`, {
    method: "GET",
    token,
  }).then((response) => normalizePagedResponse(response, page, pageSize))
}

/**
 * Returns all tasks belonging to jobs that are linked to the given clientId.
 * NOTE: A dedicated backend endpoint GET /api/gardener/tasks?clientId={id} would be
 * more efficient. This helper works around the missing endpoint by loading all jobs
 * (up to 200) and fetching tasks per matching job in parallel.
 */
export async function getGardenerTasksByClientId(
  token: string,
  clientId: string,
): Promise<TaskDto[]> {
  const jobsResponse = await getGardenerJobs(token, 1, 200)
  const clientJobs = jobsResponse.items.filter((j) => j.clientId === clientId)
  if (clientJobs.length === 0) return []
  const taskArrays = await Promise.all(
    clientJobs.map((job) =>
      getGardenerJobTasks(token, job.jobId, 1, 200).then((r) => r.items),
    ),
  )
  return taskArrays.flat()
}

export function getClientJobTasks(token: string, jobId: string, page = 1, pageSize = 20) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  return apiRequest<RawPagedResponse<TaskDto>>(`/api/client/jobs/${jobId}/tasks?${params.toString()}`, {
    method: "GET",
    token,
  }).then((response) => normalizePagedResponse(response, page, pageSize))
}

export function createTaskInGardenerJob(token: string, jobId: string, body: CreateTaskInJobRequest) {
  return apiRequest<TaskDto>(`/api/gardener/jobs/${jobId}/tasks`, {
    method: "POST",
    body,
    token,
  })
}

export function createGardenerTask(token: string, body: CreateTaskRequest) {
  return apiRequest<TaskDto>("/api/gardener/tasks", {
    method: "POST",
    body,
    token,
  })
}

export function getGardenerTaskById(token: string, taskId: string) {
  return apiRequest<TaskDto>(`/api/gardener/tasks/${taskId}`, {
    method: "GET",
    token,
  })
}

export function updateGardenerTask(token: string, taskId: string, body: UpdateTaskRequest) {
  return apiRequest<void>(`/api/gardener/tasks/${taskId}`, {
    method: "PUT",
    body,
    token,
  })
}

export function deleteGardenerTask(token: string, taskId: string) {
  return apiRequest<void>(`/api/gardener/tasks/${taskId}`, {
    method: "DELETE",
    token,
  })
}

// --- Task Types ---
export type TaskTypeDto = {
  id: string
  name: string
  gardenerId?: string
}

type RawTaskTypeDto = {
  id?: string
  taskTypeId?: string
  name?: string
  gardenerId?: string
}

export type CreateTaskTypeRequest = {
  name: string
}

type RawTaskTypeListResponse = {
  items?: RawTaskTypeDto[]
  data?: RawTaskTypeDto[]
  taskTypes?: RawTaskTypeDto[]
}

function normalizeTaskType(raw: RawTaskTypeDto | undefined): TaskTypeDto {
  return {
    id: raw?.id ?? raw?.taskTypeId ?? "",
    name: raw?.name ?? "",
    gardenerId: raw?.gardenerId,
  }
}

function normalizeTaskTypeList(
  raw: RawTaskTypeListResponse | RawTaskTypeDto[] | undefined,
): TaskTypeDto[] {
  const list = Array.isArray(raw)
    ? raw
    : raw?.items ?? raw?.data ?? raw?.taskTypes ?? []
  return list
    .map((item) => normalizeTaskType(item))
    .filter((item) => item.id.length > 0 && item.name.length > 0)
}

export function createAdminTaskType(
  token: string,
  gardenerId: string,
  body: CreateTaskTypeRequest,
) {
  const params = new URLSearchParams({ gardenerId })
  return apiRequest<RawTaskTypeDto>(`/api/admin/task-types?${params.toString()}`, {
    method: "POST",
    body,
    token,
  }).then((response) => normalizeTaskType(response))
}

export function getAdminTaskTypeById(token: string, taskTypeId: string) {
  return apiRequest<RawTaskTypeDto>(`/api/admin/task-types/${taskTypeId}`, {
    method: "GET",
    token,
  }).then((response) => normalizeTaskType(response))
}

export function deleteAdminTaskType(token: string, taskTypeId: string) {
  return apiRequest<void>(`/api/admin/task-types/${taskTypeId}`, {
    method: "DELETE",
    token,
  })
}

export function getAdminTaskTypesByGardener(token: string, gardenerId: string) {
  return apiRequest<RawTaskTypeListResponse | RawTaskTypeDto[]>(
    `/api/admin/task-types/gardener/${gardenerId}`,
    {
      method: "GET",
      token,
    },
  ).then((response) => normalizeTaskTypeList(response))
}

export function getGardenerTaskTypes(token: string) {
  return apiRequest<RawTaskTypeListResponse | RawTaskTypeDto[]>("/api/gardener/task-types", {
    method: "GET",
    token,
  }).then((response) => normalizeTaskTypeList(response))
}

// --- Gardener: Materials ---
export type MaterialDto = {
  materialId: string
  name: string
  amount: number
  amountType: string
  pricePerAmount: number
  createdAt?: string
}

export type CreateMaterialRequest = {
  name: string
  amount?: number
  amountType: string
  pricePerAmount: number
}

export type UpdateMaterialRequest = {
  name?: string
  amount?: number
  amountType?: string
  pricePerAmount?: number
}

export function createGardenerMaterial(token: string, body: CreateMaterialRequest) {
  return apiRequest<MaterialDto>("/api/gardener/materials", {
    method: "POST",
    body,
    token,
  })
}

export function getGardenerMaterials(token: string, page = 1, pageSize = 20) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  return apiRequest<RawPagedResponse<MaterialDto>>(`/api/gardener/materials?${params.toString()}`, {
    method: "GET",
    token,
  }).then((response) => normalizePagedResponse(response, page, pageSize))
}

export function getGardenerMaterialById(token: string, materialId: string) {
  return apiRequest<MaterialDto>(`/api/gardener/materials/${materialId}`, {
    method: "GET",
    token,
  })
}

export function updateGardenerMaterial(token: string, materialId: string, body: UpdateMaterialRequest) {
  return apiRequest<void>(`/api/gardener/materials/${materialId}`, {
    method: "PUT",
    body,
    token,
  })
}

export function deleteGardenerMaterial(token: string, materialId: string) {
  return apiRequest<void>(`/api/gardener/materials/${materialId}`, {
    method: "DELETE",
    token,
  })
}

// --- Admin: Relationships ---
export type RelationshipDto = {
  clientId: string
  gardenerId: string
  clientName?: string
  clientEmail?: string
  gardenerName?: string
  gardenerEmail?: string
  createdAt?: string
}

export type CreateRelationshipRequest = {
  clientId: string
  gardenerId: string
}

export function getAdminRelationships(token: string, page = 1, pageSize = 50) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  return apiRequest<PagedResponse<RelationshipDto>>(`/api/admin/relationships?${params.toString()}`, {
    method: "GET",
    token,
  })
}

export function getAdminRelationshipsByGardener(token: string, gardenerId: string, page = 1, pageSize = 50) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  return apiRequest<PagedResponse<RelationshipDto>>(`/api/admin/relationships/gardeners/${gardenerId}?${params.toString()}`, {
    method: "GET",
    token,
  })
}

export function getAdminRelationshipsByClient(token: string, clientId: string, page = 1, pageSize = 50) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  return apiRequest<PagedResponse<RelationshipDto>>(`/api/admin/relationships/clients/${clientId}?${params.toString()}`, {
    method: "GET",
    token,
  })
}

export function createAdminRelationship(token: string, body: CreateRelationshipRequest) {
  return apiRequest<RelationshipDto>("/api/admin/relationships", {
    method: "POST",
    body,
    token,
  })
}

export function deleteAdminRelationship(token: string, clientId: string, gardenerId: string) {
  return apiRequest<void>(`/api/admin/relationships/${clientId}/${gardenerId}`, {
    method: "DELETE",
    token,
  })
}

// --- Task Q&A ---

export type QuestionType = "FreeText" | "MultipleChoice"
export type QuestionStatus = "Pending" | "Answered"

export type QuestionOptionDto = {
  optionId: string
  text: string
}

export type QuestionAnswerDto = {
  answerId: string
  questionId: string
  text: string
  answeredAt: string
  answeredByName?: string
  mediaUrls?: string[]
}

export type TaskQuestionDto = {
  questionId: string
  taskId: string
  taskName?: string
  text: string
  type: QuestionType
  options?: QuestionOptionDto[]
  status: QuestionStatus
  createdAt: string
  askedByName?: string
  mediaUrls?: string[]
  answer?: QuestionAnswerDto
}

export type CreateQuestionRequest = {
  text: string
  type: QuestionType
  options?: string[]
}

type RawQuestionMedia = {
  mediaId: string
  mediaUrl: string
  mediaType: string
  fileName: string
}

type RawQuestionAnswerDto = {
  answerId: string
  clientId?: string
  answerText: string
  createdAt: string
  media?: RawQuestionMedia[]
}

type RawTaskQuestionDto = {
  questionId: string
  taskId: string
  questionText: string
  questionType: 0 | 1 | "FreeText" | "MultipleChoice"
  predefinedOptions?: string[] | null
  createdAt: string
  answers?: RawQuestionAnswerDto[]
  media?: RawQuestionMedia[]
}

function normalizeQuestion(raw: RawTaskQuestionDto): TaskQuestionDto {
  const firstAnswer = raw.answers?.[0]
  const toAbsoluteUrl = (url: string) => {
    try {
      const parsed = new URL(url)
      if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
        // Strip localhost origin so the path is served via the current origin
        // (Vite dev proxy forwards /uploads/* to the backend)
        return parsed.pathname + parsed.search
      }
    } catch {
      // not a valid URL — return as-is
    }
    return url
  }

  const isMultipleChoice = raw.questionType === 1 || raw.questionType === "MultipleChoice"
  return {
    questionId: raw.questionId,
    taskId: raw.taskId,
    text: raw.questionText,
    type: isMultipleChoice ? "MultipleChoice" : "FreeText",
    options: raw.predefinedOptions?.map((opt, i) => ({ optionId: String(i), text: opt })),
    status: (raw.answers?.length ?? 0) > 0 ? "Answered" : "Pending",
    createdAt: raw.createdAt,
    mediaUrls: raw.media?.map((m) => toAbsoluteUrl(m.mediaUrl)).filter(Boolean),
    answer: firstAnswer
      ? {
          answerId: firstAnswer.answerId,
          questionId: raw.questionId,
          text: firstAnswer.answerText,
          answeredAt: firstAnswer.createdAt,
          mediaUrls: firstAnswer.media?.map((m) => toAbsoluteUrl(m.mediaUrl)).filter(Boolean),
        }
      : undefined,
  }
}

export function getTaskQuestions(token: string, taskId: string): Promise<PagedResponse<TaskQuestionDto>> {
  return apiRequest<{ questions: RawTaskQuestionDto[] }>(`/api/tasks/${taskId}/questions`, {
    method: "GET",
    token,
  }).then((response) => {
    const items = (response?.questions ?? []).map(normalizeQuestion)
    return { items, total: items.length, page: 1, pageSize: items.length }
  })
}

export function createGardenerQuestion(token: string, taskId: string, body: CreateQuestionRequest) {
  return apiRequest<RawTaskQuestionDto>(`/api/tasks/${taskId}/questions`, {
    method: "POST",
    body: {
      questionText: body.text,
      questionType: body.type === "MultipleChoice" ? 1 : 0,
      predefinedOptions: body.options,
    },
    token,
  })
    .catch((err) => {
      const msg = err instanceof Error ? err.message.toLowerCase() : ""
      const isEnumError =
        msg.includes("questiontype") && (msg.includes("could not be converted") || msg.includes("json value"))
      if (!isEnumError) throw err
      // Some backend environments accept string enum values
      return apiRequest<RawTaskQuestionDto>(`/api/tasks/${taskId}/questions`, {
        method: "POST",
        body: {
          questionText: body.text,
          questionType: body.type,
          predefinedOptions: body.options,
        },
        token,
      })
    })
    .then((raw) => normalizeQuestion({ ...raw, answers: raw.answers ?? [] }))
}

export function answerClientQuestion(token: string, questionId: string, answerText: string) {
  return apiRequest<void>(`/api/questions/${questionId}/answers`, {
    method: "POST",
    body: { answerText },
    token,
  })
}

// --- Task Scheduling ---
export type TaskScheduleStatus = 
  | "Pending" 
  | "Approved" 
  | "Declined" 
  | "ProposedAlternative" 
  | "Rescheduled" 
  | "Cancelled"

export type TaskScheduleDto = {
  scheduleRequestId: string
  taskId: string
  taskName: string
  jobId: string
  gardenerId: string
  gardenerName: string
  clientId: string
  clientName: string
  scheduledAtUtc: string
  proposedAtUtc?: string
  approvedAtUtc?: string
  declinedAtUtc?: string
  status: TaskScheduleStatus
  createdAtUtc?: string
}

export type ScheduleTaskRequest = {
  taskId: string
  clientId: string
  scheduledAtUtc: string
}

export type ScheduleTaskResponse = {
  id: string
  taskId: string
  gardenerId: string
  clientId: string
  scheduledAtUtc: string
  status: TaskScheduleStatus
}

export type ApproveScheduleRequest = {
  scheduleRequestId: string
}

export type DeclineScheduleRequest = {
  scheduleRequestId: string
}

export type ProposeAlternativeTimeRequest = {
  scheduleRequestId: string
  proposedAtUtc: string
}

export type RescheduleTaskRequest = {
  scheduleRequestId: string
  rescheduledAtUtc: string
}

export type ScheduleCalendarResponse = {
  scheduledTasks: TaskScheduleDto[]
  totalCount: number
  page: number
  pageSize: number
}

// Gardener Scheduling Endpoints
export function gardenerScheduleTask(token: string, body: ScheduleTaskRequest) {
  return apiRequest<ScheduleTaskResponse>("/api/gardener/scheduling/schedule-task", {
    method: "POST",
    body,
    token,
  })
}

export function getGardenerSchedulingCalendar(token: string, page = 1, pageSize = 20) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  return apiRequest<ScheduleCalendarResponse>(`/api/gardener/scheduling/calendar?${params.toString()}`, {
    method: "GET",
    token,
  })
}

export function gardenerRescheduleTask(token: string, body: RescheduleTaskRequest) {
  return apiRequest<void>("/api/gardener/scheduling/reschedule-task", {
    method: "POST",
    body,
    token,
  })
}

// Client Scheduling Endpoints
export function getClientSchedulingCalendar(token: string, page = 1, pageSize = 20) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  return apiRequest<ScheduleCalendarResponse>(`/api/client/scheduling/calendar?${params.toString()}`, {
    method: "GET",
    token,
  })
}

export function clientApproveSchedule(token: string, body: ApproveScheduleRequest) {
  return apiRequest<void>("/api/client/scheduling/approve-schedule", {
    method: "POST",
    body,
    token,
  })
}

export function clientDeclineSchedule(token: string, body: DeclineScheduleRequest) {
  return apiRequest<void>("/api/client/scheduling/decline-schedule", {
    method: "POST",
    body,
    token,
  })
}

export function clientProposeAlternativeTime(token: string, body: ProposeAlternativeTimeRequest) {
  return apiRequest<void>("/api/client/scheduling/propose-alternative-time", {
    method: "POST",
    body,
    token,
  })
}