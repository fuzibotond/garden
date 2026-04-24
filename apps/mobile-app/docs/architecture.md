# Architecture

**Project:** Garden Mobile App  
**Version:** 1.0.0  
**Last Updated:** 2026-04-24  
**Status:** Active

---

## Purpose

This document describes the architectural design, folder structure, navigation model, technology choices, and domain language of the Garden mobile application.

---

## Scope

Covers the Expo React Native application located at `apps/mobile-app`. Does not cover the backend (`src/Garden`).

---

## Architecture Style

**Modular Monolith** — a single Expo application with clear internal boundaries:

- Role-based routing isolates Client and Gardener concerns at the routing layer
- Context API manages global auth state (no Redux or external state library)
- Custom hooks encapsulate business logic away from screens
- A single service layer centralises all API communication and token storage
- Component-driven UI with a shared design system (GardenColors)

---

## Folder Structure

```
mobile-app/
├── app/                        # Expo Router file-based routing root
│   ├── _layout.tsx             # Root layout — AuthProvider, NotificationSetup, Stack
│   ├── index.tsx               # Auth guard / splash — redirects by role
│   ├── login.tsx               # Email + password login screen
│   ├── modal.tsx               # Generic modal shell (currently unused)
│   ├── (client)/               # Client-role route group (tab navigator)
│   │   ├── _layout.tsx         # Client tabs + pending badge count
│   │   ├── index.tsx           # Home dashboard
│   │   ├── jobs.tsx            # Jobs list
│   │   ├── schedule.tsx        # Schedule calendar + Approve/Decline/Propose modals
│   │   └── profile.tsx         # User profile
│   ├── (gardener)/             # Gardener-role route group (tab navigator)
│   │   ├── _layout.tsx         # Gardener tabs + proposal badge count
│   │   ├── index.tsx           # Home dashboard
│   │   ├── jobs.tsx            # Jobs list
│   │   ├── tasks.tsx           # Tasks list + Create/Schedule/Edit modals
│   │   ├── schedule.tsx        # Schedule calendar + Reschedule modal
│   │   ├── clients.tsx         # Client list
│   │   └── profile.tsx         # User profile
│   └── (tabs)/                 # Unused template tabs (Expo scaffold)
├── components/                 # Reusable UI components
│   ├── themed-text.tsx         # Text with GardenColors theming
│   ├── themed-view.tsx         # View with theme background
│   ├── parallax-scroll-view.tsx
│   ├── hello-wave.tsx
│   ├── haptic-tab.tsx          # Tab button with haptic feedback
│   ├── external-link.tsx
│   └── ui/
│       ├── icon-symbol.tsx     # SF Symbols (iOS) / SVG fallback (Android/web)
│       ├── icon-symbol.ios.tsx # iOS-specific icon implementation
│       └── collapsible.tsx     # Collapsible section component
├── context/
│   └── AuthContext.tsx         # Auth state: token, profile, role, signIn, signOut
├── hooks/
│   ├── use-schedule-notifications.ts       # Polling + local notifications + push token
│   ├── use-schedule-notifications.web.ts   # Web stub (no-op)
│   ├── use-color-scheme.ts
│   ├── use-color-scheme.web.ts
│   └── use-theme-color.ts
├── services/
│   ├── api.ts                  # HTTP client + all API endpoint functions
│   └── storage.ts              # SecureStore (native) / localStorage (web)
├── constants/
│   ├── api.ts                  # API_BASE_URL with env var + platform fallback
│   └── theme.ts                # GardenColors, Colors, Fonts
├── assets/images/              # App icons, splash screen, adaptive icons
├── docs/                       # Project documentation (this folder)
├── app.json                    # Expo config (EAS, plugins, permissions)
├── package.json
└── tsconfig.json
```

---

## Navigation Model

Navigation is file-based via `expo-router`. The root Stack has four named screens:

```
Stack
├── index          — Auth guard (redirects on mount, renders nothing)
├── login          — Login screen (unauthenticated)
├── (client)       — Tabs navigator for Client role
└── (gardener)     — Tabs navigator for Gardener role
```

The `index.tsx` splash screen evaluates `[isLoading, token, role]` and redirects:

