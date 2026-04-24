# Architecture Guide

**Version**: 1.0  
**Last Updated**: 2026-04-24

---

## Table of Contents

1. [Overview](#overview)
2. [Architectural Style](#architectural-style)
3. [Module Structure](#module-structure)
4. [Data Flow](#data-flow)
5. [Authentication & Authorization](#authentication--authorization)
6. [Event-Driven Communication](#event-driven-communication)
7. [Database Design](#database-design)
8. [Design Patterns](#design-patterns)
9. [Future Evolution](#future-evolution)

---

## Overview

Garden App backend is built as a **modular monolith** with clear module boundaries and event-driven communication between modules.

### Core Principles

1. **Modular Design** - Clear separation of concerns by domain
2. **Vertical Slicing** - Features organized by use case, not technical layer
3. **Single Database** - Shared database with clear ownership
4. **Event-Driven** - Async communication via RabbitMQ
5. **API-First** - RESTful HTTP API for all operations

### Technology Stack

- **Framework**: ASP.NET Core 10 (C# 14.0)
- **ORM**: Entity Framework Core
- **Database**: SQL Server
- **Messaging**: RabbitMQ
- **Authentication**: JWT Bearer tokens
- **Validation**: FluentValidation
- **Logging**: Serilog

---

## Architectural Style

### Modular Monolith

The application is organized into independent modules that:
- Have clear responsibilities
- Own their domain logic
- Share a single database (for now)
- Communicate via events
- Can be extracted into microservices later

### Why Modular Monolith?

✅ **Advantages:**
- Simpler deployment
- Easier debugging
- No network latency between modules
- Shared transactions
- Lower operational complexity

🔮 **Future Migration Path:**
- Each module can become a microservice
- Database can be split by module
- Communication already event-driven

---

## Module Structure

```
Garden.Api (HTTP Entry Point)
├── Controllers           # Minimal routing logic
└── Program.cs           # Startup configuration

Garden.Modules.Identity
├── Features/
│   ├── Auth/            # Login, Register, Refresh
│   ├── Profile/         # Profile management
│   └── PushNotifications/ # Push token registration
├── Services/            # JWT, CurrentUser
└── ModuleExtensions.cs  # DI registration

Garden.Modules.Gardeners
├── Features/
│   └── Gardeners/       # Gardener operations
├── Services/            # GardenerRegistrationService
└── Controllers/         # GardenerController

Garden.Modules.Clients
├── Features/
│   ├── Clients/         # Client operations
│   └── Invitations/     # Invitation flow
├── Services/            # ClientService, InvitationService
└── Controllers/         # ClientsController

Garden.Modules.Catalog
├── Features/
│   └── TaskTypes/       # Global task type catalog
└── Controllers/         # TaskTypesController

Garden.Modules.Materials
├── Features/
│   └── Materials/       # Material CRUD
└── Controllers/         # MaterialsController

Garden.Modules.Tasks
├── Features/
│   └── Tasks/           # Task management
└── Controllers/         # TasksController

Garden.Modules.Scheduling
├── Features/
│   ├── Jobs/            # Job management
│   └── TaskScheduling/  # Schedule request workflow
└── Controllers/         # JobsController, ClientSchedulingController

Garden.Modules.Notifications
├── Services/
│   ├── InvitationEmailConsumer.cs       # Email on invitation
│   ├── ScheduleRequestEmailConsumer.cs  # Email on schedule
│   └── ExpoPushNotificationService.cs   # Mobile push notifications
└── ModuleExtensions.cs

Garden.BuildingBlocks
├── Infrastructure/
│   └── Persistence/
│       └── GardenDbContext.cs    # Shared EF Core context
├── Events/                       # Domain events
├── Migrations/                   # EF Core migrations
└── Services/                     # Shared interfaces
```

---

## Data Flow

### Request Flow (Synchronous)

```
1. HTTP Request
   ↓
2. Controller (API Layer)
   - Minimal routing
   - Returns handler result
   ↓
3. Handler (Application Layer)
   - Validates request (FluentValidation)
   - Executes business logic
   - Calls domain services
   ↓
4. Service (Domain Layer)
   - Applies business rules
   - Updates database via DbContext
   ↓
5. Database
   - EF Core saves changes
   ↓
6. Response
   - Returns DTO to client
```

### Event Flow (Asynchronous)

```
1. Handler publishes event
   - InvitationCreatedEvent
   - ScheduleRequestCreatedEvent
   ↓
2. RabbitMQ
   - Routes event to subscribers
   ↓
3. Consumer (Notifications Module)
   - InvitationEmailConsumer
   - ExpoPushNotificationService
   ↓
4. External Services
   - SMTP (email)
   - Expo Push API (mobile notifications)
```

---

## Authentication & Authorization

### JWT Token Structure

```json
{
  "sub": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "email": "user@example.com",
  "role": "Gardener",
  "iat": 1714000000,
  "exp": 1714003600
}
```

### Role-Based Access Control

| Role | Access Level |
|------|-------------|
| **Admin** | Full system access - all gardeners, clients, relationships |
| **Gardener** | Own profile, own clients, own materials, own jobs, own tasks |
| **Client** | Own profile, own tasks, own schedule requests |

### Authorization Flow

```
1. Request arrives with JWT Bearer token
   ↓
2. ASP.NET Core validates JWT signature
   ↓
3. CurrentUserService extracts claims
   ↓
4. Handler checks authorization:
   - Role required?
   - Resource ownership?
   ↓
5. Request proceeds or returns 403 Forbidden
```

### Implementation

**Endpoint Protection:**
```csharp
[Authorize(Roles = "Gardener")]
public async Task<IActionResult> CreateMaterial([FromBody] CreateMaterialRequest request)
{
    var gardenerId = _currentUser.GetGardenerId();
    // Proceed with logic
}
```

**Resource Ownership Check:**
```csharp
public async Task<Material> GetMaterialAsync(Guid materialId)
{
    var material = await _context.Materials.FindAsync(materialId);
    
    if (material.GardenerId != _currentUser.GetGardenerId())
        throw new ForbiddenException();
        
    return material;
}
```

---

## Event-Driven Communication

### Why Events?

- **Decoupling**: Modules don't depend on each other
- **Scalability**: Easy to add new subscribers
- **Async Processing**: Non-blocking operations
- **Auditability**: Event log for debugging

### Event Structure

```csharp
public class InvitationCreatedEvent
{
    public Guid InvitationId { get; set; }
    public Guid GardenerId { get; set; }
    public string ClientEmail { get; set; }
    public string InvitationToken { get; set; }
    public DateTime ExpiresAt { get; set; }
}
```

### Event Publishing

```csharp
// In InvitationService
await _eventBus.PublishAsync(new InvitationCreatedEvent
{
    InvitationId = invitation.Id,
    GardenerId = gardenerId,
    ClientEmail = email,
    InvitationToken = token,
    ExpiresAt = invitation.ExpiresAtUtc
});
```

### Event Consuming

```csharp
// In InvitationEmailConsumer
public async Task HandleAsync(InvitationCreatedEvent @event)
{
    var gardener = await _context.Gardeners.FindAsync(@event.GardenerId);
    
    await _emailService.SendInvitationEmailAsync(
        @event.ClientEmail,
        gardener.CompanyName,
        @event.InvitationToken
    );
}
```

### Current Events

| Event | Publisher | Subscribers |
|-------|-----------|-------------|
| `InvitationCreatedEvent` | Clients module | Email consumer, Push notification consumer |
| `ScheduleRequestCreatedEvent` | Scheduling module | Email consumer, Push notification consumer |

---

## Database Design

### Shared Database Strategy

All modules use a **single shared database** (`GardenDbContext`) with clear table ownership.

### Entity Relationships

```
Gardener
├── 1:N → Materials
├── M:N → TaskTypes (via GardenerTaskTypes)
├── M:N → Clients (via GardenerClients)
├── 1:N → RefreshTokens
└── 1:N → Invitations

Client
├── M:N → Gardeners (via GardenerClients)
├── 1:N → Jobs
└── 1:N → Invitations (by email)

Job
├── N:1 → Client
├── 1:N → Tasks
└── M:N → Gardeners (via JobGardeners)

Task
├── N:1 → Job
├── N:1 → TaskType
├── M:N → Materials (via TaskMaterials with snapshot)
└── 1:1 → TaskScheduleRequest

TaskScheduleRequest
├── N:1 → Task
├── N:1 → Gardener
└── N:1 → Client
```

### Key Design Decisions

1. **Material Snapshots** - TaskMaterials stores snapshot of price/name at time of use
2. **Soft Deletes** - No hard deletes, use status fields or nullable fields
3. **UTC Timestamps** - All datetime fields in UTC
4. **Guids as IDs** - Globally unique identifiers
5. **Invitation by Email** - Invitations sent to email, not user ID

---

## Design Patterns

### 1. Vertical Slice Architecture

Each feature is a self-contained vertical slice:

```
CreateMaterial/
├── CreateMaterialRequest.cs      # Input DTO
├── CreateMaterialHandler.cs      # Business logic
├── CreateMaterialValidator.cs    # Validation rules
└── CreateMaterialResponse.cs     # Output DTO
```

Benefits:
- Easy to locate feature code
- Changes are localized
- Clear dependencies

### 2. CQRS (Light)

Separate models for:
- **Commands** - Change state (Create, Update, Delete)
- **Queries** - Read state (Get, List)

Implementation: MediatR handlers

### 3. Repository Pattern (Implicit)

EF Core `DbContext` acts as a repository:
- `DbSet<T>` for queries
- `SaveChangesAsync()` for persistence
- No explicit repository interfaces (YAGNI)

### 4. Service Layer

Complex business logic lives in services:
- `InvitationService` - Invitation flow logic
- `GardenerRegistrationService` - Gardener registration
- `ExpoPushNotificationService` - Push notifications

### 5. Dependency Injection

All dependencies injected via constructor:
```csharp
public class CreateMaterialHandler
{
    private readonly GardenDbContext _context;
    private readonly ICurrentUser _currentUser;
    
    public CreateMaterialHandler(GardenDbContext context, ICurrentUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }
}
```

---

## Future Evolution

### Phase 1: Current (Modular Monolith)
- ✅ Single deployable
- ✅ Shared database
- ✅ Event-driven communication
- ✅ Clear module boundaries

### Phase 2: Distributed Monolith (if needed)
- Extract background consumers into separate process
- Keep web API as single deployment
- Shared database still

### Phase 3: Microservices (if needed)
- Extract modules into separate services
- Split database by bounded context
- Add API Gateway
- Implement gRPC for sync communication
- Keep RabbitMQ for async events

### Migration Strategy

Each module can become a microservice:
1. Extract module into separate project
2. Add HTTP API for module
3. Replace in-process calls with HTTP/gRPC
4. Split database tables for module
5. Deploy independently

---

## Change Log

### [1.0.0] - 2026-04-24
- Initial architecture documentation
- Modular monolith design
- Event-driven communication
- Database design explained
- Future evolution path outlined
