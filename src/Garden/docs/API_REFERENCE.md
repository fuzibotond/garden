# API Reference

**Version**: 1.1  
**Last Updated**: 2026-04-24

---

## Change Log

### [1.1] - 2026-04-24
- Added Task Questions endpoints for gardener-client communication
- Added Task Answers endpoints for client responses
- Added media upload endpoints for questions and answers

### [1.0] - 2026-04-24
- Initial API reference documentation

---

## Table of Contents

1. [Authentication](#authentication)
2. [Profile Management](#profile-management)
3. [Gardener Operations](#gardener-operations)
4. [Client Operations](#client-operations)
5. [Admin Operations](#admin-operations)
6. [Materials](#materials)
7. [Task Types](#task-types)
8. [Tasks](#tasks)
9. [Jobs](#jobs)
10. [Schedule Requests](#schedule-requests)
11. [Task Questions](#task-questions)
12. [Push Notifications](#push-notifications)

---

## Authentication

Base URL: `/api/auth`

### Register Gardener

**POST** `/api/auth/gardener/register`

Register a new gardener account.

**Request:**
```json
{
  "email": "gardener@example.com",
  "password": "SecurePassword123!",
  "companyName": "Green Gardens Ltd"
}
```

**Response:** `200 OK`
```json
{
  "gardenerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "email": "gardener@example.com",
  "companyName": "Green Gardens Ltd",
  "accessToken": "eyJhbGc...",
  "refreshToken": "c7e9f8a1..."
}
```

---

### Login

**POST** `/api/auth/login`

Authenticate and receive JWT tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "role": "Gardener"
}
```

**Response:** `200 OK`
```json
{
  "userId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "email": "user@example.com",
  "role": "Gardener",
  "accessToken": "eyJhbGc...",
  "refreshToken": "c7e9f8a1...",
  "expiresAt": "2026-04-24T15:30:00Z"
}
```

---

### Refresh Token

**POST** `/api/auth/refresh`

Get a new access token using refresh token.

**Request:**
```json
{
  "refreshToken": "c7e9f8a1..."
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "d8f0g9b2...",
  "expiresAt": "2026-04-24T16:30:00Z"
}
```

---

### Logout

**POST** `/api/auth/logout`

Invalidate refresh tokens and update last logout time.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response:** `200 OK`

---

## Profile Management

Base URL: `/api/profile`

All endpoints require authentication.

### Get My Profile

**GET** `/api/profile/me`

Get current user's profile (Gardener or Client).

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (Gardener):** `200 OK`
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "email": "gardener@example.com",
  "name": "John Doe",
  "companyName": "Green Gardens Ltd",
  "expoPushToken": "ExponentPushToken[xxx]",
  "role": "Gardener"
}
```

**Response (Client):** `200 OK`
```json
{
  "id": "4gb96g75-6828-5673-c4gd-3d074g77bgb7",
  "email": "client@example.com",
  "name": "Jane Smith",
  "expoPushToken": "ExponentPushToken[yyy]",
  "role": "Client"
}
```

---

### Update My Profile

**PUT** `/api/profile/me`

Update current user's profile.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request:**
```json
{
  "name": "John Updated",
  "companyName": "Green Gardens Ltd"
}
```

**Response:** `200 OK`
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "email": "gardener@example.com",
  "name": "John Updated",
  "companyName": "Green Gardens Ltd"
}
```

---

### Delete My Account

**DELETE** `/api/profile/me`

Delete current user's account (soft delete).

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response:** `200 OK`

---

### Register Push Token

**POST** `/api/profile/push-token`

Register Expo push notification token for mobile app.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request:**
```json
{
  "expoPushToken": "ExponentPushToken[xxxxxxxxxxxxxx]"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Push token registered successfully"
}
```

---

## Gardener Operations

Base URL: `/api/gardeners`

### Invite Client

**POST** `/api/gardeners/invite`

Send invitation email to a potential client.

**Headers:**
```
Authorization: Bearer {accessToken}
Role: Gardener
```

**Request:**
```json
{
  "email": "newclient@example.com"
}
```

**Response:** `200 OK`
```json
{
  "invitationId": "5hc07h86-7939-6784-d5he-4e185h88chc8",
  "email": "newclient@example.com",
  "expiresAt": "2026-04-31T10:00:00Z",
  "status": "Pending"
}
```

---

### Get My Clients

**GET** `/api/gardeners/clients`

Get list of all clients connected to current gardener.

**Headers:**
```
Authorization: Bearer {accessToken}
Role: Gardener
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 20)

**Response:** `200 OK`
```json
{
  "clients": [
    {
      "clientId": "4gb96g75-6828-5673-c4gd-3d074g77bgb7",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "createdAt": "2026-03-15T10:00:00Z"
    }
  ],
  "totalCount": 1,
  "page": 1,
  "pageSize": 20
}
```

---

## Client Operations

Base URL: `/api/clients`

### Accept Invitation

**POST** `/api/clients/accept-invitation`

Accept gardener invitation and create client account.

**Request:**
```json
{
  "token": "invitation-token-from-email",
  "email": "client@example.com",
  "password": "SecurePassword123!",
  "name": "Jane Smith"
}
```

**Response:** `200 OK`
```json
{
  "clientId": "4gb96g75-6828-5673-c4gd-3d074g77bgb7",
  "email": "client@example.com",
  "name": "Jane Smith",
  "accessToken": "eyJhbGc...",
  "refreshToken": "c7e9f8a1..."
}
```

---

### Get My Gardeners

**GET** `/api/clients/gardeners`

Get list of all gardeners connected to current client.

**Headers:**
```
Authorization: Bearer {accessToken}
Role: Client
```

**Response:** `200 OK`
```json
{
  "gardeners": [
    {
      "gardenerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "name": "John Doe",
      "companyName": "Green Gardens Ltd",
      "email": "gardener@example.com"
    }
  ]
}
```

---

## Admin Operations

Base URL: `/api/admin`

All endpoints require Admin role.

### Get All Gardeners

**GET** `/api/admin/gardeners`

**Headers:**
```
Authorization: Bearer {accessToken}
Role: Admin
```

**Query Parameters:**
- `page` (optional): Page number
- `pageSize` (optional): Items per page

**Response:** `200 OK`
```json
{
  "gardeners": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "email": "gardener@example.com",
      "companyName": "Green Gardens Ltd",
      "name": "John Doe",
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ],
  "totalCount": 1
}
```

---

### Get All Clients

**GET** `/api/admin/clients`

**Headers:**
```
Authorization: Bearer {accessToken}
Role: Admin
```

**Response:** `200 OK`
```json
{
  "clients": [
    {
      "id": "4gb96g75-6828-5673-c4gd-3d074g77bgb7",
      "email": "client@example.com",
      "name": "Jane Smith",
      "createdAt": "2026-03-15T10:00:00Z"
    }
  ],
  "totalCount": 1
}
```

---

### Get Gardener-Client Relationships

**GET** `/api/admin/relationships`

View all gardener-client connections.

**Headers:**
```
Authorization: Bearer {accessToken}
Role: Admin
```

**Response:** `200 OK`
```json
{
  "relationships": [
    {
      "gardenerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "gardenerName": "John Doe",
      "gardenerCompany": "Green Gardens Ltd",
      "clientId": "4gb96g75-6828-5673-c4gd-3d074g77bgb7",
      "clientName": "Jane Smith",
      "clientEmail": "jane@example.com",
      "connectedAt": "2026-03-15T10:00:00Z"
    }
  ]
}
```

---

## Materials

Base URL: `/api/materials`

Gardener-specific materials with pricing.

### Create Material

**POST** `/api/materials`

**Headers:**
```
Authorization: Bearer {accessToken}
Role: Gardener
```

**Request:**
```json
{
  "name": "Fertilizer Type A",
  "amountType": "kg",
  "pricePerAmount": 15.50
}
```

**Response:** `201 Created`
```json
{
  "id": "7jd29j08-0151-8906-f7jf-6f307j99fjd0",
  "gardenerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "name": "Fertilizer Type A",
  "amountType": "kg",
  "pricePerAmount": 15.50,
  "createdAt": "2026-04-24T10:00:00Z"
}
```

---

### Get My Materials

**GET** `/api/materials`

**Headers:**
```
Authorization: Bearer {accessToken}
Role: Gardener
```

**Response:** `200 OK`
```json
{
  "materials": [
    {
      "id": "7jd29j08-0151-8906-f7jf-6f307j99fjd0",
      "name": "Fertilizer Type A",
      "amountType": "kg",
      "pricePerAmount": 15.50,
      "createdAt": "2026-04-24T10:00:00Z"
    }
  ]
}
```

---

### Update Material

**PUT** `/api/materials/{id}`

**Headers:**
```
Authorization: Bearer {accessToken}
Role: Gardener
```

**Request:**
```json
{
  "name": "Fertilizer Type A Premium",
  "amountType": "kg",
  "pricePerAmount": 18.00
}
```

**Response:** `200 OK`

---

### Delete Material

**DELETE** `/api/materials/{id}`

**Headers:**
```
Authorization: Bearer {accessToken}
Role: Gardener
```

**Response:** `200 OK`

---

## Task Types

Base URL: `/api/task-types`

Global catalog of available task types.

### Get All Task Types

**GET** `/api/task-types`

Public endpoint - no authentication required.

**Response:** `200 OK`
```json
{
  "taskTypes": [
    {
      "id": "8ke30k19-1262-9017-g8kg-7g418k00gke1",
      "name": "Lawn Mowing",
      "createdAt": "2026-01-01T00:00:00Z"
    },
    {
      "id": "9lf41l20-2373-0128-h9lh-8h529l11hlf2",
      "name": "Hedge Trimming",
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ]
}
```

---

### Create Task Type (Admin Only)

**POST** `/api/admin/task-types`

**Headers:**
```
Authorization: Bearer {accessToken}
Role: Admin
```

**Request:**
```json
{
  "name": "Tree Pruning"
}
```

**Response:** `201 Created`
```json
{
  "id": "0mg52m31-3484-1239-i0mi-9i630m22imhug3",
  "name": "Tree Pruning",
  "createdAt": "2026-04-24T10:00:00Z"
}
```

---

## Tasks

Base URL: `/api/tasks`

Work items created by clients.

### Create Task

**POST** `/api/tasks`

**Headers:**
```
Authorization: Bearer {accessToken}
Role: Client or Gardener
```

**Request:**
```json
{
  "jobId": "1nh63n42-4595-2340-j1nj-0j741n33jnh4",
  "taskTypeId": "8ke30k19-1262-9017-g8kg-7g418k00gke1",
  "name": "Mow front lawn",
  "description": "Regular lawn maintenance",
  "estimatedTimeMinutes": 60,
  "wagePerHour": 25.00,
  "materials": [
    {
      "materialId": "7jd29j08-0151-8906-f7jf-6f307j99fjd0",
      "usedQuantity": 2.5
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "id": "2oi74o53-5606-3451-k2ok-1k852o44koj5",
  "jobId": "1nh63n42-4595-2340-j1nj-0j741n33jnh4",
  "taskTypeId": "8ke30k19-1262-9017-g8kg-7g418k00gke1",
  "name": "Mow front lawn",
  "description": "Regular lawn maintenance",
  "estimatedTimeMinutes": 60,
  "actualTimeMinutes": null,
  "wagePerHour": 25.00,
  "startedAt": null,
  "finishedAt": null,
  "materials": [
    {
      "materialId": "7jd29j08-0151-8906-f7jf-6f307j99fjd0",
      "materialName": "Fertilizer Type A",
      "usedQuantity": 2.5,
      "snapshotPricePerAmount": 15.50,
      "snapshotAmountType": "kg"
    }
  ],
  "createdAt": "2026-04-24T10:00:00Z"
}
```

---

### Get Task

**GET** `/api/tasks/{id}`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response:** `200 OK`
(Same structure as Create Task response)

---

### Update Task

**PUT** `/api/tasks/{id}`

**Headers:**
```
Authorization: Bearer {accessToken}
Role: Client or Gardener (owner)
```

**Request:**
```json
{
  "name": "Mow front and back lawn",
  "description": "Extended lawn maintenance",
  "estimatedTimeMinutes": 90,
  "actualTimeMinutes": 85,
  "wagePerHour": 25.00,
  "startedAt": "2026-04-24T09:00:00Z",
  "finishedAt": "2026-04-24T10:25:00Z"
}
```

**Response:** `200 OK`

---

### Delete Task

**DELETE** `/api/tasks/{id}`

**Headers:**
```
Authorization: Bearer {accessToken}
Role: Client or Gardener (owner)
```

**Response:** `200 OK`

---

## Jobs

Base URL: `/api/jobs`

Container for multiple tasks with client relationship.

### Create Job

**POST** `/api/jobs`

**Headers:**
```
Authorization: Bearer {accessToken}
Role: Gardener
```

**Request:**
```json
{
  "clientId": "4gb96g75-6828-5673-c4gd-3d074g77bgb7",
  "name": "Weekly Maintenance - April 24",
  "gardenerIds": [
    "3fa85f64-5717-4562-b3fc-2c963f66afa6"
  ]
}
```

**Response:** `201 Created`
```json
{
  "id": "1nh63n42-4595-2340-j1nj-0j741n33jnh4",
  "clientId": "4gb96g75-6828-5673-c4gd-3d074g77bgb7",
  "name": "Weekly Maintenance - April 24",
  "closedAt": null,
  "invoiceNumber": null,
  "createdAt": "2026-04-24T10:00:00Z",
  "updatedAt": "2026-04-24T10:00:00Z"
}
```

---

### Get Job

**GET** `/api/jobs/{id}`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response:** `200 OK`
```json
{
  "id": "1nh63n42-4595-2340-j1nj-0j741n33jnh4",
  "clientId": "4gb96g75-6828-5673-c4gd-3d074g77bgb7",
  "clientName": "Jane Smith",
  "name": "Weekly Maintenance - April 24",
  "closedAt": null,
  "invoiceNumber": null,
  "tasks": [
    {
      "id": "2oi74o53-5606-3451-k2ok-1k852o44koj5",
      "name": "Mow front lawn",
      "status": "Pending"
    }
  ],
  "gardeners": [
    {
      "gardenerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "name": "John Doe"
    }
  ],
  "createdAt": "2026-04-24T10:00:00Z",
  "updatedAt": "2026-04-24T10:00:00Z"
}
```

---

### Update Job

**PUT** `/api/jobs/{id}`

**Headers:**
```
Authorization: Bearer {accessToken}
Role: Gardener (owner)
```

**Request:**
```json
{
  "name": "Weekly Maintenance - April 24 (Completed)",
  "closedAt": "2026-04-24T15:00:00Z",
  "invoiceNumber": "INV-2026-001"
}
```

**Response:** `200 OK`

---

### Delete Job

**DELETE** `/api/jobs/{id}`

**Headers:**
```
Authorization: Bearer {accessToken}
Role: Gardener (owner)
```

**Response:** `200 OK`

---

## Schedule Requests

Base URL: `/api/schedule`

Task schedule request workflow (propose/approve/decline/reschedule).

### Schedule Task (Gardener)

**POST** `/api/schedule/gardener/task/{taskId}/schedule`

Gardener proposes a schedule for a task.

**Headers:**
```
Authorization: Bearer {accessToken}
Role: Gardener
```

**Request:**
```json
{
  "scheduledAt": "2026-04-25T10:00:00Z"
}
```

**Response:** `201 Created`
```json
{
  "id": "3pj85p64-6717-4562-l3pl-2l963p55lpk6",
  "taskId": "2oi74o53-5606-3451-k2ok-1k852o44koj5",
  "gardenerId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "clientId": "4gb96g75-6828-5673-c4gd-3d074g77bgb7",
  "scheduledAt": "2026-04-25T10:00:00Z",
  "status": "Pending",
  "proposedAt": "2026-04-24T10:00:00Z",
  "createdAt": "2026-04-24T10:00:00Z"
}
```

---

### Approve Schedule (Client)

**POST** `/api/schedule/client/requests/{requestId}/approve`

Client approves gardener's proposed schedule.

**Headers:**
```
Authorization: Bearer {accessToken}
Role: Client
```

**Response:** `200 OK`
```json
{
  "id": "3pj85p64-6717-4562-l3pl-2l963p55lpk6",
  "status": "Approved",
  "approvedAt": "2026-04-24T11:00:00Z"
}
```

---

### Decline Schedule (Client)

**POST** `/api/schedule/client/requests/{requestId}/decline`

Client declines gardener's proposed schedule.

**Headers:**
```
Authorization: Bearer {accessToken}
Role: Client
```

**Response:** `200 OK`
```json
{
  "id": "3pj85p64-6717-4562-l3pl-2l963p55lpk6",
  "status": "Declined",
  "declinedAt": "2026-04-24T11:00:00Z"
}
```

---

### Propose Alternative Time (Client)

**POST** `/api/schedule/client/requests/{requestId}/propose-alternative`

Client proposes an alternative time.

**Headers:**
```
Authorization: Bearer {accessToken}
Role: Client
```

**Request:**
```json
{
  "proposedScheduledAt": "2026-04-25T14:00:00Z"
}
```

**Response:** `200 OK`
```json
{
  "id": "3pj85p64-6717-4562-l3pl-2l963p55lpk6",
  "scheduledAt": "2026-04-25T14:00:00Z",
  "status": "ProposedAlternative",
  "proposedAt": "2026-04-24T11:00:00Z"
}
```

---

### Reschedule Task (Gardener)

**POST** `/api/schedule/gardener/requests/{requestId}/reschedule`

Gardener reschedules an existing request.

**Headers:**
```
Authorization: Bearer {accessToken}
Role: Gardener
```

**Request:**
```json
{
  "newScheduledAt": "2026-04-26T10:00:00Z"
}
```

**Response:** `200 OK`
```json
{
  "id": "3pj85p64-6717-4562-l3pl-2l963p55lpk6",
  "scheduledAt": "2026-04-26T10:00:00Z",
  "status": "Rescheduled"
}
```

---

## Task Questions

Task Questions enable gardeners to ask clients questions about specific tasks with optional media attachments. Questions can be multiple choice or free text.

### Create Question (Gardener)

**POST** `/api/tasks/{taskId}/questions`

Gardener creates a question for the client related to a specific task.

**Headers:**
```
Authorization: Bearer {accessToken}
Role: Gardener
```

**Request:**
```json
{
  "questionText": "Which fertilizer would you prefer?",
  "questionType": 1,
  "predefinedOptions": ["Organic", "Chemical", "Mixed"]
}
```

**Question Types:**
- `0` = FreeText
- `1` = MultipleChoice

**Response:** `201 Created`
```json
{
  "questionId": "7fa85f64-5717-4562-b3fc-2c963f66afa6",
  "taskId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "questionText": "Which fertilizer would you prefer?",
  "questionType": 1,
  "predefinedOptions": ["Organic", "Chemical", "Mixed"],
  "createdAt": "2026-04-24T10:00:00Z"
}
```

---

### Get Questions by Task

**GET** `/api/tasks/{taskId}/questions`

Get all questions and answers for a specific task. Accessible by both gardener and client.

**Headers:**
```
Authorization: Bearer {accessToken}
Role: Gardener | Client
```

**Response:** `200 OK`
```json
{
  "questions": [
    {
      "questionId": "7fa85f64-5717-4562-b3fc-2c963f66afa6",
      "taskId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "gardenerId": "1fa85f64-5717-4562-b3fc-2c963f66afa6",
      "questionText": "Which fertilizer would you prefer?",
      "questionType": 1,
      "predefinedOptions": ["Organic", "Chemical", "Mixed"],
      "createdAt": "2026-04-24T10:00:00Z",
      "answers": [
        {
          "answerId": "8fa85f64-5717-4562-b3fc-2c963f66afa6",
          "clientId": "2fa85f64-5717-4562-b3fc-2c963f66afa6",
          "answerText": "Organic",
          "createdAt": "2026-04-24T10:30:00Z",
          "media": []
        }
      ],
      "media": [
        {
          "mediaId": "9fa85f64-5717-4562-b3fc-2c963f66afa6",
          "mediaUrl": "https://storage.example.com/fertilizer.jpg",
          "mediaType": "image/jpeg",
          "fileName": "fertilizer.jpg",
          "uploadedAt": "2026-04-24T10:00:00Z"
        }
      ]
    }
  ]
}
```

---

### Upload Question Media (Gardener)

**POST** `/api/questions/{questionId}/media`

Upload photo or video attachment to a question.

**Headers:**
```
Authorization: Bearer {accessToken}
Role: Gardener
```

**Request:**
```json
{
  "mediaUrl": "https://storage.example.com/photo.jpg",
  "mediaType": "image/jpeg",
  "fileName": "photo.jpg"
}
```

**Response:** `200 OK`
```json
{
  "mediaId": "9fa85f64-5717-4562-b3fc-2c963f66afa6",
  "questionId": "7fa85f64-5717-4562-b3fc-2c963f66afa6",
  "mediaUrl": "https://storage.example.com/photo.jpg",
  "mediaType": "image/jpeg",
  "fileName": "photo.jpg",
  "uploadedAt": "2026-04-24T10:00:00Z"
}
```

---

### Create Answer (Client)

**POST** `/api/questions/{questionId}/answers`

Client answers a gardener's question.

**Headers:**
```
Authorization: Bearer {accessToken}
Role: Client
```

**Request:**
```json
{
  "answerText": "Organic"
}
```

**Response:** `200 OK`
```json
{
  "answerId": "8fa85f64-5717-4562-b3fc-2c963f66afa6",
  "questionId": "7fa85f64-5717-4562-b3fc-2c963f66afa6",
  "answerText": "Organic",
  "createdAt": "2026-04-24T10:30:00Z"
}
```

---

### Upload Answer Media (Client)

**POST** `/api/answers/{answerId}/media`

Upload photo or video attachment to an answer.

**Headers:**
```
Authorization: Bearer {accessToken}
Role: Client
```

**Request:**
```json
{
  "mediaUrl": "https://storage.example.com/answer-photo.jpg",
  "mediaType": "image/jpeg",
  "fileName": "answer-photo.jpg"
}
```

**Response:** `200 OK`
```json
{
  "mediaId": "afa85f64-5717-4562-b3fc-2c963f66afa6",
  "answerId": "8fa85f64-5717-4562-b3fc-2c963f66afa6",
  "mediaUrl": "https://storage.example.com/answer-photo.jpg",
  "mediaType": "image/jpeg",
  "fileName": "answer-photo.jpg",
  "uploadedAt": "2026-04-24T10:30:00Z"
}
```

---

## Push Notifications

Expo Push Notifications integration for mobile apps.

### Events that Trigger Notifications

1. **Invitation Created** → Client receives email + push notification
2. **Schedule Request Created** → Client receives push notification
3. **Schedule Approved** → Gardener receives push notification
4. **Schedule Declined** → Gardener receives push notification
5. **Schedule Proposed Alternative** → Gardener receives push notification
6. **Question Created** → Client receives push notification
7. **Question Answered** → Gardener receives push notification

### Notification Format

```json
{
  "to": "ExponentPushToken[xxxxxxxxxxxxxx]",
  "title": "New Schedule Request",
  "body": "John Doe proposed a schedule for 'Mow front lawn' on Apr 25 at 10:00 AM",
  "data": {
    "type": "schedule_request",
    "requestId": "3pj85p64-6717-4562-l3pl-2l963p55lpk6",
    "taskId": "2oi74o53-5606-3451-k2ok-1k852o44koj5"
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation failed",
  "details": {
    "Email": ["Email is required"],
    "Password": ["Password must be at least 8 characters"]
  }
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "You do not have permission to access this resource"
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "The requested resource was not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

---

## Change Log

### [1.0.0] - 2026-04-24
- Initial API documentation
- All core endpoints documented
- Push notifications documented
- Error responses standardized
