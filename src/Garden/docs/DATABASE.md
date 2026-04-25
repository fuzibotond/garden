# Database Schema

**Version**: 1.1  
**Last Updated**: 2026-04-24

---

## Change Log

### [1.1] - 2026-04-24
- Added TaskQuestions table for gardener questions
- Added TaskAnswers table for client responses
- Added TaskQuestionMedia table for question attachments
- Added TaskAnswerMedia table for answer attachments
- Added support for multiple choice and free text questions

### [1.0] - 2026-04-24
- Initial database schema documentation

---

## Entity Relationship Diagram

```
┌──────────────┐         ┌──────────────────┐         ┌────────────┐
│   Gardener   │────────▶│ GardenerClients  │◀────────│   Client   │
└──────────────┘         └──────────────────┘         └────────────┘
       │                                                      │
       │ 1:N                                               1:N│
       ▼                                                      ▼
┌──────────────┐                                       ┌────────────┐
│  Materials   │                                       │    Jobs    │
└──────────────┘                                       └────────────┘
       │                                                      │
       │                                                   1:N│
       │                                                      ▼
       │            ┌──────────────┐                   ┌────────────┐
       └───────────▶│TaskMaterials │◀──────────────────│   Tasks    │
                    └──────────────┘                   └────────────┘
                                                              │
                                            ┌─────────────────┼─────────────────┐
                                         1:1│              1:N│              1:N│
                                            ▼                 ▼                 ▼
                                  ┌──────────────────┐ ┌──────────────┐ ┌──────────────┐
                                  │TaskScheduleReq   │ │TaskQuestions │ │               │
                                  └──────────────────┘ └──────────────┘ │               │
                                                              │           │               │
                                                           1:N│           │               │
                                                              ▼           │               │
                                                       ┌──────────────┐  │               │
                                                       │ TaskAnswers  │  │               │
                                                       └──────────────┘  │               │
                                                              │           │               │
                                            ┌─────────────────┼───────────┘               │
                                         1:N│              1:N│                           │
                                            ▼                 ▼                           │
                                  ┌──────────────────┐ ┌──────────────────┐             │
                                  │TaskQuestionMedia │ │ TaskAnswerMedia  │             │
                                  └──────────────────┘ └──────────────────┘             │
```

---

## Tables

### Gardeners

Stores gardener (service provider) accounts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `Id` | GUID | PK | Unique identifier |
| `Email` | VARCHAR(256) | NOT NULL, UNIQUE | Login email |
| `Name` | VARCHAR(200) | NULL | Gardener name (optional) |
| `CompanyName` | VARCHAR(200) | NOT NULL | Business name |
| `PasswordHash` | VARCHAR(500) | NOT NULL | Hashed password |
| `CreatedAtUtc` | DATETIME | NOT NULL | Registration timestamp |
| `LastLogoutUtc` | DATETIME | NULL | Last logout time |
| `ExpoPushToken` | VARCHAR(256) | NULL | Mobile push notification token |

**Indexes:**
- `IX_Gardeners_Email` (UNIQUE)

---

### Clients

Stores client (customer) accounts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `Id` | GUID | PK | Unique identifier |
| `Email` | VARCHAR(256) | NOT NULL, UNIQUE | Login email |
| `Name` | VARCHAR(200) | NOT NULL | Client name |
| `PasswordHash` | VARCHAR(500) | NOT NULL | Hashed password |
| `CreatedAtUtc` | DATETIME | NOT NULL | Registration timestamp |
| `LastLogoutUtc` | DATETIME | NULL | Last logout time |
| `ExpoPushToken` | VARCHAR(256) | NULL | Mobile push notification token |

**Indexes:**
- `IX_Clients_Email` (UNIQUE)

---

### GardenerClients

Many-to-many relationship between gardeners and clients.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `Id` | GUID | PK | Unique identifier |
| `GardenerId` | GUID | FK, NOT NULL | Reference to Gardener |
| `ClientId` | GUID | FK, NOT NULL | Reference to Client |

**Indexes:**
- `IX_GardenerClients_GardenerId_ClientId` (UNIQUE)

---

### Invitations

