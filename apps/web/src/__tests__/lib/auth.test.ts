import { describe, it, expect, beforeEach } from "vitest"
import {
  parseClaimsFromToken,
  getAccessToken,
  clearAccessToken,
  getCurrentUser,
  hasRole,
  type Role,
} from "../../lib/auth"
import { makeToken, ADMIN_TOKEN, GARDENER_TOKEN, CLIENT_TOKEN, MULTI_ROLE_TOKEN } from "../mocks/tokens"

// ── parseClaimsFromToken ──────────────────────────────────────────────────────

describe("parseClaimsFromToken", () => {
  it("parses Admin role and claims from a valid token", () => {
    const claims = parseClaimsFromToken(ADMIN_TOKEN)

    expect(claims).not.toBeNull()
    expect(claims!.sub).toBe("admin-001")
    expect(claims!.email).toBe("admin@garden.test")
    expect(claims!.roles).toContain("Admin")
    expect(claims!.primaryRole).toBe("Admin")
  })

  it("parses Gardener role correctly", () => {
    const claims = parseClaimsFromToken(GARDENER_TOKEN)

    expect(claims).not.toBeNull()
    expect(claims!.roles).toContain("Gardener")
    expect(claims!.primaryRole).toBe("Gardener")
    expect(claims!.companyName).toBe("Best Lawns Ltd")
  })

  it("parses Client role correctly", () => {
    const claims = parseClaimsFromToken(CLIENT_TOKEN)

    expect(claims).not.toBeNull()
    expect(claims!.roles).toContain("Client")
    expect(claims!.primaryRole).toBe("Client")
  })

  it("assigns Admin as primaryRole when both Admin and Gardener roles are present", () => {
    const claims = parseClaimsFromToken(MULTI_ROLE_TOKEN)

    expect(claims).not.toBeNull()
    expect(claims!.roles).toContain("Admin")
    expect(claims!.roles).toContain("Gardener")
    expect(claims!.primaryRole).toBe("Admin")
  })

  it("returns null for a completely malformed token", () => {
    expect(parseClaimsFromToken("not.a.token")).toBeNull()
  })

  it("returns null when the token has no sub claim", () => {
    // Build a payload that intentionally omits the nameidentifier claim
    const token = makeToken({ sub: "", email: "x@test.com", roles: ["Client"] })
    // Replace sub to empty string — the function should return null
    const withoutSub = token.replace(
      /"http:\/\/schemas\.xmlsoap.*?nameidentifier":"[^"]*"/,
      '"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier":""',
    )
    expect(parseClaimsFromToken(withoutSub)).toBeNull()
  })

  it("returns null for an empty string", () => {
    expect(parseClaimsFromToken("")).toBeNull()
  })

  it("handles a token with a single-string role claim (not an array)", () => {
    // makeToken already produces single-string for single-role — verify the path
    const token = makeToken({ sub: "u-1", email: "a@b.com", roles: ["Gardener"] })
    const claims = parseClaimsFromToken(token)

    expect(claims!.roles).toEqual(["Gardener"])
  })

  it("ignores unrecognised role strings", () => {
    // Inject a custom claim value directly in the payload to test the filter
    const raw = {
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier": "u-x",
      "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": ["Admin", "SuperHero"],
    }
    const payload = btoa(JSON.stringify(raw))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
    const token = `eyJhbGciOiJIUzI1NiJ9.${payload}.sig`
    const claims = parseClaimsFromToken(token)

    expect(claims!.roles).toEqual(["Admin"])
    expect(claims!.roles).not.toContain("SuperHero")
  })
})

// ── getAccessToken / clearAccessToken ─────────────────────────────────────────

describe("getAccessToken", () => {
  it("returns null when localStorage is empty", () => {
    expect(getAccessToken()).toBeNull()
  })

  it("returns the stored token", () => {
    localStorage.setItem("accessToken", ADMIN_TOKEN)
    expect(getAccessToken()).toBe(ADMIN_TOKEN)
  })
})

describe("clearAccessToken", () => {
  it("removes the token from localStorage", () => {
    localStorage.setItem("accessToken", ADMIN_TOKEN)
    clearAccessToken()
    expect(localStorage.getItem("accessToken")).toBeNull()
  })
})

// ── getCurrentUser ────────────────────────────────────────────────────────────

describe("getCurrentUser", () => {
  beforeEach(() => localStorage.clear())

  it("returns null when no token is stored", () => {
    expect(getCurrentUser()).toBeNull()
  })

  it("returns parsed claims for a stored admin token", () => {
    localStorage.setItem("accessToken", ADMIN_TOKEN)
    const user = getCurrentUser()

    expect(user).not.toBeNull()
    expect(user!.primaryRole).toBe("Admin")
  })

  it("returns null when the stored token is invalid", () => {
    localStorage.setItem("accessToken", "garbage.garbage.garbage")
    expect(getCurrentUser()).toBeNull()
  })
})

// ── hasRole ───────────────────────────────────────────────────────────────────

describe("hasRole", () => {
  it("returns true when the user has the queried role", () => {
    const claims = parseClaimsFromToken(ADMIN_TOKEN)!
    expect(hasRole(claims, "Admin")).toBe(true)
  })

  it("returns false when the user does not have the queried role", () => {
    const claims = parseClaimsFromToken(CLIENT_TOKEN)!
    expect(hasRole(claims, "Admin")).toBe(false)
    expect(hasRole(claims, "Gardener")).toBe(false)
  })

  it("returns false for null user", () => {
    expect(hasRole(null, "Admin")).toBe(false)
  })

  it("returns true for multi-role user querying any of their roles", () => {
    const claims = parseClaimsFromToken(MULTI_ROLE_TOKEN)!
    const roles: Role[] = ["Admin", "Gardener"]
    roles.forEach((role) => expect(hasRole(claims, role)).toBe(true))
  })
})
