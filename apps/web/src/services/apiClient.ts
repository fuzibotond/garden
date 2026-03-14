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
    const message = await response.text().catch(() => "API request failed")
    throw new Error(message || "API request failed")
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
  return apiRequest<void>("/gardeners/delete", {
    method: "DELETE",
    token,
  })
}

export function logout(token: string) {
  return apiRequest<void>("/gardeners/logout", {
    method: "POST",
    token,
  })
}