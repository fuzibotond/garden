# Developer Guide

**Version**: 1.2.0
**Last Updated**: 2026-04-26

---

## Change Log

### [1.2.0] - 2026-04-26
- Added root local launcher scripts for the full stack
- Added local health, smoke, and logs workflow
- Updated local environment guidance to use root `.env.example` files

### [1.1.1] - 2026-04-26
- Updated local environment setup to `.env.local`
- Corrected environment variable names to `ConnectionStrings__GardenDb` and `Jwt__Key`
- Normalized version format to semantic versioning

### [1.1.0] - 2026-04-24
- Added Task Questions and Answers feature implementation example
- Added RabbitMQ event consumer patterns for questions
- Updated best practices for event-driven features

### [1.0.0] - 2026-04-24
- Initial developer guide

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Workflow](#development-workflow)
3. [Code Patterns](#code-patterns)
4. [Testing](#testing)
5. [Database Migrations](#database-migrations)
6. [Debugging](#debugging)
7. [Common Tasks](#common-tasks)
8. [Best Practices](#best-practices)

---

## Getting Started

### Prerequisites

Install the following:
- .NET 10 SDK
- Visual Studio 2022 or VS Code with C# extension
- Docker Desktop
- Git
- SQL Server Management Studio (optional)

### Initial Setup

1. **Clone repository**
```bash
git clone https://github.com/fuzibotond/garden.git
cd garden/src/Garden
```

2. **Start the local stack from the repo root**
```bash
powershell -ExecutionPolicy Bypass -File .\scripts\launch-local.ps1
```

3. **Check local health**

```bash
powershell -ExecutionPolicy Bypass -File .\scripts\check-health.ps1
```

4. **Create local environment files only if you need overrides**

Copy the root example files:
```env
.env.example -> .env
.env.local.example -> .env.local
```

5. **Restore dependencies**
```bash
dotnet restore
```

6. **Run the application outside Docker only when needed**
```bash
cd src\Garden\Garden.Api
dotnet run
```

7. **Verify**
- API: http://localhost:5055
- Swagger: http://localhost:5055/swagger
- Health: http://localhost:5055/health/ready
- Metrics: http://localhost:5055/metrics
- RabbitMQ Console: http://localhost:15672 (guest/guest)
- MailHog: http://localhost:8025
- Dozzle: http://localhost:9999

8. **Run smoke tests**

```bash
powershell -ExecutionPolicy Bypass -File .\scripts\run-smoke-tests.ps1
```

---

## Development Workflow

### Adding a New Feature

Follow these steps for consistent feature development:

#### 1. Plan the Feature

- Define the use case
- Identify affected modules
- Design API contracts
- Consider events needed

#### 2. Create Request/Response DTOs

**Request DTO:**
```csharp
public class CreateMaterialRequest
{
    public string Name { get; set; }
    public string AmountType { get; set; }
    public decimal PricePerAmount { get; set; }
}
```

**Response DTO:**
```csharp
public class CreateMaterialResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public string AmountType { get; set; }
    public decimal PricePerAmount { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

#### 3. Create Validator

```csharp
public class CreateMaterialValidator : AbstractValidator<CreateMaterialRequest>
{
    public CreateMaterialValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(256);
            
        RuleFor(x => x.AmountType)
            .NotEmpty()
            .MaximumLength(50);
            
        RuleFor(x => x.PricePerAmount)
            .GreaterThan(0);
    }
}
```

#### 4. Create Handler

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
    
    public async Task<CreateMaterialResponse> HandleAsync(CreateMaterialRequest request)
    {
        var gardenerId = _currentUser.GetGardenerId();
        
        var material = new MaterialRecord
        {
            Id = Guid.NewGuid(),
            GardenerId = gardenerId,
            Name = request.Name,
            AmountType = request.AmountType,
            PricePerAmount = request.PricePerAmount,
            CreatedAt = DateTime.UtcNow
        };
        
        _context.Materials.Add(material);
        await _context.SaveChangesAsync();
        
        return new CreateMaterialResponse
        {
            Id = material.Id,
            Name = material.Name,
            AmountType = material.AmountType,
            PricePerAmount = material.PricePerAmount,
            CreatedAt = material.CreatedAt
        };
    }
}
```

#### 5. Create Controller Endpoint

```csharp
[ApiController]
[Route("api/materials")]
[Authorize]
public class MaterialsController : ControllerBase
{
    private readonly CreateMaterialHandler _createHandler;
    
    public MaterialsController(CreateMaterialHandler createHandler)
    {
        _createHandler = createHandler;
    }
    
    [HttpPost]
    [Authorize(Roles = "Gardener")]
    public async Task<IActionResult> CreateMaterial([FromBody] CreateMaterialRequest request)
    {
        var response = await _createHandler.HandleAsync(request);
        return CreatedAtAction(nameof(GetMaterial), new { id = response.Id }, response);
    }
}
```

#### 6. Register Dependencies

In `ModuleExtensions.cs`:
```csharp
public static class ModuleExtensions
{
    public static IServiceCollection AddMaterialsModule(this IServiceCollection services)
    {
        services.AddScoped<CreateMaterialHandler>();
        services.AddScoped<IValidator<CreateMaterialRequest>, CreateMaterialValidator>();
        
        return services;
    }
}
```

#### 7. Add Tests

```csharp
public class CreateMaterialHandlerTests
{
    [Fact]
    public async Task HandleAsync_ValidRequest_CreatesMaterial()
    {
        // Arrange
        var context = CreateInMemoryContext();
        var currentUser = new FakeCurrentUser { GardenerId = Guid.NewGuid() };
        var handler = new CreateMaterialHandler(context, currentUser);
        
        var request = new CreateMaterialRequest
        {
            Name = "Test Material",
            AmountType = "kg",
            PricePerAmount = 10.00m
        };
        
        // Act
        var response = await handler.HandleAsync(request);
        
        // Assert
        response.Should().NotBeNull();
        response.Id.Should().NotBeEmpty();
        response.Name.Should().Be("Test Material");
        
        var material = await context.Materials.FindAsync(response.Id);
        material.Should().NotBeNull();
    }
}
```

#### 8. Update Documentation

- Add endpoint to `docs/API_REFERENCE.md`
- Update module description if needed

---

## Code Patterns

### Handler Pattern

All business logic in dedicated handler classes:

```csharp
public class SomeFeatureHandler
{
    private readonly GardenDbContext _context;
    private readonly ICurrentUser _currentUser;
    private readonly IEmailService _emailService;
    
    public SomeFeatureHandler(
        GardenDbContext context,
        ICurrentUser currentUser,
        IEmailService emailService)
    {
        _context = context;
        _currentUser = currentUser;
        _emailService = emailService;
    }
    
    public async Task<SomeResponse> HandleAsync(SomeRequest request)
    {
        // 1. Validate authorization
        var userId = _currentUser.GetUserId();
        
        // 2. Load data
        var entity = await _context.Entities.FindAsync(request.Id);
        
        // 3. Apply business logic
        entity.ApplySomeChange(request.Data);
        
        // 4. Save changes
        await _context.SaveChangesAsync();
        
        // 5. Publish events (if needed)
        await _eventBus.PublishAsync(new SomeEvent { ... });
        
        // 6. Return response
        return new SomeResponse { ... };
    }
}
```

### Authorization Pattern

Always check:
1. Role requirement (via `[Authorize(Roles = "...")]`)
2. Resource ownership (in handler)

```csharp
public async Task<Material> GetMaterialAsync(Guid materialId)
{
    var material = await _context.Materials.FindAsync(materialId);
    
    if (material == null)
        throw new NotFoundException("Material not found");
        
    // Check ownership
    if (material.GardenerId != _currentUser.GetGardenerId())
        throw new ForbiddenException("You don't have access to this material");
        
    return material;
}
```

### Event Publishing Pattern

```csharp
// 1. Define event
public class InvitationCreatedEvent
{
    public Guid InvitationId { get; set; }
    public string ClientEmail { get; set; }
    public string InvitationToken { get; set; }
}

// 2. Publish in handler
await _eventBus.PublishAsync(new InvitationCreatedEvent
{
    InvitationId = invitation.Id,
    ClientEmail = invitation.Email,
    InvitationToken = token
});

// 3. Consume in subscriber
public class InvitationEmailConsumer : IConsumer<InvitationCreatedEvent>
{
    public async Task Consume(ConsumeContext<InvitationCreatedEvent> context)
    {
        var @event = context.Message;
        await _emailService.SendInvitationEmailAsync(@event.ClientEmail, @event.InvitationToken);
    }
}
```

---

## Testing

### Test Structure

```
tests/Garden.Api.Tests/
├── Identity/
│   └── AuthenticationTests.cs
├── Clients/
│   └── InvitationServiceTests.cs
├── Materials/
│   └── MaterialsHandlerTests.cs
├── TestHelpers/
│   ├── FakeCurrentUser.cs
│   └── FakeJwtTokenService.cs
└── Integration/
    └── InvitationFlowIntegrationTests.cs
```

### Unit Test Example

```csharp
public class CreateMaterialHandlerTests
{
    private readonly GardenDbContext _context;
    private readonly FakeCurrentUser _currentUser;
    private readonly CreateMaterialHandler _handler;
    
    public CreateMaterialHandlerTests()
    {
        var options = new DbContextOptionsBuilder<GardenDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
            
        _context = new GardenDbContext(options);
        _currentUser = new FakeCurrentUser { GardenerId = Guid.NewGuid() };
        _handler = new CreateMaterialHandler(_context, _currentUser);
    }
    
    [Fact]
    public async Task HandleAsync_ValidRequest_CreatesMaterial()
    {
        // Arrange
        var request = new CreateMaterialRequest
        {
            Name = "Test Material",
            AmountType = "kg",
            PricePerAmount = 10.00m
        };
        
        // Act
        var response = await _handler.HandleAsync(request);
        
        // Assert
        response.Should().NotBeNull();
        response.Name.Should().Be("Test Material");
        
        var material = await _context.Materials.FindAsync(response.Id);
        material.Should().NotBeNull();
        material.GardenerId.Should().Be(_currentUser.GardenerId);
    }
}
```

### Integration Test Example

```csharp
public class InvitationFlowIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;
    
    public InvitationFlowIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }
    
    [Fact]
    public async Task InvitationFlow_Success()
    {
        // 1. Register gardener
        var registerResponse = await _client.PostAsJsonAsync("/api/auth/gardener/register", new
        {
            Email = "gardener@test.com",
            Password = "Password123!",
            CompanyName = "Test Company"
        });
        
        registerResponse.Should().BeSuccessful();
        var registerResult = await registerResponse.Content.ReadFromJsonAsync<RegisterResponse>();
        
        // 2. Invite client
        _client.DefaultRequestHeaders.Authorization = 
            new AuthenticationHeaderValue("Bearer", registerResult.AccessToken);
            
        var inviteResponse = await _client.PostAsJsonAsync("/api/gardeners/invite", new
        {
            Email = "client@test.com"
        });
        
        inviteResponse.Should().BeSuccessful();
        
        // 3. Accept invitation
        // ... continue testing
    }
}
```

### Running Tests

```bash
# Run all tests
dotnet test

# Run specific test class
dotnet test --filter "FullyQualifiedName~CreateMaterialHandlerTests"

# Run with coverage
dotnet test --collect:"XPlat Code Coverage"

# Run in watch mode
dotnet watch test
```

---

## Database Migrations

### Creating a Migration

```bash
cd Garden.BuildingBlocks
dotnet ef migrations add MigrationName --startup-project ../Garden.Api
```

### Applying Migrations

```bash
cd Garden.Api
dotnet ef database update
```

### Rolling Back

```bash
# Roll back to specific migration
dotnet ef database update PreviousMigrationName

# Roll back all
dotnet ef database update 0
```

### Removing Last Migration

```bash
dotnet ef migrations remove --startup-project ../Garden.Api
```

### Generating SQL Script

```bash
dotnet ef migrations script --output migration.sql
```

---

## Debugging

### Debug in Visual Studio

1. Set `Garden.Api` as startup project
2. Press F5
3. Set breakpoints in handlers
4. Make request via Swagger or Postman

### Debug with VS Code

`.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": ".NET Core Launch (web)",
      "type": "coreclr",
      "request": "launch",
      "preLaunchTask": "build",
      "program": "${workspaceFolder}/Garden.Api/bin/Debug/net10.0/Garden.Api.dll",
      "args": [],
      "cwd": "${workspaceFolder}/Garden.Api",
      "stopAtEntry": false,
      "serverReadyAction": {
        "action": "openExternally",
        "pattern": "\\bNow listening on:\\s+(https?://\\S+)"
      },
      "env": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      }
    }
  ]
}
```

### Logging

View structured logs:

```csharp
_logger.LogInformation("Creating material {MaterialName} for gardener {GardenerId}",
    request.Name, gardenerId);
```

Logs appear in:
- Console
- Application Insights (production)

---

## Common Tasks

### Adding a New Module

1. Create project
```bash
dotnet new classlib -n Garden.Modules.NewModule
cd Garden.Modules.NewModule
dotnet add reference ../Garden.BuildingBlocks/Garden.BuildingBlocks.csproj
```

2. Create `ModuleExtensions.cs`
```csharp
public static class ModuleExtensions
{
    public static IServiceCollection AddNewModule(this IServiceCollection services)
    {
        // Register services
        return services;
    }
}
```

3. Register in `Program.cs`
```csharp
builder.Services.AddNewModule();
```

### Adding a New Entity

1. Add record class in `GardenDbContext.cs`
```csharp
public class NewEntityRecord
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

2. Add DbSet
```csharp
public DbSet<NewEntityRecord> NewEntities => Set<NewEntityRecord>();
```

3. Configure in `OnModelCreating`
```csharp
modelBuilder.Entity<NewEntityRecord>(entity =>
{
    entity.ToTable("NewEntities");
    entity.HasKey(x => x.Id);
    entity.Property(x => x.Name).HasMaxLength(256).IsRequired();
    entity.Property(x => x.CreatedAt).IsRequired();
});
```

4. Create migration
```bash
dotnet ef migrations add AddNewEntity --startup-project ../Garden.Api
```

### Adding an Event

1. Create event class in `Garden.BuildingBlocks/Events/`
```csharp
public class NewEvent
{
    public Guid Id { get; set; }
    public string Data { get; set; }
    public DateTime OccurredAt { get; set; }
}
```

2. Publish in handler
```csharp
await _eventBus.PublishAsync(new NewEvent { ... });
```

3. Create consumer
```csharp
public class NewEventConsumer : IConsumer<NewEvent>
{
    public async Task Consume(ConsumeContext<NewEvent> context)
    {
        // Handle event
    }
}
```

4. Register consumer
```csharp
builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<NewEventConsumer>();
});
```

---

## Best Practices

### DO

✅ Keep controllers thin - delegate to handlers
✅ Validate input using FluentValidation
✅ Use UTC for all timestamps
✅ Check authorization in handlers
✅ Return DTOs, not domain entities
✅ Use async/await consistently
✅ Write tests for business logic
✅ Log important operations
✅ Use meaningful variable names
✅ Follow existing patterns

### DON'T

❌ Put business logic in controllers
❌ Return entity records from API
❌ Use local time for timestamps
❌ Skip authorization checks
❌ Create duplicate services
❌ Mix Task and Job terminology
❌ Skip error handling
❌ Commit without running tests
❌ Create new patterns without discussion