Email-based invitation flow for onboarding clients.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `Id` | GUID | PK | Unique identifier |
| `GardenerId` | GUID | FK, NOT NULL | Inviting gardener |
| `Email` | VARCHAR(256) | NOT NULL | Invited email |
| `TokenHash` | VARCHAR(256) | NOT NULL | Hashed invitation token |
| `Status` | INT | NOT NULL | Invitation status (enum) |
| `ExpiresAtUtc` | DATETIME | NOT NULL | Token expiration |
| `CreatedAtUtc` | DATETIME | NOT NULL | Invitation created |
| `AcceptedAtUtc` | DATETIME | NULL | When invitation accepted |

**Enums:**
- `Status`: `Pending(0)`, `Accepted(1)`, `Revoked(2)`, `Expired(3)`

**Indexes:**
- `IX_Invitations_GardenerId`

---

### RefreshTokens

JWT refresh tokens for authentication.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `Id` | GUID | PK | Unique identifier |
| `GardenerId` | GUID | FK, NOT NULL | Token owner |
| `Token` | VARCHAR(200) | NOT NULL, UNIQUE | Refresh token value |
| `CreatedAtUtc` | DATETIME | NOT NULL | Token created |
| `ExpiresAtUtc` | DATETIME | NOT NULL | Token expires |

**Indexes:**
- `IX_RefreshTokens_Token` (UNIQUE)
- `IX_RefreshTokens_GardenerId`

---

### Materials

Gardener-defined materials with pricing.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `Id` | GUID | PK | Unique identifier |
| `GardenerId` | GUID | FK, NOT NULL | Material owner |
| `Name` | VARCHAR(256) | NOT NULL | Material name |
| `AmountType` | VARCHAR(50) | NOT NULL | Unit type (kg, liters, etc.) |
| `PricePerAmount` | DECIMAL(18,2) | NOT NULL | Price per unit |
| `CreatedAtUtc` | DATETIME | NOT NULL | Material created |

**Indexes:**
- `IX_Materials_GardenerId`

---

### TaskTypes

Global catalog of available task types.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `Id` | GUID | PK | Unique identifier |
| `Name` | VARCHAR(256) | NOT NULL | Task type name |
| `CreatedAtUtc` | DATETIME | NOT NULL | Task type created |

**Notes:**
- Shared across all gardeners
- Admin-managed

---

### GardenerTaskTypes

Many-to-many relationship between gardeners and task types they offer.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `Id` | GUID | PK | Unique identifier |
| `GardenerId` | GUID | FK, NOT NULL | Gardener |
| `TaskTypeId` | GUID | FK, NOT NULL | Task type |

**Indexes:**
- `IX_GardenerTaskTypes_GardenerId_TaskTypeId` (UNIQUE)

---

### Jobs

Container for multiple tasks with client relationship.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `Id` | GUID | PK | Unique identifier |
| `ClientId` | GUID | FK, NOT NULL | Job owner |
| `Name` | VARCHAR(512) | NOT NULL | Job name/description |
| `ClosedAtUtc` | DATETIME | NULL | When job completed |
| `InvoiceNumber` | VARCHAR(50) | NULL | Invoice reference |
| `CreatedAtUtc` | DATETIME | NOT NULL | Job created |
| `UpdatedAtUtc` | DATETIME | NOT NULL | Last updated |

**Indexes:**
- `IX_Jobs_ClientId`

---

### JobGardeners

Many-to-many relationship for gardeners assigned to a job.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `Id` | GUID | PK | Unique identifier |
| `JobId` | GUID | FK, NOT NULL | Job reference |
| `GardenerId` | GUID | FK, NOT NULL | Assigned gardener |

**Indexes:**
- `IX_JobGardeners_JobId_GardenerId` (UNIQUE)

---

### Tasks

Individual work items requested by clients.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `Id` | GUID | PK | Unique identifier |
| `JobId` | GUID | FK, NOT NULL | Parent job |
| `TaskTypeId` | GUID | FK, NOT NULL | Task type reference |
| `Name` | VARCHAR(512) | NOT NULL | Task name |
| `Description` | VARCHAR(2048) | NULL | Task description |
| `EstimatedTimeMinutes` | INT | NULL | Estimated duration |
| `ActualTimeMinutes` | INT | NULL | Actual duration |
| `WagePerHour` | DECIMAL(18,2) | NULL | Hourly rate |
| `StartedAtUtc` | DATETIME | NULL | When task started |
| `FinishedAtUtc` | DATETIME | NULL | When task completed |
| `CreatedAtUtc` | DATETIME | NOT NULL | Task created |
| `UpdatedAtUtc` | DATETIME | NOT NULL | Last updated |

