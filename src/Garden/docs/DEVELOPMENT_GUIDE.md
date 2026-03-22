# Garden App - Complete Development Documentation

**Last Updated**: March 2026  
**Status**: ✅ Production Ready  
**Version**: 1.0

---

## 📑 Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Key Features](#key-features)
5. [API Endpoints](#api-endpoints)
6. [Core Workflows](#core-workflows)
7. [Database Schema](#database-schema)
8. [Code Patterns](#code-patterns)
9. [Testing](#testing)
10. [Deployment](#deployment)
11. [Troubleshooting](#troubleshooting)

---

## Project Overview

### Purpose
A gardener service platform with three roles: Admin, Gardener, and Client.

### Main Goals
- Help gardeners manage clients, services, jobs, schedules, and working hours
- Help clients create tasks, request work, and see upcoming visits
- Help admins view and manage everything

### Domain Language
- **Task** = Individual work item requested by a client
- **Job** = Scheduled visit/work order that may contain multiple tasks
- **Service** = Gardener-defined offering
- **Recurring Service** = Repeating service plan
- **Invitation** = Process to add new client (send email, they sign up)

---

## Tech Stack

### Frontend
- React Native + Expo (mobile)
- React (web/admin)
- TypeScript

### Backend
- ASP.NET Core 10
- Entity Framework Core
- SQL Server
- RabbitMQ (event bus)
- SMTP (email)
- JWT (authentication)

### Infrastructure
- Docker Compose (local dev)
- Azure DevOps (CI/CD)
- Kubernetes (future)

---

## Architecture

### Design Principles
- Modular monolith (not microservices)
- Vertical slice architecture within modules
- Clear module boundaries
- Business logic in services, not controllers
- Simple, maintainable solutions

### Core Modules
```
Garden.Api (entry point)
├─ Identity (auth, users, profiles)
├─ Gardeners (gardener management)
├─ Clients (client management)
├─ Catalog (services)
├─ Tasks (work items)
├─ Scheduling (jobs, visits)
├─ Notifications (email, events)
├─ TimeTracking (work hours)
└─ BuildingBlocks (shared infrastructure)
```

### Authorization

**Three Roles**:
- **Admin**: Full access to all data
- **Gardener**: Own clients, services, jobs, time tracking
- **Client**: Own tasks, jobs, invitations

**Rule**: Always check role + resource ownership

---

## Key Features

### 1. Invitation & Signup Flow ✅

#### What Happens
1. **Gardener invites client**
   - POST `/api/gardener/clients/invitations` with email
   - System creates: InvitationRecord + ClientRecord + GardenerClientRecord
   - Email sent with signup link
   - Gardener sees client immediately with "Pending" status

2. **Client receives email**
   - Email contains: `https://app/signup?token=[secure-token]`
   - Token valid for 7 days
   - Can resend if expired

3. **Client validates token**
   - GET `/api/gardener/clients/invitations/validate-token?token=...`
   - Returns: email + expiry (no account created yet)

4. **Client signs up**
   - POST `/api/gardener/clients/invitations/accept`
   - Body: token, password, confirmPassword, fullName
   - Updates ClientRecord with name + passwordHash
   - Marks InvitationRecord as Accepted

5. **Client logs in**
   - Can now authenticate and access dashboard

#### Key Points
- ✅ Client created on **invitation** (not signup)
- ✅ Gardener sees client **immediately** (Pending status)
- ✅ Signup only **updates** existing client
- ✅ Email link includes token (HMAC-SHA256 hashed)
- ✅ 7-day expiration on invitations
- ✅ RabbitMQ publishes events for async email

#### Status Values
```
Pending  = Invitation sent, waiting for signup
Accepted = Client created account
Revoked  = Gardener canceled invitation
Expired  = 7 days passed
```

### 2. Client List with Invitation Status ✅

#### Gardener View
- **Endpoint**: `GET /api/gardener/clients`
- **Shows**: Clients with invitation status
- **Fields**:
  ```json
  {
    "clientId": "guid",
    "fullName": "Client Name",
    "email": "client@example.com",
    "createdAt": "2026-03-21T...",
    "invitationStatus": "Pending|Accepted|Revoked|Expired|null",
    "invitationSentAt": "2026-03-21T...",
    "invitationAcceptedAt": "2026-03-21T...",
    "invitationExpiresAt": "2026-03-28T..."
  }
  ```

#### Admin View
- **Endpoint**: `GET /api/admin/clients`
- **Shows**: All clients + gardeners + invitation status
- **Additional Fields**:
  ```json
  {
    "gardeners": [
      {
        "gardenerId": "guid",
        "companyName": "Company",
        "contactName": "Contact"
      }
    ],
    "invitationStatus": "...",
    "invitationSentAt": "...",
    "invitationAcceptedAt": "...",
    "invitationExpiresAt": "..."
  }
  ```

### 3. Admin Dashboard ✅

#### Overview
Admins can see ALL data:
- All clients (with their gardeners)
- All gardeners (with their clients + count)
- All relationships
- System statistics

#### Key Endpoints
```
Clients:
  GET    /api/admin/clients
  GET    /api/admin/clients/{id}
  GET    /api/admin/clients/unassigned
  POST   /api/admin/clients
  PUT    /api/admin/clients/{id}
  DELETE /api/admin/clients/{id}

Gardeners:
  GET    /api/admin/gardeners
  GET    /api/admin/gardeners/{id}
  GET    /api/admin/gardeners/without-clients
  POST   /api/admin/gardeners
  PUT    /api/admin/gardeners/{id}
  DELETE /api/admin/gardeners/{id}

Relationships:
  GET    /api/admin/relationships
  GET    /api/admin/relationships/stats
  GET    /api/admin/relationships/gardeners/{id}
  GET    /api/admin/relationships/clients/{id}
  POST   /api/admin/relationships/create
  DELETE /api/admin/relationships/{clientId}/{gardenerId}
```

#### Statistics
```json
{
  "totalGardeners": 45,
  "totalClients": 150,
  "totalRelationships": 250,
  "gardenersWithClients": 35,
  "gardenersWithoutClients": 10,
  "clientsWithGardeners": 125,
  "clientsWithoutGardeners": 25
}
```

---

## API Endpoints

### Authentication

```
POST   /api/auth/login
       Body: { email, password }
       Returns: { token, user }

POST   /api/auth/logout
       Header: Authorization Bearer
       
POST   /api/auth/refresh
       Body: { refreshToken }
       Returns: { token }
```

### Gardener Operations

```
POST   /api/gardener/clients/invitations
       Body: { email }
       Returns: { invitationId, email, expiresAt }

GET    /api/gardener/clients/invitations/validate-token?token=...
       Returns: { email, expiresAtUtc, message }

POST   /api/gardener/clients/invitations/accept
       Body: { token, password, confirmPassword, fullName }
       Returns: { id, email, name, message }

GET    /api/gardener/clients
       Returns: [Client { invitation status }]
```

### Admin Operations

```
GET    /api/admin/clients
GET    /api/admin/gardeners
GET    /api/admin/relationships
GET    /api/admin/relationships/stats
POST   /api/admin/relationships/create
DELETE /api/admin/relationships/{clientId}/{gardenerId}
```

---

## Core Workflows

### Workflow 1: Onboard New Gardener
```
1. Admin creates gardener: POST /api/admin/gardeners
2. Admin views unassigned clients: GET /api/admin/clients/unassigned
3. Admin assigns clients: POST /api/admin/relationships/create
4. Admin verifies: GET /api/admin/gardeners/{id}
```

### Workflow 2: Client Invitation
```
1. Gardener invites: POST /api/gardener/clients/invitations
   → Creates: Invitation + Client + Link
   → Sends: Email with signup link
   
2. Gardener checks list: GET /api/gardener/clients
   → Sees: Client with "Pending" status
   
3. Client clicks link → Signup page loads
   
4. Client validates: GET /api/gardener/clients/invitations/validate-token
   
5. Client signs up: POST /api/gardener/clients/invitations/accept
   → Updates: ClientRecord (name + password)
   → Marks: InvitationRecord as Accepted
   
6. Gardener checks list: GET /api/gardener/clients
   → Sees: Client with "Accepted" status
   
7. Client logs in: POST /api/auth/login
```

### Workflow 3: Audit System
```
1. Get overview: GET /api/admin/relationships/stats
2. Find gaps: 
   - GET /api/admin/clients/unassigned
   - GET /api/admin/gardeners/without-clients
3. Make assignments: POST /api/admin/relationships/create
```

---

## Database Schema

### Invitations Table
```sql
CREATE TABLE Invitations (
  Id UNIQUEIDENTIFIER PRIMARY KEY,
  GardenerId UNIQUEIDENTIFIER NOT NULL,
  Email NVARCHAR(256) NOT NULL,
  TokenHash NVARCHAR(64) NOT NULL UNIQUE,
  Status INT NOT NULL (0=Pending, 1=Accepted, 2=Revoked, 3=Expired),
  CreatedAtUtc DATETIME2 NOT NULL,
  AcceptedAtUtc DATETIME2 NULL,
  ExpiresAtUtc DATETIME2 NOT NULL
)
```

### Clients Table
```sql
CREATE TABLE Clients (
  Id UNIQUEIDENTIFIER PRIMARY KEY,
  Email NVARCHAR(256) NOT NULL UNIQUE,
  Name NVARCHAR(200) NOT NULL,
  PasswordHash NVARCHAR(500) NOT NULL,
  CreatedAtUtc DATETIME2 NOT NULL,
  LastLogoutUtc DATETIME2 NULL
)
```

### GardenerClients Table (Link)
```sql
CREATE TABLE GardenerClients (
  Id UNIQUEIDENTIFIER PRIMARY KEY,
  GardenerId UNIQUEIDENTIFIER NOT NULL,
  ClientId UNIQUEIDENTIFIER NOT NULL
)
```

### Gardeners Table
```sql
CREATE TABLE Gardeners (
  Id UNIQUEIDENTIFIER PRIMARY KEY,
  Email NVARCHAR(256) NOT NULL UNIQUE,
  CompanyName NVARCHAR(200) NOT NULL,
  Name NVARCHAR(200) NULL,
  CreatedAtUtc DATETIME2 NOT NULL
)
```

---

## Code Patterns

### Module Structure
```
Module/
├─ Controllers/      (HTTP endpoints)
├─ Services/         (business logic)
├─ Handlers/         (request handlers)
├─ Models/           (domain models)
├─ ModuleExtensions.cs (DI registration)
└─ README.md         (module docs)
```

### Service Pattern
```csharp
public interface IMyService
{
    Task<Result> DoSomethingAsync(Guid id, CancellationToken ct);
}

public class MyService : IMyService
{
    private readonly GardenDbContext _dbContext;
    
    public MyService(GardenDbContext dbContext) => _dbContext = dbContext;
    
    public async Task<Result> DoSomethingAsync(Guid id, CancellationToken ct)
    {
        // Validate input
        // Query database
        // Apply business logic
        // Save changes
        // Return result
    }
}
```

### Controller Pattern
```csharp
[ApiController]
[Route("/api/endpoint")]
[Authorize(Roles = "Role")]
public class MyController : ControllerBase
{
    private readonly IMyService _service;
    
    public MyController(IMyService service) => _service = service;
    
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _service.GetAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }
}
```

### DTO Pattern
```csharp
public record MyDto(
    Guid Id,
    string Name,
    DateTime CreatedAt
);
```

---

## Testing

### Unit Tests
- Domain logic (invitations, validations)
- Service methods
- Authorization rules

### Integration Tests
- API + Database
- Full workflows
- Email sending (via RabbitMQ)

### Manual Testing
```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Get clients
curl http://localhost:5000/api/gardener/clients \
  -H "Authorization: Bearer [token]"

# Invite client
curl -X POST http://localhost:5000/api/gardener/clients/invitations \
  -H "Authorization: Bearer [token]" \
  -H "Content-Type: application/json" \
  -d '{"email":"newclient@example.com"}'
```

---

## Deployment

### Prerequisites
- .NET 10 SDK
- SQL Server 2019+
- RabbitMQ (local or hosted)
- SMTP server (for emails)

### Configuration
Set in `appsettings.json`:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=...;Database=garden;..."
  },
  "RabbitMq": {
    "HostName": "localhost",
    "Port": 5672,
    "UserName": "guest",
    "Password": "guest"
  },
  "Smtp": {
    "Host": "localhost",
    "Port": 1025,
    "EnableSsl": false
  },
  "Jwt": {
    "Secret": "your-secret-key-min-32-chars",
    "Issuer": "Garden",
    "Audience": "GardenUsers",
    "ExpiresInMinutes": 60
  }
}
```

### Database Migrations
```bash
# Apply migrations
dotnet ef database update

# Create migration
dotnet ef migrations add MigrationName
```

### Build & Run
```bash
# Build
dotnet build

# Run API
dotnet run --project src/Garden/Garden.Api

# Run Tests
dotnet test
```

### Docker
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## Troubleshooting

### Issue: Build Errors
**Solution**: 
- Clean: `dotnet clean`
- Restore: `dotnet restore`
- Rebuild: `dotnet build`

### Issue: Database Errors
**Solution**:
- Check connection string
- Ensure SQL Server is running
- Run migrations: `dotnet ef database update`
- Reset database: `dotnet ef database drop --force`

### Issue: Email Not Sending
**Solution**:
- Check RabbitMQ is running: `docker-compose up -d`
- Check SMTP settings in appsettings.json
- View RabbitMQ console: http://localhost:15672
- Check logs for errors

### Issue: Authorization Denied
**Solution**:
- Ensure token is valid
- Check role claim in token
- Verify endpoint has correct [Authorize] attribute
- Check resource ownership

### Issue: Invitation Expired
**Solution**:
- Tokens expire after 7 days
- Gardener should resend invitation
- Or admin can create new invitation endpoint

---

## Best Practices

### Code Quality
✅ Use explicit names  
✅ Keep functions small and focused  
✅ Validate at boundaries  
✅ Use async/await  
✅ Follow existing patterns  

### Authorization
✅ Always check role  
✅ Always check resource ownership  
✅ Never bypass authorization  
✅ Use [Authorize] attributes  

### Error Handling
✅ Return proper HTTP status codes  
✅ Don't leak sensitive data  
✅ Log errors with context  
✅ Handle gracefully  

### Testing
✅ Test authorization rules  
✅ Test business logic  
✅ Test happy paths and edge cases  
✅ Use integration tests for APIs  

---

## Development Workflow

### Before Committing
1. Build succeeds: `dotnet build`
2. Tests pass: `dotnet test`
3. No warnings or errors
4. Code follows patterns

### Commit Message Format
```
[Feature/Fix/Docs] Brief description

- Detailed change 1
- Detailed change 2
- Closes #123
```

### Code Review Checklist
- [ ] Code compiles
- [ ] Tests pass
- [ ] Follows patterns
- [ ] Authorization correct
- [ ] No breaking changes
- [ ] Documentation updated

---

## Key Files Reference

### Configuration
- `Garden.Api/appsettings.json` - Settings
- `docker-compose.yml` - Local services

### Core Services
- `Garden.Modules.Identity/` - Authentication
- `Garden.Modules.Clients/Services/InvitationService.cs` - Invitations
- `Garden.Modules.Notifications/` - Email
- `Garden.BuildingBlocks/` - Shared

### Controllers
- `Garden.Modules.Gardeners/Controllers/GardenerController.cs` - Gardener endpoints
- `Garden.Modules.Clients/Controllers/ClientsController.cs` - Client endpoints
- `Garden.Api/Controllers/AdminClientsController.cs` - Admin clients
- `Garden.Api/Controllers/AdminRelationshipsController.cs` - Admin relationships

---

## Upcoming Features

- [ ] Time tracking
- [ ] Job scheduling
- [ ] Service catalog
- [ ] Task management
- [ ] Recurring services
- [ ] Payment processing
- [ ] Notifications (SMS, push)
- [ ] Mobile app features

---

## Useful Links

- **Repository**: https://github.com/fuzibotond/garden
- **CI/CD**: Azure DevOps (garden)
- **Local Dev**: Docker Compose
- **Email Testing**: Mailhog (http://localhost:1025)
- **RabbitMQ Console**: http://localhost:15672

---

## Support

### Questions?
1. Check this documentation first
2. Search existing code/comments
3. Ask team lead
4. Create GitHub issue

### Reporting Issues
- Describe the problem
- List reproduction steps
- Include error messages
- Mention what you tried

---

**Status**: ✅ Complete  
**Last Updated**: March 2026  
**Maintained By**: Development Team
