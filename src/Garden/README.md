# Garden App - Gardener Service Platform

A comprehensive service platform connecting gardeners with clients. Gardeners manage services, clients, jobs, and schedules. Clients request work and track visits. Admins oversee everything.

## 🎯 Key Features

### For Gardeners
- ✅ Invite and manage clients
- ✅ Define and offer services  
- ✅ Schedule jobs and visits
- ✅ Track working hours
- ✅ Manage client relationships

### For Clients
- ✅ Accept gardener invitations
- ✅ Create work tasks
- ✅ Request services
- ✅ View upcoming visits
- ✅ Manage profile

### For Admins
- ✅ View all clients and gardeners
- ✅ See client-gardener relationships
- ✅ Manage user accounts
- ✅ View system statistics
- ✅ Oversee operations

---

## 🚀 Quick Start

### Prerequisites
- .NET 10 SDK
- SQL Server 2019+
- Docker & Docker Compose
- RabbitMQ

### Setup

1. **Clone Repository**
```bash
git clone https://github.com/fuzibotond/garden.git
cd garden
```

2. **Start Services**
```bash
docker-compose up -d
```

3. **Update Database**
```bash
dotnet ef database update
```

4. **Run API**
```bash
dotnet run --project src/Garden/Garden.Api
```

API will be available at: `http://localhost:5000`

---

## 📚 Documentation

**Single source of truth**: [`DEVELOPMENT_GUIDE.md`](DEVELOPMENT_GUIDE.md)

Contains:
- ✅ Architecture overview
- ✅ All API endpoints
- ✅ Database schema
- ✅ Code patterns
- ✅ Testing guide
- ✅ Deployment instructions
- ✅ Troubleshooting

---

## 🏗️ Architecture

### Modular Monolith
```
Garden.Api (entry point)
├─ Identity (auth, profiles)
├─ Gardeners (gardener management)
├─ Clients (client management)
├─ Catalog (services)
├─ Tasks (work items)
├─ Scheduling (jobs)
├─ Notifications (email)
├─ TimeTracking (hours)
└─ BuildingBlocks (shared)
```

### Tech Stack
- **Backend**: ASP.NET Core 10, Entity Framework Core
- **Database**: SQL Server
- **Messaging**: RabbitMQ
- **Auth**: JWT tokens
- **Frontend**: React Native (mobile), React (web)

---

## 🔑 Key Workflows

### 1. Client Invitation
```
1. Gardener invites client by email
2. Client receives signup link
3. Client signs up with password
4. Client can now login and use platform
```

### 2. Gardener Services
```
1. Gardener defines services
2. Client requests service
3. Gardener schedules job
4. Job contains one or more tasks
5. Work is tracked and completed
```

### 3. Admin Operations
```
1. View all clients and gardeners
2. See their relationships
3. Create manual assignments
4. View system statistics
```

---

## 📊 Data Model

### Core Entities
- **Gardener**: Service provider
- **Client**: Service requester  
- **Service**: Gardener's offering (e.g., "Lawn Mowing")
- **Job**: Scheduled visit
- **Task**: Work item within a job
- **Invitation**: Email invite with token and expiry

### Relationships
```
Gardener ←→ Client (many-to-many)
Gardener → Service (one-to-many)
Service → Job (one-to-many)
Job → Task (one-to-many)
Gardener → Invitation (one-to-many)
```

---

## 🔐 Authorization

**Three Roles**:
- **Admin**: Full system access
- **Gardener**: Own clients, services, jobs
- **Client**: Own tasks, jobs, invitations

**Rule**: Always check role + resource ownership

---

## 📡 API Endpoints

### Authentication
```
POST   /api/auth/login          - Login
POST   /api/auth/logout         - Logout
POST   /api/auth/refresh        - Refresh token
```

### Gardener Operations
```
GET    /api/gardener/clients              - List clients
POST   /api/gardener/clients/invitations  - Invite client
GET    /api/gardener/clients/invitations/validate-token
POST   /api/gardener/clients/invitations/accept
```

### Admin Operations
```
GET    /api/admin/clients                 - All clients
GET    /api/admin/gardeners               - All gardeners
GET    /api/admin/relationships           - All relationships
GET    /api/admin/relationships/stats     - Statistics
POST   /api/admin/relationships/create    - Link client-gardener
DELETE /api/admin/relationships/{c}/{g}   - Unlink
```

---

## 🧪 Testing

### Run All Tests
```bash
dotnet test
```

### Run Specific Test
```bash
dotnet test --filter ClassName
```

### Manual Testing
```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass"}'

# Get token and use in requests
curl http://localhost:5000/api/gardener/clients \
  -H "Authorization: Bearer [token]"
```

