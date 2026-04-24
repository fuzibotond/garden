# Expo Push Notifications - Backend Implementation

## Overview
Backend infrastructure for real push notifications using Expo Push Notification service. This enables notifications to be delivered even when the mobile app is closed or backgrounded.

## Architecture

### 1. Database Schema
**Migration:** `20260413090000_AddExpoPushTokens.cs`

Added `ExpoPushToken` column to:
- `Gardeners` table (nvarchar(256), nullable)
- `Clients` table (nvarchar(256), nullable)

### 2. Push Notification Service
**Location:** `Garden.Modules.Notifications\Services\`

**Interface:** `IExpoPushNotificationService`
```csharp
Task SendPushNotificationAsync(string expoPushToken, string title, string body, object? data = null, CancellationToken cancellationToken = default);
Task SendPushNotificationsAsync(IEnumerable<string> expoPushTokens, string title, string body, object? data = null, CancellationToken cancellationToken = default);
```

**Implementation:** `ExpoPushNotificationService`
- Uses `IHttpClientFactory` to call Expo API
- Sends POST to `https://exp.host/--/api/v2/push/send`
- Supports batch sending to multiple tokens
- Includes error handling and logging
- Validates tokens before sending

**Push Message Format:**
```json
{
  "to": "ExponentPushToken[xxx]",
  "title": "Notification Title",
  "body": "Notification body text",
  "data": { "custom": "data" },
  "sound": "default",
  "priority": "high"
}
```

### 3. Token Registration Endpoint
**Endpoint:** `POST /api/users/push-token`  
**Authorization:** Required (Gardener or Client role)

**Request:**
```json
{
  "expoPushToken": "ExponentPushToken[xxx]"
}
```

**Handler:** `RegisterPushTokenHandler`
- Updates `ExpoPushToken` for authenticated user
- Supports both Gardener and Client roles
- Validates user authentication and role

**Files:**
- `Garden.Modules.Identity\Features\PushNotifications\RegisterPushTokenRequest.cs`
- `Garden.Modules.Identity\Features\PushNotifications\RegisterPushTokenHandler.cs`
- `Garden.Modules.Identity\Features\PushNotifications\RegisterPushTokenEndpoint.cs`

### 4. Event Consumers Updated
**ScheduleRequestEmailConsumer** now sends both:
1. **Email notification** (existing)
2. **Push notification** (new)

**Flow:**
1. Event received from RabbitMQ
2. Send email to client
3. Query database for client's `ExpoPushToken`
4. If token exists, send push notification
5. Log results and acknowledge message

**Push Notification Content:**
- **Title:** "New Schedule Request"
- **Body:** "{GardenerName} proposed {date} at {time} for: {TaskName}"
- **Data:** `{ type: "schedule_request", scheduleRequestId, taskId, scheduledAtUtc }`

## Registration

### Notifications Module
**File:** `Garden.Modules.Notifications\ModuleExtensions.cs`
```csharp
services.AddHttpClient();
services.AddSingleton<IExpoPushNotificationService, ExpoPushNotificationService>();
```

### Identity Module
**File:** `Garden.Modules.Identity\ModuleExtensions.cs`
```csharp
services.AddScoped<Features.PushNotifications.RegisterPushTokenHandler>();
```

## Usage Flow

### Mobile App (Client Side - Future)
1. App starts, requests Expo push token:
   ```javascript
   import * as Notifications from 'expo-notifications';
   const token = await Notifications.getExpoPushTokenAsync();
   ```
2. On login, send token to backend:
   ```javascript
   POST /api/users/push-token
   { "expoPushToken": token.data }
   ```
3. Token stored in database for user
4. App receives notifications even when closed

### Backend (Server Side - Implemented)
1. When schedule request created, event published
2. `ScheduleRequestEmailConsumer` receives event
3. Email sent to client
4. Client's push token retrieved from database
5. If token exists, push notification sent via Expo API
6. Apple/Google delivers notification to device

## Testing

### Manual Testing
1. **Register Push Token:**
   ```bash
   POST /api/users/push-token
   Authorization: Bearer {jwt_token}
   {
     "expoPushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
   }
   ```

2. **Trigger Schedule Request:**
   - Create schedule request as gardener
   - Check logs for push notification sent
   - Verify notification received on mobile device

3. **Check Database:**
   ```sql
   SELECT Id, Email, ExpoPushToken FROM Clients;
   SELECT Id, Email, ExpoPushToken FROM Gardeners;
   ```

### Logs
Look for these log messages:
- `Push notifications sent successfully to {Count} devices`
- `Push notification sent to client {ClientId} for schedule request {ScheduleRequestId}`
- `No push token found for client {ClientId}, skipping push notification`

## Error Handling
- Invalid/expired tokens: Logged, does not fail email notification
- Network errors: Logged, message is not requeued
- Missing tokens: Silently skipped with debug log
- Push notification failures do NOT affect email delivery

## Configuration
No additional configuration required. Uses:
- `IHttpClientFactory` (registered globally)
- Expo public API (no API key needed)

## Security Notes
- Push tokens are user-specific and stored securely
- Tokens can only be registered by authenticated users
- Tokens are nullable (users can opt out)
- No sensitive data in push notification body
- Detailed data sent via `data` field for in-app handling

## Future Enhancements
- [ ] Token validation endpoint
- [ ] Token refresh/update logic
- [ ] Batch notifications for multiple events
- [ ] Push notification preferences (enable/disable by type)
- [ ] Admin push notifications
- [ ] Scheduled/delayed push notifications
- [ ] Rich notifications with images
- [ ] Action buttons in notifications

## Migration
Run migration to apply database changes:
```bash
cd Garden.BuildingBlocks
dotnet ef database update
```

## Dependencies
- **Expo Push Notification Service:** https://exp.host/--/api/v2/push/send
- **Mobile SDK:** expo-notifications (React Native)
- **No backend API key required** (uses public Expo service)

## Related Files
- `Garden.BuildingBlocks\Infrastructure\Persistence\GardenDbContext.cs` - Records updated
- `Garden.BuildingBlocks\Migrations\20260413090000_AddExpoPushTokens.cs` - Migration
- `Garden.Modules.Notifications\Services\IExpoPushNotificationService.cs` - Interface
- `Garden.Modules.Notifications\Services\ExpoPushNotificationService.cs` - Implementation
- `Garden.Modules.Notifications\Services\ScheduleRequestEmailConsumer.cs` - Consumer updated
- `Garden.Modules.Identity\Features\PushNotifications\*` - Token registration