| Condition | Redirect |
|-----------|----------|
| `isLoading` | Wait (renders nothing) |
| No `token` | `/login` |
| `role === 'Client'` | `/(client)/` |
| `role === 'Gardener'` | `/(gardener)/` |
| Unknown role | `/login` |

After login, `login.tsx` navigates to `/` (splash) — it never hardcodes a role destination. This avoids stale closure bugs.

---

## Authentication Flow

1. User submits email + password on `/login`
2. `signIn()` calls `POST /auth/login` → receives `{ accessToken }`
3. Token saved via `saveToken()`:
   - Native: `expo-secure-store`
   - Web: `localStorage`
4. `getMyProfile(token)` fetches profile + decodes JWT payload for the role claim
5. Role is extracted from `role` field or the Microsoft `claims/role` URI fallback
6. `AuthContext` updates `{ token, profile, role }` — triggers redirect in `index.tsx`

### AuthContext contract

```typescript
type Role = 'Gardener' | 'Client' | 'Admin'

type Profile = {
  id: string
  email: string
  role: string
  name?: string
  companyName?: string
}

type AuthContextValue = {
  token: string | null
  profile: Profile | null
  role: Role | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}
```

---

## Domain Language

The following terms have fixed meanings throughout the codebase and must never be swapped:

| Term | Definition |
|------|------------|
| **Task** | A unit of work created by a gardener, belonging to a job |
| **Job** | A project container owned by a client, assigned to a gardener |
| **Schedule Request** | An appointment proposal from a gardener to a client for a specific task |

---

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Expo | ~54.0.33 | React Native framework + tooling |
| React | 19.1.0 | UI rendering (React Compiler enabled) |
| React Native | 0.81.5 | Native layer |
| TypeScript | ~5.9.2 | Type safety |
| expo-router | ~6.0.23 | File-based navigation |
| expo-notifications | ~0.32.16 | Local + push notifications |
| expo-secure-store | ^55.0.13 | Secure token storage |
| expo-device | ~8.0.10 | Device detection (push token guard) |
| expo-constants | ~18.0.13 | Access `app.json` extras (EAS projectId) |
| @react-native-community/datetimepicker | 8.4.4 | Native date/time picker in modals |
| @react-navigation/bottom-tabs | ^7.4.0 | Tab navigator |

---

## Design System

All colours are defined in `constants/theme.ts` under `GardenColors`:

| Token | Value | Usage |
|-------|-------|-------|
| `bgRoot` | `#07140c` | Primary dark background |
| `bgSurface` | `rgba(17,40,24,0.92)` | Surface panels |
| `bgSurfaceSoft` | `rgba(21,56,33,0.86)` | Softer surface variant |
| `accent` | `#d9ff6a` | Lime-green — buttons, active tabs, icons |
| `accentSoft` | `rgba(217,255,106,0.2)` | Transparent accent overlay |
| `textPrimary` | `#f7f8f4` | Main text |
| `textMuted` | `#c0c7b8` | Secondary / hint text |
| `borderSubtle` | `rgba(255,255,255,0.08)` | Dividers and borders |
| `cardBg` | `rgba(17,40,24,0.85)` | Card and modal backgrounds |
| `cardBorder` | `rgba(190,255,171,0.14)` | Card border |
| `success` | `#4ade80` | Approved / confirmed states |
| `warning` | `#f59e0b` | Pending / awaiting action |
| `error` | `#ef4444` | Declined / failed states |

The app has a single dark theme — `Colors.light` and `Colors.dark` both map to GardenColors values.

---

## Environment Configuration

The API base URL is resolved at runtime in `constants/api.ts`:

```typescript
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? Platform.select({
  android: 'http://10.0.2.2:5055',
  default:  'http://localhost:5055',
})) as string
```

| Scenario | Set `EXPO_PUBLIC_API_URL` to |
|----------|------------------------------|
| iOS/Android physical device | ngrok tunnel or LAN IP |
| Android emulator | (not needed — uses `10.0.2.2`) |
| Web / iOS simulator | (not needed — uses `localhost`) |

When the URL contains `ngrok`, the HTTP client automatically injects `ngrok-skip-browser-warning: true` to bypass the ngrok interstitial page.

The EAS project ID is stored in `app.json` under `extra.eas.projectId` and is read at runtime by `expo-constants` for push token registration.

---

## Change Log

### [1.0.0] - 2026-04-24
- Initial architecture documentation
