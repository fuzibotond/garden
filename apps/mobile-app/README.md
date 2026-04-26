# Garden Mobile App

## Description

The Garden mobile app connects gardeners and their clients. Gardeners manage jobs, tasks, and scheduling; clients review and respond to appointment requests. The app delivers real-time push notifications when schedule statuses change and falls back to 30-second polling while open. Closed jobs generate invoices that both gardeners and clients can download and view.

---

## Tech Stack

- **Expo ~54** — React Native framework
- **React 19** with React Compiler
- **React Native 0.81.5**
- **TypeScript ~5.9**
- **expo-router ~6** — file-based navigation
- **expo-notifications** — local + Expo push notifications
- **expo-secure-store** — secure JWT storage
- **@react-native-community/datetimepicker** — native date/time picker
- **fetch API** — HTTP client (no third-party library)

---

## Getting Started

### Prerequisites

- Node.js 20+
- [Expo Go](https://expo.dev/go) installed on your physical device (iOS or Android)
- Backend running (see `src/Garden`) and accessible from your device

### Install dependencies

```bash
npm install
```

### Configure the API URL

Create a `.env` file in this folder:

```
EXPO_PUBLIC_API_URL=https://your-ngrok-url.ngrok-free.app
```

Use [ngrok](https://ngrok.com) to expose the local backend to your physical device:

```bash
ngrok http 5055
```

> For Android emulator, no `.env` is needed — the app defaults to `http://10.0.2.2:5055`.

---

## Running the Project

```bash
# Start Metro bundler (opens QR code for Expo Go)
npm start

# Android emulator
npm run android

# iOS simulator
npm run ios

# Web
npm run web
```

Scan the QR code with Expo Go on a physical device. Push notifications only work on physical devices.

---

## Project Structure

```
app/              # Screens and navigation (expo-router file-based routing)
  (client)/       # Client-role tabs: home, jobs, schedule, profile
  (gardener)/     # Gardener-role tabs: home, jobs, tasks, clients, schedule, profile
  _layout.tsx     # Root layout — auth provider + notification setup
  index.tsx       # Auth guard — redirects by role
  login.tsx       # Login screen
components/       # Reusable UI components
context/          # AuthContext — token, profile, role, signIn, signOut
hooks/            # Custom hooks (notifications, color scheme)
services/         # api.ts (all API calls), storage.ts (token persistence)
constants/        # api.ts (base URL), theme.ts (GardenColors design tokens)
docs/             # Project documentation
```

---

## Features

**For Gardeners:**
- Create and manage jobs
- Track tasks and materials
- Schedule tasks with clients
- Ask questions and attach media
- View and download job invoices

**For Clients:**
- Accept, decline, or propose alternative times for appointments
- Answer gardener questions with photo attachments
- View tasks and completion progress
- Download invoices for closed jobs

**Core Capabilities:**
- Real-time push notifications for schedule updates
- Fallback polling (30s) when app is open
- Q&A system with media support
- Role-based access control
- Secure JWT token storage

---

**Modular Monolith** — single Expo app with role-based route groups:

- `/(client)` — Client screens
- `/(gardener)` — Gardener screens
- Auth state managed by `AuthContext` (Context API, no Redux)
- Service layer in `services/api.ts` centralises all HTTP calls
- Two-layer notifications: Expo push (background) + polling local notifications (foreground)

See [docs/architecture.md](docs/architecture.md) for full details.

---

## Documentation

| Document | Description |
|----------|-------------|
| [docs/architecture.md](docs/architecture.md) | Folder structure, navigation, auth flow, design system, environment config |
| [docs/scheduling.md](docs/scheduling.md) | Scheduling workflow, status transitions, modals, API endpoints |
| [docs/notifications.md](docs/notifications.md) | Push notifications, polling, deduplication, badge counts |
| [docs/api.md](docs/api.md) | Full API reference — all functions, types, request/response shapes |
| [docs/ai-rule.md](docs/ai-rule.md) | AI development rules (naming, no duplication, versioning) |

