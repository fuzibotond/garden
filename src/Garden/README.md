# Garden App - Backend API

A modular monolith backend for a gardener service platform built with ASP.NET Core 10.

## Description

Garden App is a backend system that connects gardeners with clients, enabling service management, job scheduling, and work tracking.

### Key Users
- **Gardeners**: Manage clients, materials, task types, jobs, and track working hours
- **Clients**: Create tasks, schedule work requests, and view upcoming visits  
- **Admins**: Oversee all system data, manage users and relationships

## Tech Stack

**Framework & Language**
- ASP.NET Core 10 (C# 14.0)
- Entity Framework Core

**Database & Messaging**
- SQL Server
- RabbitMQ (async event handling)

**Authentication & Authorization**
- JWT Bearer tokens
- Role-based access control (Admin, Gardener, Client)

**Notifications**
- SMTP (email)
- Expo Push Notifications (mobile)

**Libraries**
- MediatR (CQRS pattern)
- FluentValidation (input validation)
- Serilog (structured logging)

## Getting Started

### Prerequisites
- .NET 10 SDK
- Docker & Docker Compose
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/fuzibotond/garden.git
cd garden/src/Garden
```

2. **Start infrastructure services**
```bash
docker-compose up -d
```

This starts:
- SQL Server (port 1433)
- RabbitMQ (port 5672, management UI: http://localhost:15672)
- MailDev (SMTP testing: http://localhost:1080)

3. **Configure application settings**

Update `Garden.Api/appsettings.json`:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost,1433;Database=garden;User Id=sa;Password=YourPassword123;TrustServerCertificate=True;"
  },
  "Jwt": {
    "Secret": "your-32-char-minimum-secret-key-here",
    "Issuer": "Garden",
    "Audience": "GardenUsers",
    "ExpiresInMinutes": 60
  }
}
```

4. **Run database migrations**
```bash
cd Garden.Api
dotnet ef database update
```

5. **Run the application**
```bash
dotnet run
```

The API will be available at: `https://localhost:7001`

## Running the Project

### Local Development
```bash
dotnet run --project Garden.Api
```

### Using Docker
```bash
docker-compose up
```

### Running Tests
```bash
dotnet test
```

## Project Structure

```
src/Garden/
├── Garden.Api/                      # API entry point, controllers
├── Garden.BuildingBlocks/           # Shared infrastructure (DbContext, events, migrations)
├── Garden.Modules.Identity/         # Authentication, authorization, user profiles
├── Garden.Modules.Gardeners/        # Gardener management
├── Garden.Modules.Clients/          # Client management, invitations
├── Garden.Modules.Catalog/          # Task types catalog
├── Garden.Modules.Materials/        # Material management
├── Garden.Modules.Tasks/            # Task management
├── Garden.Modules.Scheduling/       # Jobs and task schedule requests
└── Garden.Modules.Notifications/    # Email and push notifications

tests/
└── Garden.Api.Tests/                # Integration and unit tests
```

### Module Responsibilities

| Module | Purpose |
|--------|---------|
| **Identity** | User authentication, JWT tokens, profiles, push token registration |
| **Gardeners** | Gardener registration, profile management |
| **Clients** | Client management, invitation flow |
| **Catalog** | Global task types available to all gardeners |
| **Materials** | Gardener-specific materials with pricing |
| **Tasks** | Task creation, updates, material tracking, questions & answers |
| **Scheduling** | Jobs, task schedule requests (propose/approve/decline/reschedule) |
| **Notifications** | Email and push notifications via RabbitMQ consumers |

## Architecture

### Design Pattern
**Modular Monolith** with vertical slice architecture within each module.

### Key Principles
- Clear module boundaries
- Feature-based organization (vertical slices)
- Business logic in handlers, not controllers
- Event-driven communication between modules (RabbitMQ)
- Single shared database (Garden.BuildingBlocks)

### Domain Model

**Core Entities:**
- **Gardener**: Service provider managing clients and work
- **Client**: Customer requesting gardening services
- **Material**: Gardener-defined materials with pricing
- **TaskType**: Global catalog of available task types
- **Task**: Individual work item requested by client
- **Job**: Container for multiple tasks with client relationship
- **TaskScheduleRequest**: Scheduling negotiation between gardener and client
- **TaskQuestion**: Question asked by gardener to client about a task
- **TaskAnswer**: Client's response to a gardener's question
- **Invitation**: Email-based client onboarding flow

**Key Relationships:**
- Gardener ↔ Client (many-to-many via GardenerClients)
- Gardener → Materials (one-to-many)
- Gardener → TaskTypes (many-to-many via GardenerTaskTypes)
- Client → Jobs (one-to-many)
- Job → Tasks (one-to-many)
- Task → Materials (many-to-many via TaskMaterials with snapshots)
- Task ↔ Client + Gardener (TaskScheduleRequest for scheduling)
- Task → Questions → Answers (Q&A workflow for task clarifications with media support)

## Documentation

Detailed documentation is available in the `/docs` folder:

- **[API Reference](docs/API_REFERENCE.md)** - Complete endpoint documentation with examples
- **[Architecture Guide](docs/ARCHITECTURE.md)** - System design and patterns
- **[Developer Guide](docs/DEVELOPER_GUIDE.md)** - Development workflows and patterns
- **[Database Schema](docs/DATABASE.md)** - Entity relationships and migrations
- **[Testing Guide](docs/TESTING.md)** - Test strategies and examples

## API Overview

The API uses JWT Bearer token authentication. Three roles are supported:
- `Admin` - Full system access
- `Gardener` - Access to own resources and clients
- `Client` - Access to own resources

### Key Endpoint Groups

| Endpoint Group | Description |
|----------------|-------------|
| `/api/auth/*` | Authentication (login, register, refresh) |
| `/api/profile/*` | User profile management |
| `/api/gardeners/*` | Gardener operations |
| `/api/clients/*` | Client operations |
| `/api/admin/*` | Admin-only operations |
| `/api/materials/*` | Material management |
| `/api/task-types/*` | Task type catalog |
| `/api/tasks/*` | Task management and questions |
| `/api/jobs/*` | Job management |
| `/api/schedule/*` | Schedule request management |
| `/api/questions/*` | Question and answer management |
| `/api/answers/*` | Answer media uploads |

See [API_REFERENCE.md](docs/API_REFERENCE.md) for complete endpoint documentation.

## Contributing

1. Create a feature branch
```bash
git checkout -b feature/your-feature-name
```

2. Follow existing code patterns
- Keep business logic in handlers
- Use vertical slice organization
- Add tests for business rules
- Follow domain language (Task vs Job distinction)

3. Update documentation if needed
- API changes → update API_REFERENCE.md
- Architecture changes → update ARCHITECTURE.md
- Database changes → update DATABASE.md

4. Run tests before committing
```bash
dotnet test
```

5. Commit and push
```bash
git commit -m "feat: description of changes"
git push origin feature/your-feature-name
```

## Troubleshooting

### Database Connection Issues
```bash
# Check if SQL Server is running
docker ps | grep sql

# Reset database
dotnet ef database drop --force
dotnet ef database update
```

### RabbitMQ Connection Issues
```bash
# Check RabbitMQ status
docker ps | grep rabbitmq

# View RabbitMQ logs
docker-compose logs rabbitmq

# Access management UI
# http://localhost:15672 (guest/guest)
```

### Build Errors
```bash
dotnet clean
dotnet restore
dotnet build
```

### Test Failures
```bash
# Run specific test
dotnet test --filter "FullyQualifiedName~YourTestName"

# Run with detailed output
dotnet test --logger "console;verbosity=detailed"
```

## Environment Variables

Required environment variables (or appsettings.json):

```bash
# Database
ConnectionStrings__DefaultConnection="Server=localhost,1433;Database=garden;..."

# JWT
Jwt__Secret="minimum-32-character-secret-key"
Jwt__Issuer="Garden"
Jwt__Audience="GardenUsers"
Jwt__ExpiresInMinutes="60"

# RabbitMQ
RabbitMq__HostName="localhost"
RabbitMq__Port="5672"

# SMTP
Smtp__Host="localhost"
Smtp__Port="1025"
Smtp__From="noreply@garden.app"

# Expo Push Notifications
Expo__AccessToken="your-expo-token"
```

## License

[Your License Here]

## Support

For issues or questions:
1. Check [docs/](docs/) folder for detailed documentation
2. Review [API_REFERENCE.md](docs/API_REFERENCE.md) for endpoint usage
3. Create a GitHub issue with reproduction steps

---

**Version**: 1.0  
**Last Updated**: 2026-04-24  
**Status**: ✅ Production Ready
