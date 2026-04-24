# Postman Collection Update - Schedule Request Endpoints

## Summary
The Postman collection has been updated with complete schedule request workflow endpoints for both gardeners and clients, including support for the new email notification feature.

## What Was Added

### 1. **Gardener - Scheduling** (New Folder)
A complete set of endpoints for gardeners to manage schedule requests:

#### **POST** `/api/gardener/scheduling/schedule-task`
- **Purpose:** Create a schedule request for a task
- **Feature:** Automatically sends email notification to client
- **Body:**
  ```json
  {
    "taskId": "{{task_id}}",
    "clientId": "{{client_id}}",
    "scheduledAtUtc": "2025-04-15T10:00:00Z"
  }
  ```
- **Event Triggered:** `ScheduleRequestCreatedEvent` → Email sent via RabbitMQ

#### **POST** `/api/gardener/scheduling/reschedule-task`
- **Purpose:** Update an existing schedule request with a new time
- **Body:**
  ```json
  {
    "scheduleRequestId": "{{schedule_request_id}}",
    "newScheduledAtUtc": "2025-04-16T14:00:00Z"
  }
  ```

#### **GET** `/api/gardener/scheduling/calendar`
- **Purpose:** View all schedule requests for the gardener
- **Parameters:** `page`, `pageSize`
- **Returns:** Paginated list of schedule requests

#### **GET** `/api/gardener/scheduling`
- **Purpose:** Get schedule requests filtered by status
- **Parameters:** 
  - `status` (optional): `Pending`, `Approved`, `Declined`, `ProposedAlternative`, `Rescheduled`, `Cancelled`
  - `page`, `pageSize`

#### **GET** `/api/gardener/scheduling/{jobId}`
- **Purpose:** Get job details
- **Returns:** Job information with related schedule data

#### **GET** `/api/gardener/scheduling/{jobId}/tasks`
- **Purpose:** Get all tasks for a specific job
- **Parameters:** `page`, `pageSize`

#### **GET** `/api/gardener/scheduling/{jobId}/invoice`
- **Purpose:** Download PDF invoice for a closed job
- **Returns:** PDF file

---

### 2. **Client - Scheduling** (New Folder)
Endpoints for clients to manage incoming schedule requests:

#### **GET** `/api/client/scheduling/calendar`
- **Purpose:** View all schedule requests for the client
- **Parameters:** `page`, `pageSize`
- **Returns:** Paginated list of schedule requests
- **Note:** Shows requests received via email notifications

#### **POST** `/api/client/scheduling/approve-schedule`
- **Purpose:** Approve a schedule request from gardener
- **Body:**
  ```json
  {
    "scheduleRequestId": "{{schedule_request_id}}"
  }
  ```
- **Effect:** Changes status to `Approved`

#### **POST** `/api/client/scheduling/decline-schedule`
- **Purpose:** Decline a schedule request from gardener
- **Body:**
  ```json
  {
    "scheduleRequestId": "{{schedule_request_id}}"
  }
  ```
- **Effect:** Changes status to `Declined`

#### **POST** `/api/client/scheduling/propose-alternative-time`
- **Purpose:** Suggest a different time for the schedule
- **Body:**
  ```json
  {
    "scheduleRequestId": "{{schedule_request_id}}",
    "proposedAtUtc": "2025-04-17T09:00:00Z"
  }
  ```
- **Effect:** Changes status to `ProposedAlternative`

---

### 3. **New Variable**
Added to collection variables:
- `schedule_request_id` - Stores the ID of a schedule request for reuse in subsequent calls

---

## Testing the Notification Feature

### Complete Workflow Test

1. **Setup:**
   - Ensure RabbitMQ is running (`docker-compose up -d`)
   - Configure SMTP settings in `appsettings.json`
   - Create a gardener and client relationship
   - Create a job and task

2. **As Gardener:**
   ```
   POST /api/gardener/scheduling/schedule-task
   {
     "taskId": "{{task_id}}",
     "clientId": "{{client_id}}",
     "scheduledAtUtc": "2025-04-15T10:00:00Z"
   }
   ```
   - Save the `scheduleRequestId` from response
   - **Check:** Client receives email notification

