# Scheduling Feature

**Project:** Garden Mobile App  
**Version:** 1.0.0  
**Last Updated:** 2026-04-24  
**Status:** Active

---

## Purpose

Documents the full scheduling workflow: how gardeners propose appointments, how clients respond, all status transitions, the modals involved, and which screens and API endpoints participate.

---

## Scope

Covers `app/(gardener)/schedule.tsx`, `app/(gardener)/tasks.tsx`, `app/(client)/schedule.tsx`, and the scheduling functions in `services/api.ts`.

---

## Definitions

| Term | Definition |
|------|------------|
| **Schedule Request** | An appointment proposal created by a gardener for a specific task and client |
| **Pending** | Request submitted by gardener, awaiting client response |
| **Approved** | Client accepted the proposed time |
| **Declined** | Client rejected the proposed time |
| **ProposedAlternative** | Client counter-proposed a different time |
| **Rescheduled** | Gardener accepted the client's counter-proposal with a new time |

---

## Status Type

```typescript
type ScheduleStatus =
  | 'Pending'
  | 'Approved'
  | 'Declined'
  | 'ProposedAlternative'
  | 'Rescheduled'
```

---

## Schedule Request DTO

```typescript
type TaskScheduleDto = {
  scheduleRequestId: string
  taskId: string
  jobId: string
  taskName: string
  gardenerId: string
  gardenerName: string
  clientId: string
  clientName: string
  scheduledAtUtc: string        // Gardener's original proposed time
  proposedAtUtc?: string        // Client's counter-proposed time (if ProposedAlternative)
  approvedAtUtc?: string
  declinedAtUtc?: string
  status: ScheduleStatus
  createdAtUtc: string
}
```

---

## Status Transition Diagram

```
[Gardener creates request]
        │
        ▼
    Pending
   /   │   \
  ▼    │    ▼
Approved  Declined   ProposedAlternative
                          │
                          ▼
                      Rescheduled
```

---

## Gardener Flow

### 1. Creating a Schedule Request

Located in `app/(gardener)/tasks.tsx` — the **Schedule Task modal**.

- Gardener taps a task → opens Schedule modal
- Selects a date and time via the native `DateTimePicker`
- The `clientId` of the task's job is automatically resolved
- On submit: `POST /api/gardener/scheduling/schedule-task`

**Request body:**
```json
{
  "taskId": "uuid",
  "clientId": "uuid",
  "scheduledAtUtc": "2026-04-25T10:00:00Z"
}
```

**Result:** Status → `Pending`. The client receives a push notification and email.

---

### 2. Viewing the Schedule Calendar

Located in `app/(gardener)/schedule.tsx`.

- Fetches via `GET /api/gardener/scheduling/calendar?page=1&pageSize=100`
- Displays requests grouped by status:

| Status | Visual treatment |
|--------|-----------------|
| Pending | Yellow indicator |
| ProposedAlternative | Blue indicator — **Reschedule** button shown |
| Approved / Rescheduled | Green indicator |
| Declined | Red indicator |

The tab bar badge shows the count of `ProposedAlternative` items (requiring gardener action).

---

### 3. Responding to ProposedAlternative

When the client proposes an alternative time:

- Gardener sees the request with a **Reschedule** button
- Opens the Reschedule modal — date/time picker pre-filled with `item.proposedAtUtc`
- On submit: `POST /api/gardener/scheduling/reschedule-task`

**Request body:**
```json
{
  "scheduleRequestId": "uuid",
  "rescheduledAtUtc": "2026-04-25T14:00:00Z"
}
```

**Result:** Status → `Rescheduled`.

---

## Client Flow

### 1. Viewing the Schedule Calendar

Located in `app/(client)/schedule.tsx`.

- Fetches via `GET /api/client/scheduling/calendar?page=1&pageSize=100`
- Items with status `Pending` show **Approve**, **Decline**, and **Propose Alternative** buttons
- The tab bar badge shows the count of `Pending` items

---

### 2. Approving

- Taps **Approve** on a `Pending` or `ProposedAlternative` item
- Calls `POST /api/client/scheduling/approve-schedule`
- **Result:** Status → `Approved`. Gardener receives a push notification.

---

### 3. Declining

- Taps **Decline** on a `Pending` item
- Calls `POST /api/client/scheduling/decline-schedule`
- **Result:** Status → `Declined`. Gardener receives a push notification.

---

### 4. Proposing an Alternative Time

- Taps **Propose Alternative** on a `Pending` item
- Opens the Propose Alternative modal — date/time picker
- On submit: `POST /api/client/scheduling/propose-alternative-time`

**Request body:**
```json
{
  "scheduleRequestId": "uuid",
  "proposedAtUtc": "2026-04-26T09:00:00Z"
}
```

**Result:** Status → `ProposedAlternative` with `proposedAtUtc` set. Gardener receives a push notification.

---

## API Endpoints

| Endpoint | Method | Actor | Description |
|----------|--------|-------|-------------|
| `/api/gardener/scheduling/calendar` | GET | Gardener | Get all schedule requests for gardener |
| `/api/gardener/scheduling/schedule-task` | POST | Gardener | Create new schedule request |
| `/api/gardener/scheduling/reschedule-task` | POST | Gardener | Accept client's alternative and set new time |
| `/api/client/scheduling/calendar` | GET | Client | Get all schedule requests for client |
| `/api/client/scheduling/approve-schedule` | POST | Client | Approve a Pending or ProposedAlternative request |
| `/api/client/scheduling/decline-schedule` | POST | Client | Decline a Pending request |
| `/api/client/scheduling/propose-alternative-time` | POST | Client | Counter-propose a different time |

All endpoints require a Bearer token in the `Authorization` header.

---

## Notes

- `scheduledAtUtc` always stores the gardener's last proposed time
- `proposedAtUtc` stores the client's counter-proposal; only set when status is `ProposedAlternative`
- The Reschedule modal pre-fills from `proposedAtUtc` so the gardener can accept the client's suggestion with one tap
- Backend validates that proposed times are in the future; the mobile app does not add a separate client-side validation

---

## Change Log

### [1.0.0] - 2026-04-24
- Initial scheduling documentation
