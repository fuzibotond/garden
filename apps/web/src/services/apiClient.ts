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
  return apiRequest<LoginResponse>("/auth/login", {
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
  return apiRequest<unknown>("/auth/register/gardener", {
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
  return apiRequest<unknown>("/auth/register/client", {
    method: "POST",
    body,
  })
}

export type AdminCreateClientRequest = {
  email: string
  name: string
}

export function adminCreateClient(body: AdminCreateClientRequest, adminToken: string) {
  return apiRequest<unknown>("/auth/admin/create-client", {
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
  return apiRequest<Profile>("/auth/profile", {
    method: "GET",
    token,
  })
}

export type UpdateProfileRequest = {
  companyName?: string
  name?: string
}

export function updateMyProfile(body: UpdateProfileRequest, token: string) {
  return apiRequest<Profile>("/auth/profile", {
    method: "PUT",
    body,
    token,
  })
}

export function deleteMyProfile(token: string) {
  return apiRequest<void>("/auth/profile", {
    method: "DELETE",
    token,
  })
}

export function logout(token: string) {
  return apiRequest<void>("/auth/logout", {
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

export function getGardenerJobById(token: string, jobId: string) {
  return apiRequest<RawJobDto>(`/api/gardener/jobs/${jobId}`, {
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

// --- Gardener: Tasks ---
export type TaskDto = {
  taskId: string
  jobId: string
  taskTypeId?: string
  name: string
  description?: string
  estimatedTimeMinutes?: number
  actualTimeMinutes?: number
  startedAt?: string
  finishedAt?: string
}

export type CreateTaskRequest = {
  jobId: string
  taskTypeId: string
  name: string
  description?: string
  estimatedTimeMinutes?: number
}

export type CreateTaskInJobRequest = {
  taskTypeId: string
  name: string
  description?: string
  estimatedTimeMinutes?: number
}

export type UpdateTaskRequest = {
  name?: string
  description?: string
  actualTimeMinutes?: number
  startedAt?: string
  finishedAt?: string
}

export function getGardenerJobTasks(token: string, jobId: string, page = 1, pageSize = 20) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  return apiRequest<RawPagedResponse<TaskDto>>(`/api/gardener/jobs/${jobId}/tasks?${params.toString()}`, {
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
  amount: number
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