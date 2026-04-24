# Schedule Request Notification Feature - Implementation Summary

## Overview
Implemented an extensible notification system for schedule requests. When a gardener creates a schedule request, the client receives an email notification.

## Changes Made

### 1. **Created Event Classes in BuildingBlocks** (Shared Infrastructure)
   - **File:** `Garden.BuildingBlocks\Events\ScheduleRequestCreatedEvent.cs`
     - New event published when a gardener creates a schedule request
     - Contains: ScheduleRequestId, TaskId, GardenerId, ClientId, ClientEmail, ClientName, GardenerName, TaskName, ScheduledAtUtc
   
   - **File:** `Garden.BuildingBlocks\Events\InvitationCreatedEvent.cs`
     - Moved existing event to BuildingBlocks for consistency
     - Keeps events in a centralized location to avoid circular dependencies

### 2. **Updated ScheduleTaskHandler** 
   - **File:** `Garden.Modules.Scheduling\Features\TaskScheduling\ScheduleTaskHandler.cs`
   - Added `IEventPublisher` dependency
   - Fetches gardener details needed for notification
   - Publishes `ScheduleRequestCreatedEvent` after creating a schedule request
   - Event includes all necessary information for the email notification

### 3. **Created ScheduleRequestEmailConsumer**
   - **File:** `Garden.Modules.Notifications\Services\ScheduleRequestEmailConsumer.cs`
   - Background service that consumes `ScheduleRequestCreatedEvent` from RabbitMQ
   - Follows the same pattern as `InvitationEmailConsumer`
   - Queue: `schedule-requests.email.queue`
   - Routing key: `schedulerequestcreatedevent`
   - Sends professional HTML email with:
     - Task name
     - Scheduled date and time (formatted in local time)
     - Gardener's name
     - Call-to-action button to view the request
     - Instructions to approve, decline, or propose alternative time

### 4. **Registered Consumer in Notifications Module**
   - **File:** `Garden.Modules.Notifications\ModuleExtensions.cs`
   - Added `ScheduleRequestEmailConsumer` as a hosted service
   - Runs in the background alongside `InvitationEmailConsumer`

### 5. **Updated InvitationService**
   - **File:** `Garden.Modules.Clients\Services\InvitationService.cs`
   - Updated to use `InvitationCreatedEvent` from BuildingBlocks namespace
   - Removed inline event definition

### 6. **Updated InvitationEmailConsumer**
   - **File:** `Garden.Modules.Notifications\Services\InvitationEmailConsumer.cs`
   - Updated to use `InvitationCreatedEvent` from BuildingBlocks namespace

## Architecture Design

### Event-Driven Pattern
- Uses RabbitMQ topic exchange (`garden.events`) for asynchronous message distribution
- Each event type has its own queue and consumer
- Decouples notification logic from business logic
- Enables easy addition of new notification types

### Extensibility
The system is designed to easily support future notifications:

1. **Create a new event** in `Garden.BuildingBlocks\Events\`
2. **Publish the event** from the appropriate handler using `IEventPublisher`
3. **Create a consumer** in `Garden.Modules.Notifications\Services\`
4. **Register the consumer** in `ModuleExtensions.cs`

### Example Future Notifications
Following this pattern, you can easily add:
- Task completion notifications
- Job status updates
- Reminder notifications for upcoming appointments
- Payment reminders
- Schedule change notifications (when client proposes alternative time)

## Email Template
The schedule request email includes:
- **Subject:** "New Schedule Request from Your Gardener"
- **Content:**
  - Personalized greeting with client name
  - Gardener's name
  - Task name
  - Scheduled date and time (user-friendly format)
  - Call-to-action button linking to schedule requests page
  - Instructions for responding (approve, decline, propose alternative)
  - Professional styling with Garden branding

## Testing the Feature

### Prerequisites
- RabbitMQ must be running (see docker-compose.yml)
- SMTP settings configured in appsettings.json

### Test Steps
1. **Stop the running application** (required to apply code changes)
2. **Build the solution:** `dotnet build`
3. **Start the application**
4. **As a Gardener:**
   - Log in as a gardener
   - Create or use an existing task
   - Create a schedule request for that task
5. **Verify:**
   - Check application logs for "Event published: type=ScheduleRequestCreatedEvent"
   - Check RabbitMQ management UI (http://localhost:15672) for the message in the queue
   - Check the client's email inbox for the notification

## Configuration
No additional configuration needed. The feature uses existing:
- RabbitMQ settings from BuildingBlocks
- SMTP settings from Notifications module

## Next Steps
To add more notifications, follow the same pattern:
1. Define the event with all necessary data
2. Publish it where the business action occurs
3. Create a consumer to handle the notification
4. Register the consumer

The architecture is now set up to handle multiple notification types efficiently and maintainably.

## Notes
- All events are stored in `Garden.BuildingBlocks\Events\` to avoid module circular dependencies
- Consumers use durable queues to ensure messages aren't lost
- Messages are acknowledged only after successful email delivery
- Failed messages are requeued for retry
- HTML emails are escaped to prevent XSS vulnerabilities
