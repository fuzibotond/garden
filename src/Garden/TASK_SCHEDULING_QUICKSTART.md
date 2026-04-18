# Task Scheduling - Quick Start Guide

## 🚀 Getting Started

The task scheduling feature is now fully implemented and ready to use!

## 📋 What You Can Do

### Gardeners Can:
1. **Schedule a task** - Propose a time for a task
2. **View their calendar** - See all scheduled tasks and their status
3. **Reschedule tasks** - Update times based on client feedback

### Clients Can:
1. **View schedule requests** - See proposed times for tasks
2. **Approve schedules** - Confirm the proposed time works
3. **Decline schedules** - Reject the proposed time
4. **Propose alternatives** - Suggest a different time

## 🔗 API Endpoints

### Quick Reference
```
Gardener Endpoints:
  POST   /api/gardener/scheduling/schedule-task          # Create schedule
  GET    /api/gardener/scheduling/calendar              # View calendar
  POST   /api/gardener/scheduling/reschedule-task       # Reschedule

Client Endpoints:
  GET    /api/client/scheduling/calendar                # View requests
  POST   /api/client/scheduling/approve-schedule        # Approve
  POST   /api/client/scheduling/decline-schedule        # Decline
  POST   /api/client/scheduling/propose-alternative-time # Propose alternative
```

## 📚 Documentation Files

### For Complete Understanding
- **`docs/TASK_SCHEDULING_FEATURE.md`** ← Read this first
  - Complete feature overview
  - Full workflow explanation
  - Database schema details
  - Business rules

- **`docs/TASK_SCHEDULING_API_REFERENCE.md`** ← For API integration
  - Endpoint details
  - Request/response examples
  - Status codes
  - Error examples

### For Implementation Details
- **`TASK_SCHEDULING_IMPLEMENTATION.md`**
  - All files created/modified
  - Architecture details
  - Test coverage info

## 🧪 Testing

### View Examples
Check the test files for real usage examples:
```
tests/Garden.Api.Tests/Scheduling/
  ├─ ScheduleTaskHandlerTests.cs           # How to schedule
  ├─ ApproveScheduleHandlerTests.cs        # How to approve
  ├─ ProposeAlternativeTimeHandlerTests.cs # How to propose
  └─ RescheduleTaskHandlerTests.cs         # How to reschedule
```

### Run Tests
```bash
cd src/Garden
dotnet test
```

All tests should pass ✅

## 🔐 Authentication

All endpoints require:
1. **Bearer token** in Authorization header
2. **Correct role:**
   - Gardener endpoints: `Authorize(Roles = "Gardener")`
   - Client endpoints: `Authorize(Roles = "Client")`

Example:
```
Authorization: Bearer {your_jwt_token}
```

## 📝 Example Usage Flow

### Scenario: Gardener schedules lawn mowing

**Step 1: Gardener schedules task**
```bash
POST /api/gardener/scheduling/schedule-task
Authorization: Bearer {gardener_token}
Content-Type: application/json

{
  "taskId": "12345678-1234-1234-1234-123456789012",
  "clientId": "87654321-4321-4321-4321-210987654321",
  "scheduledAtUtc": "2024-12-15T14:00:00Z"
}
```
Response: `201 Created` with schedule ID and status `Pending`

**Step 2: Client views their calendar**
```bash
GET /api/client/scheduling/calendar
Authorization: Bearer {client_token}
```
Response: See the pending schedule request

**Step 3a: Client approves**
```bash
POST /api/client/scheduling/approve-schedule
Authorization: Bearer {client_token}
Content-Type: application/json

{
  "scheduleRequestId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
}
```
Response: Status becomes `Approved` ✓

**OR Step 3b: Client proposes alternative time**
```bash
POST /api/client/scheduling/propose-alternative-time
Authorization: Bearer {client_token}
Content-Type: application/json

{
  "scheduleRequestId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "proposedAtUtc": "2024-12-15T16:00:00Z"
}
```
Response: Status becomes `ProposedAlternative`

**Step 4: Gardener reschedules (if alternative proposed)**
```bash
POST /api/gardener/scheduling/reschedule-task
Authorization: Bearer {gardener_token}
Content-Type: application/json

{
  "scheduleRequestId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "rescheduledAtUtc": "2024-12-15T16:00:00Z"
}
```
Response: Status becomes `Rescheduled`

