# Testing Guide

**Version**: 1.0  
**Last Updated**: 2026-04-24

---

## Table of Contents

1. [Testing Strategy](#testing-strategy)
2. [Test Structure](#test-structure)
3. [Unit Tests](#unit-tests)
4. [Integration Tests](#integration-tests)
5. [Test Helpers](#test-helpers)
6. [Running Tests](#running-tests)
7. [Code Coverage](#code-coverage)
8. [Best Practices](#best-practices)

---

## Testing Strategy

### Testing Pyramid

```
        ┌────────┐
        │   E2E  │  (Future: Postman/Playwright)
        └────────┘
      ┌────────────┐
      │Integration │  (API + Database)
      └────────────┘
    ┌────────────────┐
    │  Unit Tests    │  (Handlers, Services)
    └────────────────┘
```

### What to Test

✅ **High Priority:**
- Business logic in handlers
- Authorization rules
- Domain services
- Validation rules
- Integration flows (invitation, scheduling)

⚠️ **Medium Priority:**
- Edge cases
- Error handling
- Data mapping

❌ **Low Priority:**
- Controllers (thin layer)
- DTOs (data only)
- Infrastructure setup

---

## Test Structure

```
tests/Garden.Api.Tests/
├── Identity/
│   └── AuthenticationTests.cs
├── Clients/
│   └── InvitationServiceTests.cs
├── Materials/
│   └── MaterialsHandlerTests.cs
├── Scheduling/
│   └── ScheduleTaskHandlerTests.cs
├── PushNotifications/
│   ├── RegisterPushTokenHandlerTests.cs
│   └── ExpoPushNotificationServiceTests.cs
├── Integration/
│   └── InvitationFlowIntegrationTests.cs
├── Admin/
│   ├── AdminClientsControllerTests.cs
│   └── AdminRelationshipsControllerTests.cs
└── TestHelpers/
    ├── FakeCurrentUser.cs
    ├── FakeJwtTokenService.cs
    └── InMemoryDbContextFactory.cs
```

---

## Unit Tests

### Handler Test Template

```csharp
public class CreateMaterialHandlerTests
{
    private readonly GardenDbContext _context;
    private readonly FakeCurrentUser _currentUser;
    private readonly CreateMaterialHandler _handler;
    
    public CreateMaterialHandlerTests()
    {
        // Arrange: Setup in-memory database
        var options = new DbContextOptionsBuilder<GardenDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
            
        _context = new GardenDbContext(options);
        _currentUser = new FakeCurrentUser();
        _handler = new CreateMaterialHandler(_context, _currentUser);
    }
    
    [Fact]
    public async Task HandleAsync_ValidRequest_CreatesMaterial()
    {
        // Arrange
        var gardenerId = Guid.NewGuid();
        _currentUser.GardenerId = gardenerId;
        
        var request = new CreateMaterialRequest
        {
            Name = "Fertilizer Type A",
            AmountType = "kg",
            PricePerAmount = 15.50m
        };
        
        // Act
        var response = await _handler.HandleAsync(request);
        
        // Assert
        response.Should().NotBeNull();
        response.Id.Should().NotBeEmpty();
        response.Name.Should().Be("Fertilizer Type A");
        response.PricePerAmount.Should().Be(15.50m);
        
        // Verify database state
        var material = await _context.Materials.FindAsync(response.Id);
        material.Should().NotBeNull();
        material.GardenerId.Should().Be(gardenerId);
    }
    
    [Fact]
    public async Task HandleAsync_InvalidPrice_ThrowsException()
    {
        // Arrange
        var request = new CreateMaterialRequest
        {
            Name = "Test Material",
            AmountType = "kg",
            PricePerAmount = -5.00m  // Invalid negative price
        };
        
        // Act & Assert
        await Assert.ThrowsAsync<ValidationException>(() => 
            _handler.HandleAsync(request));
    }
}
```

### Service Test Template

```csharp
public class InvitationServiceTests
{
    private readonly GardenDbContext _context;
    private readonly InvitationService _service;
    
    [Fact]
    public async Task CreateInvitationAsync_ValidEmail_CreatesInvitation()
    {
        // Arrange
        var gardenerId = Guid.NewGuid();
        var email = "newclient@example.com";
        
        // Act
        var invitation = await _service.CreateInvitationAsync(gardenerId, email);
        
        // Assert
        invitation.Should().NotBeNull();
        invitation.Email.Should().Be(email);
        invitation.Status.Should().Be(InvitationStatus.Pending);
        invitation.ExpiresAtUtc.Should().BeAfter(DateTime.UtcNow);
    }
    
    [Fact]
    public async Task AcceptInvitationAsync_ValidToken_CreatesClientAndRelationship()
    {
        // Arrange
        var gardenerId = Guid.NewGuid();
        var email = "client@example.com";
        var invitation = await _service.CreateInvitationAsync(gardenerId, email);
        var token = "valid-token";  // Assume token generation
        
        // Act
        var clientId = await _service.AcceptInvitationAsync(token, "Client Name", "Password123!");
        
        // Assert
        clientId.Should().NotBeEmpty();
        
        // Verify relationship created
        var relationship = await _context.GardenerClients
            .FirstOrDefaultAsync(gc => gc.GardenerId == gardenerId && gc.ClientId == clientId);
        relationship.Should().NotBeNull();
        
        // Verify invitation accepted
        invitation.Status.Should().Be(InvitationStatus.Accepted);
        invitation.AcceptedAtUtc.Should().NotBeNull();
    }
}
```

---

## Integration Tests

### Full Flow Test Example

```csharp
public class InvitationFlowIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;
    private readonly WebApplicationFactory<Program> _factory;
    
    public InvitationFlowIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }
    
    [Fact]
    public async Task InvitationFlow_EndToEnd_Success()
    {
        // 1. Register gardener
        var registerResponse = await _client.PostAsJsonAsync("/api/auth/gardener/register", new
        {
            Email = $"gardener{Guid.NewGuid()}@test.com",
            Password = "Password123!",
            CompanyName = "Test Gardens"
        });
        
        registerResponse.Should().BeSuccessful();
        var registerResult = await registerResponse.Content.ReadFromJsonAsync<RegisterResponse>();
        
        // 2. Authenticate
        _client.DefaultRequestHeaders.Authorization = 
            new AuthenticationHeaderValue("Bearer", registerResult.AccessToken);
        
        // 3. Invite client
        var inviteResponse = await _client.PostAsJsonAsync("/api/gardeners/invite", new
        {
            Email = "newclient@test.com"
        });
        
        inviteResponse.Should().BeSuccessful();
        var inviteResult = await inviteResponse.Content.ReadFromJsonAsync<InviteResponse>();
        
        // 4. Verify invitation created
        inviteResult.InvitationId.Should().NotBeEmpty();
        inviteResult.Status.Should().Be("Pending");
        
        // 5. Accept invitation (simulate client)
        var acceptResponse = await _client.PostAsJsonAsync("/api/clients/accept-invitation", new
        {
            Token = inviteResult.Token,  // Assume token returned
            Email = "newclient@test.com",
            Password = "ClientPassword123!",
            Name = "New Client"
        });
        
        acceptResponse.Should().BeSuccessful();
        
        // 6. Verify client can login
        var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            Email = "newclient@test.com",
            Password = "ClientPassword123!",
            Role = "Client"
        });
        
        loginResponse.Should().BeSuccessful();
    }
}
```

### Authorization Test Example

```csharp
public class MaterialsAuthorizationTests
{
    [Fact]
    public async Task GetMaterial_OtherGardenerId_ReturnsForbidden()
    {
        // Arrange
        var gardener1 = Guid.NewGuid();
        var gardener2 = Guid.NewGuid();
        
        var material = new MaterialRecord
        {
            Id = Guid.NewGuid(),
            GardenerId = gardener1,
            Name = "Material 1",
            AmountType = "kg",
            PricePerAmount = 10.00m
        };
        
        _context.Materials.Add(material);
        await _context.SaveChangesAsync();
        
        // Act: Try to access as different gardener
        _currentUser.GardenerId = gardener2;
        
        // Assert
        var exception = await Assert.ThrowsAsync<ForbiddenException>(() =>
            _handler.GetMaterialAsync(material.Id));
            
        exception.Message.Should().Contain("permission");
    }
}
```

---

## Test Helpers

### FakeCurrentUser

```csharp
public class FakeCurrentUser : ICurrentUser
{
    public Guid? UserId { get; set; }
    public Guid? GardenerId { get; set; }
    public Guid? ClientId { get; set; }
    public string Role { get; set; } = "Gardener";
    public string Email { get; set; } = "test@example.com";
    
    public Guid GetUserId() => UserId ?? Guid.NewGuid();
    public Guid GetGardenerId() => GardenerId ?? throw new Exception("Not a gardener");
    public Guid GetClientId() => ClientId ?? throw new Exception("Not a client");
    public bool IsGardener() => Role == "Gardener";
    public bool IsClient() => Role == "Client";
    public bool IsAdmin() => Role == "Admin";
}
```

### FakeJwtTokenService

```csharp
public class FakeJwtTokenService : IJwtTokenService
{
    public string GenerateAccessToken(Guid userId, string email, string role)
    {
        return $"fake-token-{userId}";
    }
    
    public string GenerateRefreshToken()
    {
        return $"fake-refresh-{Guid.NewGuid()}";
    }
    
    public ClaimsPrincipal ValidateToken(string token)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Email, "test@example.com"),
            new Claim(ClaimTypes.Role, "Gardener")
        };
        
        return new ClaimsPrincipal(new ClaimsIdentity(claims));
    }
}
```

### InMemoryDbContextFactory

```csharp
public static class InMemoryDbContextFactory
{
    public static GardenDbContext Create()
    {
        var options = new DbContextOptionsBuilder<GardenDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
            
        return new GardenDbContext(options);
    }
    
    public static async Task<GardenDbContext> CreateWithDataAsync()
    {
        var context = Create();
        
        // Seed test data
        var gardener = new GardenerRecord
        {
            Id = Guid.NewGuid(),
            Email = "gardener@test.com",
            CompanyName = "Test Company",
            PasswordHash = "hashed",
            CreatedAtUtc = DateTime.UtcNow
        };
        
        context.Gardeners.Add(gardener);
        await context.SaveChangesAsync();
        
        return context;
    }
}
```

---

## Running Tests

### Command Line

```bash
# Run all tests
dotnet test

# Run specific test class
dotnet test --filter "FullyQualifiedName~CreateMaterialHandlerTests"

# Run specific test method
dotnet test --filter "FullyQualifiedName~CreateMaterialHandlerTests.HandleAsync_ValidRequest_CreatesMaterial"

# Run tests in specific namespace
dotnet test --filter "FullyQualifiedName~Garden.Api.Tests.Materials"

# Run with detailed output
dotnet test --logger "console;verbosity=detailed"

# Run in parallel
dotnet test --parallel

# Run with specific framework
dotnet test --framework net10.0
```

### Visual Studio

1. Open Test Explorer (Test → Test Explorer)
2. Run all tests: Click "Run All"
3. Run specific test: Right-click test → Run
4. Debug test: Right-click test → Debug

### VS Code

1. Install C# extension
2. Open Test Explorer in sidebar
3. Click play button next to test

### Watch Mode

```bash
# Auto-run tests on file changes
dotnet watch test
```

---

## Code Coverage

### Generate Coverage Report

```bash
# Install coverage tool
dotnet tool install --global dotnet-reportgenerator-globaltool

# Run tests with coverage
dotnet test --collect:"XPlat Code Coverage"

# Generate HTML report
reportgenerator \
  -reports:**/coverage.cobertura.xml \
  -targetdir:coveragereport \
  -reporttypes:Html

# Open report
start coveragereport/index.html
```

### Coverage Goals

| Component | Target Coverage |
|-----------|----------------|
| Handlers | 80%+ |
| Services | 80%+ |
| Validators | 90%+ |
| Controllers | 50%+ (thin layer) |
| DTOs | 0% (data only) |

---

## Best Practices

### DO

✅ **Test Names**
- Use descriptive names: `MethodName_Scenario_ExpectedResult`
- Example: `HandleAsync_InvalidPrice_ThrowsException`

✅ **Arrange-Act-Assert**
```csharp
// Arrange
var request = new CreateMaterialRequest { ... };

// Act
var response = await _handler.HandleAsync(request);

// Assert
response.Should().NotBeNull();
```

✅ **Test Isolation**
- Each test should be independent
- Use unique GUIDs for IDs
- Use in-memory database with unique name

✅ **Assert Behavior, Not Implementation**
```csharp
// Good
response.Name.Should().Be("Expected Name");

// Bad (testing internal implementation)
_handler._privatefield.Should().Be(5);
```

✅ **Use FluentAssertions**
```csharp
response.Should().NotBeNull();
response.Id.Should().NotBeEmpty();
response.Name.Should().Be("Test");
```

### DON'T

❌ Don't test third-party libraries
❌ Don't test framework behavior
❌ Don't write tests for DTOs/POCOs
❌ Don't share state between tests
❌ Don't test private methods directly
❌ Don't mock everything (prefer real dependencies when simple)

---

## Test Scenarios Checklist

### Authentication Tests
- ✅ Register gardener with valid data
- ✅ Register client with invitation
- ✅ Login with valid credentials
- ✅ Login with invalid credentials
- ✅ Refresh token flow
- ✅ Logout invalidates refresh token

### Authorization Tests
- ✅ Gardener can access own resources
- ✅ Gardener cannot access other gardener's resources
- ✅ Client can access own resources
- ✅ Admin can access all resources

### Business Logic Tests
- ✅ Create invitation sends email
- ✅ Accept invitation creates relationship
- ✅ Schedule request flow (propose → approve)
- ✅ Schedule request flow (propose → decline)
- ✅ Schedule request flow (propose → alternative)
- ✅ Material snapshot on task creation
- ✅ Job with multiple tasks

### Validation Tests
- ✅ Required fields validated
- ✅ Email format validated
- ✅ Password strength validated
- ✅ Numeric ranges validated
- ✅ Max length validated

---

## Change Log

### [1.0.0] - 2026-04-24
- Initial testing guide
- Unit test templates
- Integration test examples
- Test helpers documented
- Coverage strategy defined
- Best practices listed
