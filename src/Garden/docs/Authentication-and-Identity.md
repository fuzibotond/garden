Authentication & Identity — Design and Migration Guide

Overview

This document describes the minimal, safe refactor that centralizes authentication in `Garden.Modules.Identity` and introduces role-based identity (Client, Gardener, Admin). The change keeps gardener business logic in the Gardeners module while providing a shared login surface and role-aware JWTs.

Key goals
- Shared auth endpoints in `Garden.Modules.Identity`
- JWT contains role claims so `Authorize(Roles = ...)` works
- `ICurrentUser` exposes `Roles` for application code
- `IAuthService` abstraction keeps Identity decoupled from persistence
- Backwards compatible token API to minimize breaking changes

Roles
- `Garden.Modules.Identity.Roles.Gardener`
- `Garden.Modules.Identity.Roles.Client`
- `Garden.Modules.Identity.Roles.Admin`

Main API endpoints
- `POST /auth/login` — shared login (Identity module)
  - Request: `LoginRequest { Email, Password }`
  - Response: `LoginResponse { AccessToken, RefreshToken }`
- Existing gardener endpoints (`/gardeners/login`) can remain during migration.

Token contents
- Standard claims: `sub`, `email`, `ClaimTypes.NameIdentifier`, `ClaimTypes.Email`
- Role claims: `ClaimTypes.Role` for each role supplied when the token is created

Important interfaces and services
- `ICurrentUser` (updated): exposes `UserId`, `Email`, `IsAuthenticated`, and `IReadOnlyCollection<string> Roles`.
  - `CurrentUserService` reads role claims via `ClaimTypes.Role`.

- `IJwtTokenService` (backwards-compatible):
  - `string GenerateToken(Guid userId, string email)` (existing)
  - `string GenerateToken(Guid userId, string email, IEnumerable<string> roles)` (new)
  - `JwtTokenService` implements both; the three-arg version includes role claims.

- `IAuthService` (new abstraction in Identity):
  - `AuthenticateAsync(email, password) -> (UserId, Email, Roles, RefreshToken)`
  - Identity's `LoginHandler` uses `IAuthService` and `IJwtTokenService` to create tokens.

Gardener-specific implementation
- `Garden.Modules.Gardeners.Services.GardenerAuthService` implements `IAuthService`.
  - Authenticates using `GardenDbContext.Gardeners`, `IPasswordHasher<GardenerRecord>`, and `IRefreshTokenService`.
  - Returns `Roles.Gardener` when a gardener authenticates.
  - Persists `RefreshTokenRecord` to the gardeners refresh token table.

Backward compatibility & migration strategy
1. Add shared endpoint `POST /auth/login` (Identity). It uses `IAuthService` implemented by the gardeners module.
2. Keep `POST /gardeners/login` in place. Update it to call the shared token generator (it already does in the refactor).
3. Once clients use `/auth/login`, remove/deprecate gardener-specific login endpoints.

How to add `Client` or `Admin` support
- Implement `IAuthService` in the appropriate module (e.g., `Garden.Modules.Clients.Services.ClientAuthService`) to authenticate clients and return `Roles.Client`.
- Optionally implement a composite `IAuthService` that checks all user stores and returns the correct roles.

Authorization usage examples
- Require a role on a minimal API endpoint:
  - `app.MapGet("/admin/..., [Authorize(Roles = Roles.Admin)] async (...) => ...)`
- Check roles in code via `ICurrentUser.Roles`.

Files changed / added (high level)
- Edited: `ICurrentUser.cs`, `CurrentUserService.cs`, `IJwtTokenService.cs`, `JwtTokenService.cs` (added roles handling)
- Added: `Roles.cs`, `Services/IAuthService.cs`, `Features/Auth/*` (LoginRequest/LoginResponse/LoginHandler/LoginEndpoint)
- Added: `Garden.Modules.Gardeners/Services/GardenerAuthService.cs`
- Updated existing gardener handlers to pass role information when creating tokens (where appropriate)

Testing notes
- Update test helpers to match new signatures (e.g. `FakeJwtTokenService.GenerateToken(..., roles)` and `FakeCurrentUser.Roles`).
- Add tests for `LoginHandler` using a fake `IAuthService` to cover role behavior.

Assumptions
- Existing refresh token persistence remains gardener-scoped for now; `IAuthService` implementations are responsible for creating refresh tokens in the appropriate tables.
- This refactor is intentionally minimal: it introduces the shared auth surface and role claims without changing how user stores are structured.

Next actions (suggested)
- Add `ClientAuthService` and seed an `Admin` account if admin operations are needed immediately.
- Add integration tests for `/auth/login` and role-based authorization scenarios.

If you want, I can commit an additional document that shows example HTTP requests and a small migration checklist in CI/CD to apply these changes to production environments.