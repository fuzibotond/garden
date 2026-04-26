# Documentation Index

**Version**: 1.0.1  
**Last Updated**: 2026-04-26

---

Welcome to the Garden App Backend documentation! This folder contains comprehensive guides for developers working on the backend API.

## 📚 Documentation Structure

### Core Documentation

| Document | Description | Audience |
|----------|-------------|----------|
| **[API Reference](API_REFERENCE.md)** | Complete API endpoint documentation with request/response examples | Frontend developers, API consumers |
| **[Architecture Guide](ARCHITECTURE.md)** | System design, patterns, and architectural decisions | Backend developers, architects |
| **[Developer Guide](DEVELOPER_GUIDE.md)** | Development workflows, code patterns, and common tasks | Backend developers |
| **[Database Schema](DATABASE.md)** | Entity relationships, tables, and migrations | Backend developers, DBAs |
| **[Testing Guide](TESTING.md)** | Testing strategies, templates, and best practices | Backend developers |

### Project Rules

| Document | Description |
|----------|-------------|
| **[AI Rules](ai-rule.md)** | Rules for AI-assisted development (Copilot, ChatGPT) |
| **[Copilot Instructions](../.github/copilot-instructions.md)** | GitHub Copilot project instructions |

---

## Quick Start

### For New Developers

1. Start with [Developer Guide](DEVELOPER_GUIDE.md) → Getting Started
2. Create `Garden.Api/.env.local` using the Developer Guide setup section
3. Read [Architecture Guide](ARCHITECTURE.md) → Overview
4. Review [API Reference](API_REFERENCE.md) for available endpoints
5. Check [Database Schema](DATABASE.md) to understand data model

### For Frontend Developers

1. Read [API Reference](API_REFERENCE.md)
2. Review authentication flow in [Architecture Guide](ARCHITECTURE.md)
3. Check event-driven communication for real-time updates

### For Architects / Tech Leads

1. Read [Architecture Guide](ARCHITECTURE.md)
2. Review [Database Schema](DATABASE.md)
3. Check [Testing Guide](TESTING.md) for quality standards

---

## Documentation by Topic

### Authentication & Authorization

