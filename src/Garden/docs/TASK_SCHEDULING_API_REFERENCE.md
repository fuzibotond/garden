# Task Scheduling API Quick Reference

## Base URLs
- **Gardener endpoints:** `/api/gardener/scheduling`
- **Client endpoints:** `/api/client/scheduling`

## Gardener Endpoints

### 1. Schedule a Task
```
POST /api/gardener/scheduling/schedule-task
Authorization: Bearer {token}
Content-Type: application/json

{
  "taskId": "12345678-1234-1234-1234-123456789012",
  "clientId": "87654321-4321-4321-4321-210987654321",
  "scheduledAtUtc": "2024-12-15T14:00:00Z"
}

Response 201:
{
  "scheduleRequestId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "taskId": "12345678-1234-1234-1234-123456789012",
  "clientId": "87654321-4321-4321-4321-210987654321",
  "scheduledAtUtc": "2024-12-15T14:00:00Z",
  "status": "Pending",
  "createdAtUtc": "2024-12-10T10:00:00Z"
}
```

### 2. View Gardener Calendar
```
GET /api/gardener/scheduling/calendar?page=1&pageSize=20
Authorization: Bearer {token}

Response 200:
{
  "scheduledTasks": [
    {
      "scheduleRequestId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      "taskId": "12345678-1234-1234-1234-123456789012",
      "jobId": "99999999-9999-9999-9999-999999999999",
      "taskName": "Trim hedges",
      "gardenerId": "11111111-1111-1111-1111-111111111111",
      "gardenerName": "John Doe",
      "clientId": "87654321-4321-4321-4321-210987654321",
      "clientName": "Alice Johnson",
      "scheduledAtUtc": "2024-12-15T14:00:00Z",
      "proposedAtUtc": null,
      "approvedAtUtc": null,
      "declinedAtUtc": null,
      "status": "Pending",
      "createdAtUtc": "2024-12-10T10:00:00Z"
    }
  ],
  "totalCount": 1,
  "page": 1,
  "pageSize": 20
}
```

### 3. Reschedule a Task
```
POST /api/gardener/scheduling/reschedule-task
Authorization: Bearer {token}
Content-Type: application/json

{
  "scheduleRequestId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "rescheduledAtUtc": "2024-12-16T10:00:00Z"
}

Response 200:
{
  "scheduleRequestId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "taskId": "12345678-1234-1234-1234-123456789012",
  "jobId": "99999999-9999-9999-9999-999999999999",
  "taskName": "Trim hedges",
  "gardenerId": "11111111-1111-1111-1111-111111111111",
  "gardenerName": "John Doe",
  "clientId": "87654321-4321-4321-4321-210987654321",
  "clientName": "Alice Johnson",
  "scheduledAtUtc": "2024-12-16T10:00:00Z",
  "proposedAtUtc": null,
  "approvedAtUtc": null,
  "declinedAtUtc": null,
  "status": "Rescheduled",
  "createdAtUtc": "2024-12-10T10:00:00Z"
}
```

---

## Client Endpoints

### 1. View Schedule Requests
```
GET /api/client/scheduling/calendar?page=1&pageSize=20
Authorization: Bearer {token}

Response 200:
{
  "scheduledTasks": [
    {
      "scheduleRequestId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      "taskId": "12345678-1234-1234-1234-123456789012",
      "jobId": "99999999-9999-9999-9999-999999999999",
      "taskName": "Trim hedges",
      "gardenerId": "11111111-1111-1111-1111-111111111111",
      "gardenerName": "John Doe",
      "clientId": "87654321-4321-4321-4321-210987654321",
      "clientName": "Alice Johnson",
      "scheduledAtUtc": "2024-12-15T14:00:00Z",
      "proposedAtUtc": null,
      "approvedAtUtc": null,
      "declinedAtUtc": null,
      "status": "Pending",
      "createdAtUtc": "2024-12-10T10:00:00Z"
    }
  ],
  "totalCount": 1,
  "page": 1,
  "pageSize": 20
}
```

