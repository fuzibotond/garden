# Task Scheduling Feature Implementation

## Overview
Implemented a complete task scheduling workflow that allows gardeners to schedule tasks with clients, and clients to approve, decline, or propose alternative times. This is a negotiation-based scheduling system.

## Database Schema

### New Entity: TaskScheduleRequest
Added `TaskScheduleRequestRecord` to track task scheduling requests between gardeners and clients.

**Fields:**
- `Id` (Guid) - Primary key
- `TaskId` (Guid) - References the task being scheduled
- `GardenerId` (Guid) - Gardener proposing the schedule
- `ClientId` (Guid) - Client who must approve
- `ScheduledAtUtc` (DateTime) - Proposed/current scheduled time
- `ProposedAtUtc` (DateTime, nullable) - Alternative time proposed by client
- `ApprovedAtUtc` (DateTime, nullable) - Timestamp when client approved
- `DeclinedAtUtc` (DateTime, nullable) - Timestamp when client declined
- `Status` (TaskScheduleStatus) - Current status of the request
- `CreatedAtUtc` (DateTime) - When the request was created
- `UpdatedAtUtc` (DateTime) - Last update timestamp

**Indexes:**
- (TaskId, ClientId) - Unique constraint to prevent duplicate schedules
- GardenerId
- ClientId
- Status

### TaskScheduleStatus Enum
```csharp
public enum TaskScheduleStatus
{
    Pending = 0,              // Initial state
    Approved = 1,             // Client approved the scheduled time
    Declined = 2,             // Client declined the proposed time
    ProposedAlternative = 3,  // Client proposed a different time
    Rescheduled = 4,          // Gardener accepted client's proposal
    Cancelled = 5             // Request was cancelled
}
```

## Scheduling Flow

### 1. Gardener Schedules a Task
**Endpoint:** `POST /api/gardener/scheduling/schedule-task`

**Request:**
```json
{
  "taskId": "guid",
  "clientId": "guid",
  "scheduledAtUtc": "2024-12-15T14:00:00Z"
}
```

**Response:** 
```json
{
  "scheduleRequestId": "guid",
  "taskId": "guid",
  "clientId": "guid",
  "scheduledAtUtc": "2024-12-15T14:00:00Z",
  "status": "Pending",
  "createdAtUtc": "2024-12-10T10:00:00Z"
}
```

**Business Rules:**
- Only authenticated gardeners can schedule
- Gardener must have a relationship with the client (GardenerClient record)
- Scheduled time must be in the future
- Cannot schedule the same task twice for the same client
- Task must exist
- Creates status: `Pending`

---

### 2. Client Views Their Calendar/Schedule Requests
**Endpoint:** `GET /api/client/scheduling/calendar?page=1&pageSize=20`