**Indexes:**
- `IX_Tasks_JobId`
- `IX_Tasks_TaskTypeId`

---

### TaskMaterials

Materials used in tasks with price snapshots.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `Id` | GUID | PK | Unique identifier |
| `TaskId` | GUID | FK, NOT NULL | Task reference |
| `MaterialId` | GUID | FK, NOT NULL | Material used |
| `UsedQuantity` | DECIMAL(18,2) | NOT NULL | Quantity consumed |
| `SnapshotName` | VARCHAR(256) | NULL | Material name snapshot |
| `SnapshotAmountType` | VARCHAR(50) | NULL | Unit type snapshot |
| `SnapshotPricePerAmount` | DECIMAL(18,2) | NULL | Price snapshot |

**Notes:**
- Snapshot fields preserve material details at time of use
- Prevents data loss if material is updated/deleted

**Indexes:**
- `IX_TaskMaterials_TaskId_MaterialId` (UNIQUE)

---

### TaskScheduleRequests

Scheduling negotiation between gardener and client.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `Id` | GUID | PK | Unique identifier |
| `TaskId` | GUID | FK, NOT NULL | Task to schedule |
| `GardenerId` | GUID | FK, NOT NULL | Proposing gardener |
| `ClientId` | GUID | FK, NOT NULL | Approving client |
| `ScheduledAtUtc` | DATETIME | NOT NULL | Proposed/approved time |
| `Status` | STRING | NOT NULL | Request status (enum) |
| `ProposedAtUtc` | DATETIME | NULL | When proposed |
| `ApprovedAtUtc` | DATETIME | NULL | When approved |
| `DeclinedAtUtc` | DATETIME | NULL | When declined |
| `CreatedAtUtc` | DATETIME | NOT NULL | Request created |
| `UpdatedAtUtc` | DATETIME | NOT NULL | Last updated |

**Enums:**
- `Status`: `Pending(0)`, `Approved(1)`, `Declined(2)`, `ProposedAlternative(3)`, `Rescheduled(4)`, `Cancelled(5)`

**Indexes:**
- `IX_TaskScheduleRequests_TaskId_ClientId` (UNIQUE)
- `IX_TaskScheduleRequests_GardenerId`
- `IX_TaskScheduleRequests_ClientId`
- `IX_TaskScheduleRequests_Status`

---

### TaskQuestions

Questions asked by gardeners to clients regarding specific tasks.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `Id` | GUID | PK | Unique identifier |
| `TaskId` | GUID | FK, NOT NULL | Related task |
| `GardenerId` | GUID | FK, NOT NULL | Gardener who asked |
| `ClientId` | GUID | FK, NOT NULL | Client to answer |
| `QuestionText` | VARCHAR(2048) | NOT NULL | Question content |
| `QuestionType` | STRING | NOT NULL | Question type (enum) |
| `PredefinedOptions` | VARCHAR(4096) | NULL | JSON array of options |
| `CreatedAtUtc` | DATETIME | NOT NULL | Question created |

**Enums:**
- `QuestionType`: `FreeText(0)`, `MultipleChoice(1)`

**Indexes:**
- `IX_TaskQuestions_TaskId`
- `IX_TaskQuestions_GardenerId`
- `IX_TaskQuestions_ClientId`

---

### TaskAnswers

Answers provided by clients to gardener questions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `Id` | GUID | PK | Unique identifier |
| `QuestionId` | GUID | FK, NOT NULL | Related question |
| `ClientId` | GUID | FK, NOT NULL | Client who answered |
| `AnswerText` | VARCHAR(2048) | NOT NULL | Answer content |
| `CreatedAtUtc` | DATETIME | NOT NULL | Answer created |

**Indexes:**
- `IX_TaskAnswers_QuestionId`
- `IX_TaskAnswers_ClientId`

