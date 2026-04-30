/**
 * Helpers to build realistic (but unsigned) JWT tokens for use in tests.
 *
 * The token structure mirrors what the real backend produces so that
 * parseClaimsFromToken() in auth.ts parses them correctly.
 */

const CLAIM_EMAIL = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
const CLAIM_NAME_ID = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
const CLAIM_ROLE = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"

function base64url(input: string): string {
  return btoa(input).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
}

export type TokenRole = "Admin" | "Gardener" | "Client"

interface TokenOptions {
  sub?: string
  email?: string
  roles: TokenRole[]
  name?: string
  companyName?: string
}

export function makeToken(opts: TokenOptions): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const payload = base64url(
    JSON.stringify({
      [CLAIM_NAME_ID]: opts.sub ?? "user-123",
      [CLAIM_EMAIL]: opts.email ?? "user@test.com",
      [CLAIM_ROLE]: opts.roles.length === 1 ? opts.roles[0] : opts.roles,
      name: opts.name,
      companyName: opts.companyName,
    }),
  )
  // Signature is intentionally a placeholder – tests never verify it
  return `${header}.${payload}.test-signature`
}

export const ADMIN_TOKEN = makeToken({
  sub: "admin-001",
  email: "admin@garden.test",
  roles: ["Admin"],
  name: "Admin User",
})

export const GARDENER_TOKEN = makeToken({
  sub: "gardener-001",
  email: "gardener@garden.test",
  roles: ["Gardener"],
  name: "Green Thumb",
  companyName: "Best Lawns Ltd",
})

export const CLIENT_TOKEN = makeToken({
  sub: "client-001",
  email: "client@garden.test",
  roles: ["Client"],
  name: "Jane Client",
})

export const MULTI_ROLE_TOKEN = makeToken({
  sub: "admin-gardener-001",
  email: "super@garden.test",
  roles: ["Admin", "Gardener"],
  name: "Super User",
})
