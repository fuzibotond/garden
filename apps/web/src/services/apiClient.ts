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

export function login(body: LoginRequest) {
  return apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body,
  })
}

export type RegisterGardenerRequest = {
  email: string
  password: string
  companyName: string
}

export function registerGardener(body: RegisterGardenerRequest) {
  return apiRequest<unknown>("/auth/register-gardener", {
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
  return apiRequest<Profile>("/auth/me", {
    method: "GET",
    token,
  })
}

export type UpdateProfileRequest = {
  companyName?: string
  name?: string
}

export function updateMyProfile(body: UpdateProfileRequest, token: string) {
  return apiRequest<Profile>("/auth/update", {
    method: "PUT",
    body,
    token,
  })
}

export function deleteMyProfile(token: string) {
  return apiRequest<void>("/auth/delete", {
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

// --- Admin: Gardeners ---
export type AdminGardenerDto = {
  gardenerId: string
  email: string
  companyName?: string
  contactName?: string
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

export function getAdminClientById(token: string, clientId: string) {
  return apiRequest<AdminClientDto>(`/api/admin/clients/${clientId}`, {
    method: "GET",
    token,
  })
}

export function createAdminClient(token: string, body: CreateClientRequest) {
  const payload = {
    ...body,
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
}

export function getGardenerClients(token: string, page = 1, pageSize = 20) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  return apiRequest<PagedResponse<GardenerClientDto>>(
    `/api/gardener/clients?${params}`,
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