---

### TaskQuestionMedia

Media attachments for questions (photos/videos).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `Id` | GUID | PK | Unique identifier |
| `QuestionId` | GUID | FK, NOT NULL | Related question |
| `MediaUrl` | VARCHAR(2048) | NOT NULL | Media URL/path |
| `MediaType` | VARCHAR(50) | NOT NULL | MIME type |
| `FileName` | VARCHAR(256) | NOT NULL | Original filename |
| `UploadedAtUtc` | DATETIME | NOT NULL | Upload timestamp |

**Indexes:**
- `IX_TaskQuestionMedia_QuestionId`

---

### TaskAnswerMedia

Media attachments for answers (photos/videos).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `Id` | GUID | PK | Unique identifier |
| `AnswerId` | GUID | FK, NOT NULL | Related answer |
| `MediaUrl` | VARCHAR(2048) | NOT NULL | Media URL/path |
| `MediaType` | VARCHAR(50) | NOT NULL | MIME type |
| `FileName` | VARCHAR(256) | NOT NULL | Original filename |
| `UploadedAtUtc` | DATETIME | NOT NULL | Upload timestamp |

**Indexes:**
- `IX_TaskAnswerMedia_AnswerId`

---

## Migrations

### Migration History

| Version | Date | Description |
|---------|------|-------------|
| `20260323120000_MakeTaskTypesGlobal` | 2026-03-23 | Converted task types to global catalog |
| `20260411143000_RemoveMaterialAmount` | 2026-04-11 | Removed static amount from materials |
| `20260411150000_AddTaskMaterialPriceSnapshot` | 2026-04-11 | Added price snapshots to task materials |
| `20260411160000_AddJobClosedAt` | 2026-04-11 | Added job completion tracking |
| `20260412090000_AddTaskScheduleRequestsTable` | 2026-04-12 | Added schedule request workflow |
| `20260413090000_AddExpoPushTokens` | 2026-04-13 | Added push notification tokens |
| `20260424000000_AddTaskQuestionsAndAnswers` | 2026-04-24 | Added question-answer feature for gardener-client communication |

### Running Migrations

**Apply all pending:**
```bash
cd Garden.Api
dotnet ef database update
```

**Apply specific migration:**
```bash
dotnet ef database update 20260413090000_AddExpoPushTokens
```

**Rollback:**
```bash
dotnet ef database update 0  # Rollback all
dotnet ef database update 20260411160000_AddJobClosedAt  # Rollback to specific
```

### Creating New Migration

```bash
cd Garden.BuildingBlocks
dotnet ef migrations add MigrationName --startup-project ../Garden.Api
```

---

## Data Constraints

### Business Rules Enforced by Database

1. **Email Uniqueness**: Gardeners and Clients must have unique emails
2. **Relationship Uniqueness**: One GardenerClient record per pair
3. **Task-Material Uniqueness**: One TaskMaterial record per task-material pair
4. **Schedule Request Uniqueness**: One active schedule request per task-client pair
5. **Job-Gardener Uniqueness**: One JobGardener record per job-gardener pair

### Soft Deletes

No hard deletes are used. Instead:
- Set nullable timestamps (e.g., `ClosedAtUtc`)
- Update status enums
- Keep historical data intact

---

## Indexes Strategy

### Performance Indexes

Created for:
- Foreign keys (navigation)
- Unique constraints (data integrity)
- Status fields (filtering)
- Composite keys (relationship lookups)

### Query Patterns

Common queries and their indexes:

| Query | Index Used |
|-------|------------|
| Find gardener clients | `IX_GardenerClients_GardenerId_ClientId` |
| Find client gardeners | `IX_GardenerClients_ClientId` |
| Find gardener materials | `IX_Materials_GardenerId` |
| Find job tasks | `IX_Tasks_JobId` |
| Find task schedule requests | `IX_TaskScheduleRequests_TaskId_ClientId` |
| Find pending schedule requests | `IX_TaskScheduleRequests_Status` |

---

## Change Log

### [1.0.0] - 2026-04-24
- Initial database schema documentation
- All tables documented
- Migrations listed
- Indexes explained
- Business rules documented
