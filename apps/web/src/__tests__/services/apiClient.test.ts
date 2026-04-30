import { describe, it, expect } from "vitest"
import { http, HttpResponse } from "msw"
import { server } from "../mocks/server"
import { login, apiGet, getNumberOfAdminGardeners } from "../../services/apiClient"
import { ADMIN_TOKEN } from "../mocks/tokens"

const BASE = "http://localhost:5000"

// ── Successful responses ──────────────────────────────────────────────────────

describe("login()", () => {
  it("returns an accessToken on valid credentials", async () => {
    const result = await login({ email: "admin@garden.test", password: "password" })

    expect(result.accessToken).toBeDefined()
    expect(typeof result.accessToken).toBe("string")
    expect(result.accessToken.length).toBeGreaterThan(0)
  })

  it("throws an Error with the backend message on 401", async () => {
    await expect(login({ email: "wrong@test.com", password: "bad" })).rejects.toThrow(
      "Invalid credentials",
    )
  })

  it("throws when the backend returns a plain-text error body", async () => {
    server.use(
      http.post(`${BASE}/auth/login`, () =>
        new HttpResponse("Service unavailable", { status: 503 }),
      ),
    )

    await expect(login({ email: "a@b.com", password: "p" })).rejects.toThrow(
      "Service unavailable",
    )
  })

  it("falls back to 'API request failed' when body is empty", async () => {
    server.use(
      http.post(`${BASE}/auth/login`, () => new HttpResponse(null, { status: 500 })),
    )

    await expect(login({ email: "a@b.com", password: "p" })).rejects.toThrow(
      "API request failed",
    )
  })
})

// ── apiGet ────────────────────────────────────────────────────────────────────

describe("apiGet()", () => {
  it("sends Authorization header when a token is provided", async () => {
    let capturedAuth: string | null = null

    server.use(
      http.get(`${BASE}/api/admin/gardeners/total`, ({ request }) => {
        capturedAuth = request.headers.get("Authorization")
        return HttpResponse.json({ numItems: 5 })
      }),
    )

    await apiGet<{ numItems: number }>("/api/admin/gardeners/total", ADMIN_TOKEN)

    expect(capturedAuth).toBe(`Bearer ${ADMIN_TOKEN}`)
  })

  it("does NOT send Authorization header when token is null", async () => {
    let capturedAuth: string | null = "present"

    server.use(
      http.get(`${BASE}/api/admin/gardeners/total`, ({ request }) => {
        capturedAuth = request.headers.get("Authorization")
        return HttpResponse.json({ numItems: 0 })
      }),
    )

    await apiGet<{ numItems: number }>("/api/admin/gardeners/total", null)

    expect(capturedAuth).toBeNull()
  })

  it("returns undefined for a 204 response without a body", async () => {
    server.use(
      http.get(`${BASE}/api/empty-endpoint`, () => new HttpResponse(null, { status: 204 })),
    )

    const result = await apiGet("/api/empty-endpoint", ADMIN_TOKEN)

    expect(result).toBeUndefined()
  })

  it("prefers the JSON message field over the raw body text for errors", async () => {
    server.use(
      http.get(`${BASE}/api/admin/gardeners/total`, () =>
        HttpResponse.json({ message: "Not authorised" }, { status: 403 }),
      ),
    )

    await expect(apiGet("/api/admin/gardeners/total", ADMIN_TOKEN)).rejects.toThrow(
      "Not authorised",
    )
  })
})

// ── getNumberOfAdminGardeners ─────────────────────────────────────────────────

describe("getNumberOfAdminGardeners()", () => {
  it("returns the numItems count from the backend", async () => {
    const result = await getNumberOfAdminGardeners(ADMIN_TOKEN)

    expect(result.numItems).toBe(5)
  })

  it("throws when the request fails", async () => {
    server.use(
      http.get(`${BASE}/api/admin/gardeners/total`, () =>
        HttpResponse.json({ message: "Forbidden" }, { status: 403 }),
      ),
    )

    await expect(getNumberOfAdminGardeners("bad-token")).rejects.toThrow("Forbidden")
  })
})
