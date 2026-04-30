using FluentAssertions;
using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Identity;
using Garden.Modules.Identity.Features.PushNotifications;
using Garden.Api.Tests.TestHelpers;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Garden.Api.Tests.PushNotifications;

public class RegisterPushTokenHandlerTests : IDisposable
{
    private readonly GardenDbContext _dbContext;
    private readonly RegisterPushTokenHandler _handler;
    private readonly FakeCurrentUser _currentUser;

    public RegisterPushTokenHandlerTests()
    {
        var options = new DbContextOptionsBuilder<GardenDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _dbContext = new GardenDbContext(options);
        _currentUser = new FakeCurrentUser();
        _handler = new RegisterPushTokenHandler(_dbContext, _currentUser);
    }

    [Fact]
    public async Task HandleAsync_GardenerRegistersToken_ShouldSaveToken()
    {
        // Arrange
        var gardenerId = Guid.NewGuid();
        var expoPushToken = "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]";
        
        var gardener = new GardenerRecord
        {
            Id = gardenerId,
            Email = "gardener@example.com",
            CompanyName = "Test Company",
            PasswordHash = "hash",
            CreatedAtUtc = DateTime.UtcNow
        };
        _dbContext.Gardeners.Add(gardener);
        await _dbContext.SaveChangesAsync();

        _currentUser.UserId = gardenerId;
        _currentUser.Roles = new[] { Roles.Gardener };
        _currentUser.IsAuthenticated = true;

        var request = new RegisterPushTokenRequest
        {
            ExpoPushToken = expoPushToken
        };

        // Act
        await _handler.HandleAsync(request);

        // Assert
        var updatedGardener = await _dbContext.Gardeners.FindAsync(gardenerId);
        updatedGardener.Should().NotBeNull();
        updatedGardener!.ExpoPushToken.Should().Be(expoPushToken);
    }

    [Fact]
    public async Task HandleAsync_ClientRegistersToken_ShouldSaveToken()
    {
        // Arrange
        var clientId = Guid.NewGuid();
        var expoPushToken = "ExponentPushToken[yyyyyyyyyyyyyyyyyyyyyy]";
        
        var client = new ClientRecord
        {
            Id = clientId,
            Email = "client@example.com",
            Name = "Test Client",
            PasswordHash = "hash",
            CreatedAtUtc = DateTime.UtcNow
        };
        _dbContext.Clients.Add(client);
        await _dbContext.SaveChangesAsync();

        _currentUser.UserId = clientId;
        _currentUser.Roles = new[] { Roles.Client };
        _currentUser.IsAuthenticated = true;

        var request = new RegisterPushTokenRequest
        {
            ExpoPushToken = expoPushToken
        };

        // Act
        await _handler.HandleAsync(request);

        // Assert
        var updatedClient = await _dbContext.Clients.FindAsync(clientId);
        updatedClient.Should().NotBeNull();
        updatedClient!.ExpoPushToken.Should().Be(expoPushToken);
    }

    [Fact]
    public async Task HandleAsync_UpdateExistingToken_ShouldReplaceToken()
    {
        // Arrange
        var gardenerId = Guid.NewGuid();
        var oldToken = "ExponentPushToken[oldtoken]";
        var newToken = "ExponentPushToken[newtoken]";
        
        var gardener = new GardenerRecord
        {
            Id = gardenerId,
            Email = "gardener@example.com",
            CompanyName = "Test Company",
            PasswordHash = "hash",
            CreatedAtUtc = DateTime.UtcNow,
            ExpoPushToken = oldToken
        };
        _dbContext.Gardeners.Add(gardener);
        await _dbContext.SaveChangesAsync();

        _currentUser.UserId = gardenerId;
        _currentUser.Roles = new[] { Roles.Gardener };
        _currentUser.IsAuthenticated = true;

        var request = new RegisterPushTokenRequest
        {
            ExpoPushToken = newToken
        };

        // Act
        await _handler.HandleAsync(request);

        // Assert
        var updatedGardener = await _dbContext.Gardeners.FindAsync(gardenerId);
        updatedGardener.Should().NotBeNull();
        updatedGardener!.ExpoPushToken.Should().Be(newToken);
        updatedGardener.ExpoPushToken.Should().NotBe(oldToken);
    }

    [Fact]
    public async Task HandleAsync_UnauthenticatedUser_ShouldThrowUnauthorizedAccessException()
    {
        // Arrange
        _currentUser.IsAuthenticated = false;
        _currentUser.UserId = null;

        var request = new RegisterPushTokenRequest
        {
            ExpoPushToken = "ExponentPushToken[test]"
        };

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            async () => await _handler.HandleAsync(request));
    }

    [Fact]
    public async Task HandleAsync_GardenerNotFound_ShouldThrowInvalidOperationException()
    {
        // Arrange
        var nonExistentGardenerId = Guid.NewGuid();
        
        _currentUser.UserId = nonExistentGardenerId;
        _currentUser.Roles = new[] { Roles.Gardener };
        _currentUser.IsAuthenticated = true;

        var request = new RegisterPushTokenRequest
        {
            ExpoPushToken = "ExponentPushToken[test]"
        };

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            async () => await _handler.HandleAsync(request));
    }

    [Fact]
    public async Task HandleAsync_ClientNotFound_ShouldThrowInvalidOperationException()
    {
        // Arrange
        var nonExistentClientId = Guid.NewGuid();
        
        _currentUser.UserId = nonExistentClientId;
        _currentUser.Roles = new[] { Roles.Client };
        _currentUser.IsAuthenticated = true;

        var request = new RegisterPushTokenRequest
        {
            ExpoPushToken = "ExponentPushToken[test]"
        };

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            async () => await _handler.HandleAsync(request));
    }

    [Fact]
    public async Task HandleAsync_InvalidRole_ShouldThrowUnauthorizedAccessException()
    {
        // Arrange
        _currentUser.UserId = Guid.NewGuid();
        _currentUser.Roles = new[] { "InvalidRole" };
        _currentUser.IsAuthenticated = true;

        var request = new RegisterPushTokenRequest
        {
            ExpoPushToken = "ExponentPushToken[test]"
        };

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            async () => await _handler.HandleAsync(request));
    }

    public void Dispose()
    {
        _dbContext.Database.EnsureDeleted();
        _dbContext.Dispose();
    }
}