3. **Verify Email Sent:**
   - Check application logs for: `"Event published: type=ScheduleRequestCreatedEvent"`
   - Check RabbitMQ UI (http://localhost:15672) for message in `schedule-requests.email.queue`
   - Check client's email inbox

4. **As Client (Viewing the Schedule):**
   ```
   GET /api/client/scheduling/calendar
   ```
   - Should see the schedule request in the list

5. **As Client (Responding):**
   
   **Option A - Approve:**
   ```
   POST /api/client/scheduling/approve-schedule
   {
     "scheduleRequestId": "{{schedule_request_id}}"
   }
   ```

   **Option B - Decline:**
   ```
   POST /api/client/scheduling/decline-schedule
   {
     "scheduleRequestId": "{{schedule_request_id}}"
   }
   ```

   **Option C - Propose Alternative:**
   ```
   POST /api/client/scheduling/propose-alternative-time
   {
     "scheduleRequestId": "{{schedule_request_id}}",
     "proposedAtUtc": "2025-04-17T09:00:00Z"
   }
   ```

6. **As Gardener (Check Status):**
   ```
   GET /api/gardener/scheduling/calendar
   ```
   - Should see updated status (Approved, Declined, or ProposedAlternative)

---

## Email Notification Details

### What the Client Receives

**Subject:** "New Schedule Request from Your Gardener"

**Content:**
- Personalized greeting with client name
- Gardener's name
- Task name
- Scheduled date and time (formatted in local time)
- Call-to-action button linking to schedule requests page
- Instructions for responding (approve, decline, propose alternative)
- Professional HTML styling with Garden branding

**Example:**
```
Hello Jane Smith,

Your gardener Green Gardens has proposed a schedule for your upcoming task.

Schedule Details:
Task: Lawn Mowing
Scheduled Date: Tuesday, April 15, 2025
Scheduled Time: 10:00 AM

[View Schedule Request Button]

You can approve the schedule, decline it, or propose an alternative time that works better for you.
```

---

## Status Values Reference

| Status | Description |
|--------|-------------|
| `Pending` | Initial state when gardener creates schedule request |
| `Approved` | Client accepted the proposed schedule |
| `Declined` | Client rejected the proposed schedule |
| `ProposedAlternative` | Client suggested a different time |
| `Rescheduled` | Gardener updated the schedule time |
| `Cancelled` | Schedule request was cancelled |

---

## Integration with Existing Endpoints

The scheduling endpoints work seamlessly with existing endpoints:

1. **Jobs** - Schedule requests link to existing job system
2. **Tasks** - Schedule requests reference specific tasks
3. **Client Relationships** - Only works for gardener-client relationships created via invitations
4. **Notifications** - Uses the same RabbitMQ + SMTP infrastructure as invitation emails

---

## Next Steps

### To Test in Postman:

1. Import the updated `GardenApp_Postman_Collection.json`
2. Set up environment variables:
   - `base_url` (default: http://localhost:5000)
   - `access_token` (from login response)
3. Create test data:
   - Register gardener and client
   - Create gardener-client relationship (via invitation)
   - Create job and task
4. Test the schedule workflow:
   - Gardener creates schedule request
   - Verify email received
   - Client responds (approve/decline/propose)
   - Gardener views updated status

### Common Scenarios:

**Scenario 1: Simple Approval**
1. Gardener → Schedule Task
2. Client → Check Email
3. Client → Approve Schedule
4. Gardener → View Calendar (see "Approved" status)

**Scenario 2: Negotiation**
1. Gardener → Schedule Task
2. Client → Propose Alternative Time
3. Gardener → View Calendar (see proposed time)
4. Gardener → Reschedule Task (with new time or original)
5. Client → Approve Schedule

**Scenario 3: Declined and Rescheduled**
1. Gardener → Schedule Task
2. Client → Decline Schedule
3. Gardener → Reschedule Task (new time)
4. Client → Receives new email notification
5. Client → Approve Schedule

---

## Notes

- All schedule times are in **UTC** format in the API
- Email displays times in **local time** for user convenience
- The notification system is **asynchronous** (RabbitMQ handles queuing)
- Failed emails are **automatically retried** by the consumer
- Schedule requests require an **existing gardener-client relationship**
- Only **authenticated users** can access their own schedule requests
