export type Role = "Admin" | "Gardener" | "Client"

export type AuthClaims = {
  sub: string
  email?: string
  roles: Role[]
  primaryRole: Role
  companyName?: string
  name?: string
  raw: unknown
}

export function getAccessToken(): string | null {
  return localStorage.getItem("accessToken")
}

export function clearAccessToken() {
  localStorage.removeItem("accessToken")
}

export function parseClaimsFromToken(token: string): AuthClaims | null {
  try {
    const [, payload] = token.split(".")

    if (!payload) {
      return null
    }

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/")
    const json = atob(normalized)
    const raw = JSON.parse(json) as Record<string, unknown>

    const emailClaimKey = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
    const nameIdKey = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
    const roleClaimKey = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"

    const emailValue = raw[emailClaimKey]
    const email =
      typeof emailValue === "string"
        ? emailValue
        : Array.isArray(emailValue) && typeof emailValue[0] === "string"
          ? emailValue[0]
          : undefined

    const sub = (raw[nameIdKey] as string | undefined) ?? (raw.sub as string | undefined)
    if (!sub) {
      return null
    }

    const roleValue = raw[roleClaimKey] ?? raw.role
    const roleStrings: string[] =
      typeof roleValue === "string"
        ? [roleValue]
        : Array.isArray(roleValue)
          ? roleValue.filter((value): value is string => typeof value === "string")
          : []

    const roles = (["Admin", "Gardener", "Client"] as Role[]).filter((roleOption) =>
      roleStrings.includes(roleOption),
    )

    const primaryRole: Role =
      (roles.includes("Admin") && "Admin") ||
      (roles.includes("Gardener") && "Gardener") ||
      (roles.includes("Client") && "Client") ||
      "Client"

    return {
      sub,
      email,
      roles,
      primaryRole,
      companyName: raw.companyName as string | undefined,
      name: raw.name as string | undefined,
      raw,
    }
  } catch {
    return null
  }
}

export function getCurrentUser(): AuthClaims | null {
  const token = getAccessToken()
  if (!token) {
    return null
  }

  return parseClaimsFromToken(token)
}

export function hasRole(user: AuthClaims | null, role: Role): boolean {
  if (!user) return false
  return user.roles.includes(role)
}

