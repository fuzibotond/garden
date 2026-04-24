# Notifications

**Project:** Garden Mobile App  
**Version:** 1.0.0  
**Last Updated:** 2026-04-24  
**Status:** Active

---

## Purpose

Documents the two-layer notification system: real-time push notifications delivered by Expo's push service when the app is closed, and polling-based local notifications that fire while the app is open.

---

## Scope

Covers `hooks/use-schedule-notifications.ts`, `hooks/use-schedule-notifications.web.ts`, `app/_layout.tsx` (NotificationSetup), the backend push endpoints, and the badge count logic in both tab layout files.

---

## Definitions

| Term | Definition |
|------|------------|
| **Push notification** | Delivered by Expo Push Service + APNs/FCM when app is backgrounded or closed |
| **Local notification** | Scheduled by the app itself via `expo-notifications` while app is open |
| **seenKeys** | An in-memory Set tracking `scheduleRequestId:status` pairs already notified |
| **Seed** | Pre-populating `seenKeys` from the current API state so existing items do not trigger notifications |

---

## Overview

The notification system has two layers that work together:

```
App closed / backgrounded
    └── Backend sends push via Expo Push API → APNs / FCM → device

App open / foregrounded
    └── Polling hook fetches calendar every 30s → fires local notification on new status transitions
```

When the user taps a push notification, the app navigates directly to the Schedule screen.

---

## Push Notification Layer

### Token Registration

Push token registration happens in `app/_layout.tsx` inside `NotificationSetup`:

1. On mount: `requestNotificationPermission()` requests the OS permission prompt
2. When `token` (JWT auth token) becomes set or changes: `registerExpoPushToken(authToken)` is called once
3. `registerExpoPushToken` does:
   - Returns immediately on web or non-physical device
   - Calls `requestNotificationPermission()` — returns early if denied
   - Reads `projectId` from `Constants.expoConfig.extra.eas.projectId` (set in `app.json`)
   - Calls `Notifications.getExpoPushTokenAsync({ projectId })` to retrieve the Expo token
   - POSTs the token to `POST /api/users/push-token`
   - All errors are caught silently — the app falls back to polling if registration fails

### Backend Flow

When a schedule status changes (approve, decline, or propose alternative):

1. The handler publishes `ScheduleRequestStatusChangedEvent` to RabbitMQ
2. `ScheduleStatusChangedConsumer` (background service) receives the event
3. Looks up the gardener's `ExpoPushToken` in the database
4. If a token exists, calls Expo Push API: `POST https://exp.host/--/api/v2/push/send`
5. Expo routes the notification to APNs (iOS) or FCM (Android)

Similarly, when a gardener creates a new schedule request:

1. `ScheduleRequestCreatedEvent` is published
2. `ScheduleRequestEmailConsumer` looks up the client's `ExpoPushToken`
3. Sends push to the client + sends email

### Notification Tap Handler

Defined in `app/_layout.tsx`:

```
Push tap received
    ├── data.type === 'schedule_request'  →  navigate to /(client)/schedule
    └── data.type === 'schedule_update'   →  navigate to /(gardener)/schedule
```

Navigation is role-aware: only the relevant screen is opened.

---

## Polling Layer

### Hook: `useScheduleNotifications`

File: `hooks/use-schedule-notifications.ts`

- Polls the calendar API every **30 seconds** (`POLL_INTERVAL_MS = 30_000`)
- Disabled on web platform (stub file handles this)
- Disabled for the Admin role

#### Notifications fired by the polling layer

**For Client role** — detects new `Pending` requests:

| Trigger | Title | Body |
|---------|-------|------|
| New `Pending` item | `"New appointment request 📅"` | `"${gardenerName} wants to schedule '${taskName}'"` |

**For Gardener role** — detects status transitions:

| Trigger | Title | Body |
|---------|-------|------|
| New `ProposedAlternative` | `"Client proposed a new time 🗓️"` | `"${clientName} suggested a different time for '${taskName}'"` |
| New `Approved` | `"Appointment confirmed ✅"` | `"${clientName} approved the appointment for '${taskName}'"` |
| New `Declined` | `"Appointment declined ❌"` | `"${clientName} declined the appointment for '${taskName}'"` |

---

## Deduplication — seenKeys

The `seenKeys` Set prevents the same event from firing more than once per session:

```typescript
const seenKeys = new Set<string>()
function key(id: string, status: string): string {
  return `${id}:${status}`
}
```

A notification is only sent when a key is **not** already in the set. After firing, the key is added.

### Seeding on Mount and Foreground Resume

On hook mount and on every foreground resume, `seedCurrentStatuses()` is called:

1. Fetches the full calendar from the API
2. Adds all current `scheduleRequestId:status` combinations to `seenKeys`
3. Does **not** fire any notifications

**Why this matters on foreground resume:** A push notification is delivered by the OS while the app is backgrounded. When the user opens the app, `AppState` fires `'active'`. Without seeding, the next poll would see the new status as "unseen" and fire a duplicate local notification. Seeding absorbs the state the push already reported.

### Flow

```
App backgrounded
    → OS delivers push notification ✓

User opens app
    → AppState 'active' fires
    → seedCurrentStatuses() fetches calendar
    → All current statuses added to seenKeys
    → Interval resumes — next poll only fires for genuinely new changes
```

---

## Badge Counts

Badge counts are maintained independently of the notification hook by each tab layout:

| File | Badge on | Count source |
|------|----------|-------------|
| `app/(client)/_layout.tsx` | Schedule tab | Count of `Pending` items from client calendar |
| `app/(gardener)/_layout.tsx` | Schedule tab | Count of `ProposedAlternative` items from gardener calendar |

Both poll every 30 seconds and refresh on foreground resume. The OS badge count (`setBadgeCountAsync`) is also updated on native platforms.

---

## Web Platform Stub

`hooks/use-schedule-notifications.web.ts` is loaded instead of the `.ts` file on the web platform. It exports:

- `requestNotificationPermission()` — returns `false`
- `registerExpoPushToken()` — no-op
- `useScheduleNotifications()` — no-op default export

This ensures `expo-notifications` (a native-only package) is never imported by the web bundler.

---

## Notes

- Push notifications require a physical device. Simulators can receive local notifications but not Expo push tokens.
- If push token registration fails (e.g., no network, or `projectId` missing), the app silently falls back to polling only. No error is shown to the user.
- The `projectId` in `app.json` (`extra.eas.projectId`) is required for `getExpoPushTokenAsync` in Expo SDK 49+. Without it, the call throws and is caught silently.
- In Expo Go (development), Expo's own push credentials are used. For standalone production builds, platform credentials (Apple Developer account for iOS, Firebase for Android) are required.

---

## Change Log

### [1.0.0] - 2026-04-24
- Initial notifications documentation