**Step 5: Client reviews and approves**
Same as Step 3a, now status becomes `Approved` ✓

## 🗄️ Database

### New Table: TaskScheduleRequests
Columns:
- `Id` - Schedule request ID
- `TaskId` - Which task is being scheduled
- `GardenerId` - Who's scheduling it
- `ClientId` - Who's being asked to approve
- `ScheduledAtUtc` - Proposed/current time
- `ProposedAtUtc` - Alternative time proposed by client
- `ApprovedAtUtc` - When client approved
- `DeclinedAtUtc` - When client declined
- `Status` - Current status (Pending, Approved, Declined, ProposedAlternative, Rescheduled)
- `CreatedAtUtc` - Created timestamp
- `UpdatedAtUtc` - Last update timestamp

### Migration
```bash
# Run automatically on app startup, or manually:
dotnet ef database update
```

## ⚠️ Status Transitions

Valid transitions:
```
Pending
  ├─ → Approved ✓
  ├─ → Declined
  │   └─ → Rescheduled (by gardener)
  │       ├─ → Approved ✓
  │       └─ → ... (cycle continues)
  └─ → ProposedAlternative (by client)
      └─ → Rescheduled (by gardener)
          └─ → ... (cycle continues)
```

## 🚫 Common Errors

### 401 Unauthorized
**Cause:** Not authenticated or invalid token
**Fix:** Include valid Bearer token in Authorization header

### 403 Forbidden
**Cause:** Wrong role or trying to access another user's data
**Fix:** Use correct token for the role (Gardener/Client)

### 400 Bad Request
**Cause:** Invalid data (e.g., time in past, duplicate schedule)
**Fix:** Check error message and request details

### 404 Not Found
**Cause:** Task, client, gardener, or schedule doesn't exist
**Fix:** Verify IDs are correct and resources exist

## 🎯 Important Rules

1. **Scheduled times must be in the future** - Can't schedule for past times
2. **Gardener-client relationship required** - Before scheduling
3. **One active schedule per task** - Can't schedule same task twice
4. **Only client can approve/decline/propose** - Only gardener can reschedule
5. **Status workflow must be followed** - Can't jump to invalid statuses

## 📦 Pagination

Calendar endpoints support pagination:
```bash
GET /api/gardener/scheduling/calendar?page=1&pageSize=20
```

Parameters:
- `page` - Page number (default: 1)
- `pageSize` - Items per page (default: 20, max: 100)

Results ordered by scheduled time (most recent first)

## 🔄 State Machine

```
┌─────────┐
│ Pending │
└────┬────┘
     ├─→ [Client Approves] → ┌──────────┐
     │                       │ Approved │ ✓ Done
     │                       └──────────┘
     │
     ├─→ [Client Declines] → ┌─────────┐
     │                       │ Declined │
     │                       └────┬────┘
     │                            └─→ [Gardener Reschedules] → ┌────────────┐
     │                                                         │ Rescheduled│
     │                                                         └────────────┘
     │
     └─→ [Client Proposes Alternative] → ┌────────────────────┐
                                          │ ProposedAlternative│
                                          └────────┬───────────┘
                                                   └─→ [Gardener Reschedules] → ┌────────────┐
                                                                                 │ Rescheduled│
                                                                                 └────────────┘
```

## 🚀 Next Steps

1. **Read the full documentation**: `docs/TASK_SCHEDULING_FEATURE.md`
2. **Review API reference**: `docs/TASK_SCHEDULING_API_REFERENCE.md`
3. **Check test examples**: `tests/Garden.Api.Tests/Scheduling/`
4. **Start using the endpoints!**

## 📞 Need Help?

- **Feature Overview**: `docs/TASK_SCHEDULING_FEATURE.md`
- **API Details**: `docs/TASK_SCHEDULING_API_REFERENCE.md`
- **Implementation**: `TASK_SCHEDULING_IMPLEMENTATION.md`
- **Examples**: Test files in `tests/Garden.Api.Tests/Scheduling/`

---

**Ready to schedule tasks?** Let's go! 🎯