- **Login/Register**: [API Reference](API_REFERENCE.md#authentication)
- **JWT Tokens**: [Architecture Guide](ARCHITECTURE.md#authentication--authorization)
- **Role-Based Access**: [Architecture Guide](ARCHITECTURE.md#role-based-access-control)

### Domain Concepts

- **Task vs Job**: [Copilot Instructions](../.github/copilot-instructions.md)
- **Invitation Flow**: [API Reference](API_REFERENCE.md#client-operations)
- **Schedule Requests**: [API Reference](API_REFERENCE.md#schedule-requests)

### Code Patterns

- **Handlers**: [Developer Guide](DEVELOPER_GUIDE.md#handler-pattern)
- **Authorization**: [Developer Guide](DEVELOPER_GUIDE.md#authorization-pattern)
- **Events**: [Developer Guide](DEVELOPER_GUIDE.md#event-publishing-pattern)
- **Testing**: [Testing Guide](TESTING.md)

### Database

- **Entity Relationships**: [Database Schema](DATABASE.md#entity-relationship-diagram)
- **Migrations**: [Database Schema](DATABASE.md#migrations)
- **Indexes**: [Database Schema](DATABASE.md#indexes-strategy)

### Infrastructure

- **Modular Monolith**: [Architecture Guide](ARCHITECTURE.md#modular-monolith)
- **Event-Driven Communication**: [Architecture Guide](ARCHITECTURE.md#event-driven-communication)
- **Module Structure**: [Architecture Guide](ARCHITECTURE.md#module-structure)

---

## API Quick Reference

### Base URL
```
https://localhost:7001/api
```

### Authentication Endpoints
- `POST /auth/gardener/register` - Register gardener
- `POST /auth/login` - Login
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - Logout

### Resource Endpoints
- `/profile/*` - User profile operations
- `/materials/*` - Material management
- `/task-types/*` - Task type catalog
- `/tasks/*` - Task operations
- `/jobs/*` - Job management
- `/schedule/*` - Schedule request workflow
- `/admin/*` - Admin operations

See [API Reference](API_REFERENCE.md) for complete documentation.

---

## Domain Language

Consistent terminology used throughout the system:

| Term | Definition |
|------|------------|
| **Gardener** | Service provider managing clients and work |
| **Client** | Customer requesting gardening services |
| **Task** | Individual work item requested by client |
| **Job** | Container for multiple tasks with client relationship |
| **Material** | Gardener-defined materials with pricing |
| **TaskType** | Global catalog of available task types |
| **Invitation** | Email-based client onboarding flow |
| **Schedule Request** | Scheduling negotiation between gardener and client |

---

## Tech Stack Summary

| Category | Technology |
|----------|-----------|
| **Framework** | ASP.NET Core 10 (C# 14.0) |
| **ORM** | Entity Framework Core |
| **Database** | SQL Server |
| **Messaging** | RabbitMQ |
| **Authentication** | JWT Bearer |
| **Validation** | FluentValidation |
| **Testing** | xUnit, FluentAssertions |
| **Logging** | Serilog |

---

## Module Overview

```
Garden.Api                     → HTTP entry point
Garden.BuildingBlocks          → Shared infrastructure (DbContext, events)
Garden.Modules.Identity        → Authentication, profiles, push tokens
Garden.Modules.Gardeners       → Gardener management
Garden.Modules.Clients         → Client management, invitations
Garden.Modules.Catalog         → Task types catalog
Garden.Modules.Materials       → Material management
Garden.Modules.Tasks           → Task operations
Garden.Modules.Scheduling      → Jobs, schedule requests
Garden.Modules.Notifications   → Email & push notifications
```

See [Architecture Guide](ARCHITECTURE.md#module-structure) for detailed information.

---

## Development Workflow

1. **Setup**: [Developer Guide](DEVELOPER_GUIDE.md#getting-started)
2. **Add Feature**: [Developer Guide](DEVELOPER_GUIDE.md#adding-a-new-feature)
3. **Test Feature**: [Testing Guide](TESTING.md)
4. **Update Docs**: Update relevant documentation
5. **Submit PR**: Follow contribution guidelines

---

## Testing Strategy

| Test Type | Coverage | Purpose |
|-----------|----------|---------|
| **Unit Tests** | 80%+ | Handlers, services, business logic |
| **Integration Tests** | Key flows | API + database integration |
| **E2E Tests** | Critical paths | End-to-end user journeys (future) |

See [Testing Guide](TESTING.md) for detailed information.

---

## Common Tasks

### Run the Application
```bash
cd Garden.Api
dotnet run
```

### Run Tests
```bash
dotnet test
```

### Apply Migrations
```bash
cd Garden.Api
dotnet ef database update
```

### Create Migration
```bash
cd Garden.BuildingBlocks
dotnet ef migrations add MigrationName --startup-project ../Garden.Api
```

See [Developer Guide](DEVELOPER_GUIDE.md#common-tasks) for more.

---

## Documentation Maintenance

### When to Update

Update documentation when:
- ✅ API endpoints change
- ✅ Database schema changes
- ✅ Architecture decisions are made
- ✅ New modules are added
- ✅ Authentication flow changes
- ✅ Domain concepts evolve

### How to Update

1. Update relevant documentation file(s)
2. Update version number and "Last Updated" date
3. Add entry to Change Log section
4. Keep changes consistent across docs
5. Update this README if structure changes

### Version Format

Follow semantic versioning for documentation:
- **MAJOR**: Breaking conceptual changes
- **MINOR**: New sections or features
- **PATCH**: Edits, clarifications, fixes

---

## Contributing to Documentation

When adding or updating documentation:

1. **Follow existing structure** - Use similar formatting and organization
2. **Be concise** - Clear and direct language
3. **Include examples** - Code snippets and practical examples
4. **Update index** - Keep this README current
5. **Version properly** - Update version and change log
6. **Cross-reference** - Link to related documentation

---

## Support

### Getting Help

1. Check relevant documentation above
2. Review [Developer Guide](DEVELOPER_GUIDE.md) troubleshooting section
3. Check code comments and examples
4. Create GitHub issue with reproduction steps

### Reporting Documentation Issues

If you find:
- Outdated information
- Broken links
- Missing documentation
- Unclear explanations

Please create a GitHub issue with:
- Document name
- Section reference
- Description of issue
- Suggested improvement (optional)

---

## Change Log

### [1.0.1] - 2026-04-26
- Updated docs index version metadata to semantic version format
- Added quick-start reference to `.env.local` setup in Developer Guide

### [1.0.0] - 2026-04-24
- Initial documentation structure
- API Reference complete
- Architecture Guide complete
- Developer Guide complete
- Database Schema documented
- Testing Guide complete
- Documentation index created

---

**Status**: ✅ Complete  
**Maintained By**: Backend Team