---

## 🚢 Deployment

### Development
```bash
docker-compose up
dotnet run --project src/Garden/Garden.Api
```

### Production
```bash
# Build
dotnet publish -c Release

# Deploy to Azure/Docker
# Configure appsettings.Production.json
# Set environment variables
```

See [`DEVELOPMENT_GUIDE.md`](DEVELOPMENT_GUIDE.md) for detailed deployment instructions.

---

## 📝 Domain Language

- **Task**: Individual work item requested by client
- **Job**: Scheduled visit that may contain multiple tasks
- **Service**: Gardener-defined offering (e.g., "Lawn Mowing")
- **Recurring Service**: Repeating service plan
- **Invitation**: Process to add new client via email

---

## 🛠️ Development

### Code Style
- Follow existing patterns
- Keep functions small and focused
- Use explicit names
- Add comments for non-obvious code
- Validate at boundaries

### Adding a Feature
1. Update `DEVELOPMENT_GUIDE.md`
2. Implement backend logic
3. Add tests
4. Update frontend
5. Test full workflow
6. Commit and push

### File Structure
```
src/Garden/
├─ Garden.Api/              (HTTP entry point)
├─ Garden.Modules.*/        (Feature modules)
├─ Garden.BuildingBlocks/   (Shared infrastructure)
└─ Migrations/              (Database migrations)

tests/
└─ Garden.Api.Tests/        (API tests)
```

---

## 📋 Configuration

### appsettings.json
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=...;Database=garden;..."
  },
  "RabbitMq": {
    "HostName": "localhost",
    "Port": 5672
  },
  "Smtp": {
    "Host": "localhost",
    "Port": 1025
  },
  "Jwt": {
    "Secret": "your-32-char-secret-key-here",
    "ExpiresInMinutes": 60
  }
}
```

---

## 🐛 Troubleshooting

### Build Errors
```bash
dotnet clean
dotnet restore
dotnet build
```

### Database Issues
```bash
# Reset database
dotnet ef database drop --force
dotnet ef database update

# Check migrations
dotnet ef migrations list
```

### Email Not Sending
- Check RabbitMQ: `docker-compose logs rabbitmq`
- Check SMTP: Verify settings in appsettings.json
- View email queue: http://localhost:15672 (RabbitMQ console)

### Authorization Failed
- Verify token is valid
- Check role claim in token
- Ensure [Authorize] attribute is present
- Verify resource ownership

---

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/name`
2. Make changes and test
3. Update documentation if needed
4. Commit: `git commit -m "[Feature] Description"`
5. Push and create pull request

---

## 📚 Learn More

- **Full Documentation**: [`DEVELOPMENT_GUIDE.md`](DEVELOPMENT_GUIDE.md)
- **API Examples**: In DEVELOPMENT_GUIDE.md → API Endpoints
- **Architecture**: In DEVELOPMENT_GUIDE.md → Architecture
- **Database**: In DEVELOPMENT_GUIDE.md → Database Schema

---

## 📊 Project Status

✅ **Core Features**: Complete
- ✅ Authentication & Authorization
- ✅ Client Invitations
- ✅ Gardener Management
- ✅ Client Management
- ✅ Admin Dashboard
- ✅ Invitation Status Tracking

⏳ **Upcoming Features**
- [ ] Time Tracking
- [ ] Job Scheduling
- [ ] Service Catalog
- [ ] Task Management
- [ ] Recurring Services
- [ ] Payment Integration
- [ ] Mobile Push Notifications

---

## 🎯 Environment Variables

```bash
# Database
CONNECTIONSTRINGS__DEFAULTCONNECTION=Server=...

# RabbitMQ
RABBITMQ__HOSTNAME=localhost
RABBITMQ__PORT=5672

# SMTP
SMTP__HOST=localhost
SMTP__PORT=1025

# JWT
JWT__SECRET=your-secret-key
JWT__ISSUER=Garden
JWT__AUDIENCE=GardenUsers
JWT__EXPIRESMINUTES=60

# Environment
ASPNETCORE_ENVIRONMENT=Development
```

---

## 📞 Support

### Documentation Questions
→ Check [`DEVELOPMENT_GUIDE.md`](DEVELOPMENT_GUIDE.md)

### Code Questions
→ Review relevant source files in `src/Garden/`

### Issues
→ Create GitHub issue with:
- Description
- Reproduction steps
- Error message
- What you tried

---

## 📄 License

[Your License Here]

---

## 👥 Team

Development Team at Garden App

---

**Status**: ✅ Production Ready  
**Last Updated**: March 2026  
**Build**: ✅ Successful (0 errors)