### 2. Approve Schedule
```
POST /api/client/scheduling/approve-schedule
Authorization: Bearer {token}
Content-Type: application/json

{
  "scheduleRequestId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
}

Response 200:
{
  "scheduleRequestId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "taskId": "12345678-1234-1234-1234-123456789012",
  "jobId": "99999999-9999-9999-9999-999999999999",
  "taskName": "Trim hedges",
  "gardenerId": "11111111-1111-1111-1111-111111111111",
  "gardenerName": "John Doe",
  "clientId": "87654321-4321-4321-4321-210987654321",
  "clientName": "Alice Johnson",
  "scheduledAtUtc": "2024-12-15T14:00:00Z",
  "proposedAtUtc": null,
  "approvedAtUtc": "2024-12-10T11:30:00Z",
  "declinedAtUtc": null,
  "status": "Approved",
  "createdAtUtc": "2024-12-10T10:00:00Z"
}
```

### 3. Decline Schedule
```
POST /api/client/scheduling/decline-schedule?scheduleRequestId=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee
Authorization: Bearer {token}

Response 200:
{
  "scheduleRequestId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "taskId": "12345678-1234-1234-1234-123456789012",
  "jobId": "99999999-9999-9999-9999-999999999999",
  "taskName": "Trim hedges",
  "gardenerId": "11111111-1111-1111-1111-111111111111",
  "gardenerName": "John Doe",
  "clientId": "87654321-4321-4321-4321-210987654321",
  "clientName": "Alice Johnson",
  "scheduledAtUtc": "2024-12-15T14:00:00Z",
  "proposedAtUtc": null,
  "approvedAtUtc": null,
  "declinedAtUtc": "2024-12-10T11:30:00Z",
  "status": "Declined",
  "createdAtUtc": "2024-12-10T10:00:00Z"
}
```

### 4. Propose Alternative Time
```
POST /api/client/scheduling/propose-alternative-time
Authorization: Bearer {token}
Content-Type: application/json

{
  "scheduleRequestId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "proposedAtUtc": "2024-12-15T16:00:00Z"
}

Response 200:
{
  "scheduleRequestId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "taskId": "12345678-1234-1234-1234-123456789012",
  "jobId": "99999999-9999-9999-9999-999999999999",
  "taskName": "Trim hedges",
  "gardenerId": "11111111-1111-1111-1111-111111111111",
  "gardenerName": "John Doe",
  "clientId": "87654321-4321-4321-4321-210987654321",
  "clientName": "Alice Johnson",
  "scheduledAtUtc": "2024-12-15T14:00:00Z",
  "proposedAtUtc": "2024-12-15T16:00:00Z",
  "approvedAtUtc": null,
  "declinedAtUtc": null,
  "status": "ProposedAlternative",
  "createdAtUtc": "2024-12-10T10:00:00Z"
}
```

---

## Status Workflow

```
Pending
  ├─ Client Approves → Approved ✓
  ├─ Client Declines → Declined
  │   └─ Gardener Reschedules → Rescheduled
  │       ├─ Client Approves → Approved ✓
  │       ├─ Client Declines → Declined
  │       └─ Client Proposes Alternative → ProposedAlternative
  └─ Client Proposes Alternative → ProposedAlternative
      └─ Gardener Reschedules → Rescheduled
          ├─ Client Approves → Approved ✓
          ├─ Client Declines → Declined
          └─ Client Proposes Alternative → ProposedAlternative
```

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created |
| 400 | Bad Request - Validation error or invalid operation |
| 401 | Unauthorized - Not authenticated |
| 403 | Forbidden - Authenticated but not authorized |
| 404 | Not Found - Resource doesn't exist |
| 500 | Server Error |

---

## Common Error Responses

### Not Authenticated
```json
{
  "error": "User is not authenticated."
}
```

### Wrong Role
```json
{
  "error": "Only gardeners can schedule tasks."
}
```

### Resource Not Found
```json
{
  "error": "Task not found."
}
```

### Business Logic Error
```json
{
  "error": "Scheduled time must be in the future."
}
```

### Unauthorized Access
```json
{
  "error": "Gardener does not have a relationship with this client."
}
```

---

## Pagination

All calendar endpoints support pagination:
- `page` - Page number (default: 1, minimum: 1)
- `pageSize` - Items per page (default: 20, maximum: 100)

Example:
```
GET /api/gardener/scheduling/calendar?page=2&pageSize=10
```

Results are ordered by scheduled time (descending - most recent first).