**Response:**
```json
{
  "scheduledTasks": [
    {
      "scheduleRequestId": "guid",
      "taskId": "guid",
      "jobId": "guid",
      "taskName": "Trim hedges",
      "gardenerId": "guid",
      "gardenerName": "John Doe",
      "clientId": "guid",
      "clientName": "Client Name",
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

---

### 3. Client Approves Schedule
**Endpoint:** `POST /api/client/scheduling/approve-schedule`

**Request:**
```json
{
  "scheduleRequestId": "guid"
}
```

**Response:** Returns updated `TaskScheduleDto` with status: `Approved`

**Business Rules:**
- Only the client who received the request can approve
- Can only approve `Pending` or `ProposedAlternative` status
- Sets `ApprovedAtUtc` timestamp

---

### 4. Client Declines Schedule
**Endpoint:** `POST /api/client/scheduling/decline-schedule?scheduleRequestId=guid`

**Response:** Returns updated `TaskScheduleDto` with status: `Declined`

**Business Rules:**
- Only the client who received the request can decline
- Can only decline `Pending` or `Rescheduled` status
- Sets `DeclinedAtUtc` timestamp

---

### 5. Client Proposes Alternative Time
**Endpoint:** `POST /api/client/scheduling/propose-alternative-time`

**Request:**
```json
{
  "scheduleRequestId": "guid",
  "proposedAtUtc": "2024-12-16T10:00:00Z"
}
```

**Response:** Returns updated `TaskScheduleDto` with status: `ProposedAlternative`

**Business Rules:**
- Only the client who received the request can propose
- Can only propose for `Pending` status
- Proposed time must be in the future
- Sets `ProposedAtUtc` with the client's preferred time
- Changes status to `ProposedAlternative`

---

### 6. Gardener Reschedules Based on Client Feedback
**Endpoint:** `POST /api/gardener/scheduling/reschedule-task`

**Request:**
```json
{
  "scheduleRequestId": "guid",
  "rescheduledAtUtc": "2024-12-16T10:00:00Z"
}
```

**Response:** Returns updated `TaskScheduleDto` with status: `Rescheduled`

**Business Rules:**
- Only the gardener who created the request can reschedule
- Can reschedule from `ProposedAlternative` or `Declined` status
- Rescheduled time must be in the future
- Can accept client's proposed time or suggest a new one
- Clears the `ProposedAtUtc` field
- Updates `ScheduledAtUtc` to the new time
- Changes status to `Rescheduled` (back to negotiation)

---

### 7. Gardener Views Their Calendar
**Endpoint:** `GET /api/gardener/scheduling/calendar?page=1&pageSize=20`

**Response:** Same structure as client calendar

**Business Rules:**
- Only authenticated gardeners can view
- Shows all schedule requests they created
- Paginated results ordered by scheduled time (descending)

---

## Complete Scheduling Workflow Example

1. **Gardener schedules task** → Status: `Pending`
2. **Client views calendar** → Sees pending request
3. **Client proposes alternative time** → Status: `ProposedAlternative`
4. **Gardener reschedules** → Status: `Rescheduled`
5. **Client views calendar** → Sees rescheduled request
6. **Client approves** → Status: `Approved` ✓

**Alternative workflows:**
- Decline → Gardener reschedules → Approve
- Decline → (no more rescheduling) - process ends
- Approve immediately → Done

## Implementation Details

### Handlers
- `ScheduleTaskHandler` - Creates initial schedule request
- `GetGardenerCalendarHandler` - Retrieves gardener's schedules
- `GetClientCalendarHandler` - Retrieves client's schedules
- `ApproveScheduleHandler` - Client approves
- `DeclineScheduleHandler` - Client declines
- `ProposeAlternativeTimeHandler` - Client proposes alternative time
- `RescheduleTaskHandler` - Gardener reschedules

### DTOs
- `ScheduleTaskRequest` - Create schedule request
- `ScheduleTaskResponse` - Response from creating schedule
- `TaskScheduleDto` - Full schedule details
- `GetCalendarResponse` - Paginated calendar response
- `ApproveScheduleRequest` - Approve request
- `ProposeAlternativeTimeRequest` - Propose alternative
- `RescheduleTaskRequest` - Reschedule request

### Controllers
- `GardenerSchedulingController` - Endpoints for gardeners
  - `POST /api/gardener/scheduling/schedule-task` - Schedule a task
  - `GET /api/gardener/scheduling/calendar` - View calendar
  - `POST /api/gardener/scheduling/reschedule-task` - Reschedule

- `ClientSchedulingController` - Endpoints for clients
  - `GET /api/client/scheduling/calendar` - View schedule requests
  - `POST /api/client/scheduling/approve-schedule` - Approve
  - `POST /api/client/scheduling/decline-schedule` - Decline
  - `POST /api/client/scheduling/propose-alternative-time` - Propose alternative

## Authorization

All endpoints enforce role-based access control:
- Gardener endpoints: `[Authorize(Roles = "Gardener")]`
- Client endpoints: `[Authorize(Roles = "Client")]`
- Additional ownership checks in each handler

## Validation & Error Handling

All handlers validate:
- User authentication
- User role (Gardener/Client)
- Resource ownership
- Business logic constraints (times in future, valid statuses, etc.)

Error responses:
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (wrong role or no ownership)
- `404` - Not Found (resource doesn't exist)
- `400` - Bad Request (validation failure)

## Database Migration

Migration: `20260412100000_AddTaskScheduleRequests.cs`

Creates `TaskScheduleRequests` table with:
- All necessary columns and properties
- Unique index on (TaskId, ClientId)
- Indexes on GardenerId, ClientId, Status for query performance

## Testing

Comprehensive test suite includes:

**ScheduleTaskHandlerTests:**
- ✅ Create schedule request
- ✅ Fail if not authenticated
- ✅ Fail if not gardener
- ✅ Fail if scheduled time in past
- ✅ Fail if task not found

**ApproveScheduleHandlerTests:**
- ✅ Approve valid request
- ✅ Fail if not client
- ✅ Fail if client approving different client's request

**ProposeAlternativeTimeHandlerTests:**
- ✅ Propose valid alternative time
- ✅ Fail if proposed time in past

**RescheduleTaskHandlerTests:**
- ✅ Reschedule after client proposal
- ✅ Fail if not gardener
- ✅ Fail if rescheduled time in past

All tests follow existing project patterns using:
- In-memory database context
- FakeCurrentUser for authentication
- FluentAssertions for readability
- xUnit framework

## Future Enhancements

1. **Notifications** - Send email when:
   - Schedule request created
   - Schedule approved/declined
   - Alternative time proposed
   - Task rescheduled

2. **Conflict Detection** - Check gardener's availability
3. **Recurring Schedules** - Schedule recurring services
4. **Calendar Integration** - Google Calendar, Outlook sync
5. **Reminders** - Automated reminders before scheduled time
6. **Performance Analytics** - Track scheduling patterns
