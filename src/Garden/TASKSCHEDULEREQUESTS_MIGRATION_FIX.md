# TaskScheduleRequests Migration Fix

## Problem
The application threw a `SqlException: Invalid object name 'TaskScheduleRequests'` when trying to access the gardener calendar endpoint.

## Root Cause
The `TaskScheduleRequestRecord` entity and its corresponding DbSet were defined in `GardenDbContext`, but no Entity Framework migration was created or applied to the database. This meant the table never existed in SQL Server, even though the code expected it.

The model configuration existed in `OnModelCreating()` but the actual database table was missing.

## Solution
Created and applied an Entity Framework Core migration to add the `TaskScheduleRequests` table with all necessary columns and indexes.

### Files Created
- `Garden.BuildingBlocks/Migrations/20260412090000_AddTaskScheduleRequestsTable.cs` - Migration definition
- `Garden.BuildingBlocks/Migrations/20260412090000_AddTaskScheduleRequestsTable.Designer.cs` - Migration designer snapshot

### Files Modified
- `Garden.BuildingBlocks/Infrastructure/Persistence/GardenDbContext.cs` - Added `HasMaxLength(50)` constraint to `Status` property to allow indexing

## Migration Details

### Table: TaskScheduleRequests
| Column | Type | Constraints |
|--------|------|-------------|
| Id | uniqueidentifier | PK |
| TaskId | uniqueidentifier | FK → Tasks |
| GardenerId | uniqueidentifier | FK → Gardeners, Indexed |
| ClientId | uniqueidentifier | FK → Clients, Indexed |
| ScheduledAtUtc | datetime2 | Required |
| Status | nvarchar(50) | Required, Indexed |
| ProposedAtUtc | datetime2 | Nullable |
| ApprovedAtUtc | datetime2 | Nullable |
| DeclinedAtUtc | datetime2 | Nullable |
| CreatedAtUtc | datetime2 | Required |
| UpdatedAtUtc | datetime2 | Required |

### Indexes Created
- `IX_TaskScheduleRequests_TaskId_ClientId` (Unique composite)
- `IX_TaskScheduleRequests_GardenerId`
- `IX_TaskScheduleRequests_ClientId`
- `IX_TaskScheduleRequests_Status`

## Key Change
The `Status` column was constrained to `nvarchar(50)` instead of `nvarchar(max)` to allow SQL Server to create an index on it (SQL Server cannot index unbounded text columns).

## Verification
After applying the migration with `dotnet ef database update --startup-project Garden.Api --project Garden.BuildingBlocks`, the gardener calendar endpoint (`GET /api/gardener/scheduling/calendar`) now works correctly without the "Invalid object name" error.

## Related Files
- `Garden.Modules.Scheduling/Features/TaskScheduling/GetGardenerCalendarHandler.cs` - Uses the table
- `Garden.Modules.Scheduling/Features/TaskScheduling/ScheduleTaskHandler.cs` - Creates records
- `Garden.BuildingBlocks/Infrastructure/Persistence/GardenDbContext.cs` - DbContext configuration
