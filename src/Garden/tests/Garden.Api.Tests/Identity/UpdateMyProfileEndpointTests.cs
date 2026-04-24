using System;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Xunit;

using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Identity.Features.Profile;
using Garden.Api.Tests.TestHelpers;

namespace Garden.Api.Tests.Identity;

/// <summary>
/// Tests for UpdateMyProfile endpoint path changes
/// Ensures the endpoint correctly handles PUT /auth/profile
/// </summary>
public class UpdateMyProfileEndpointTests
{
    private static GardenDbContext CreateContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<GardenDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;

        return new GardenDbContext(options);
    }

    [Fact]
    public async Task UpdateMyProfile_Should_Update_Client_Profile()
    {
        // Arrange
        var context = CreateContext(nameof(UpdateMyProfile_Should_Update_Client_Profile));
        var passwordHasher = new PasswordHasher<ClientRecord>();
        var clientId = Guid.NewGuid();

        var client = new ClientRecord
        {
            Id = clientId,
            Email = "client@example.com",
            Name = "Old Client Name",
            PasswordHash = passwordHasher.HashPassword(null!, "password"),
            CreatedAtUtc = DateTime.UtcNow
        };

        context.Clients.Add(client);
        await context.SaveChangesAsync();

        var currentUser = new FakeCurrentUser
        {
            IsAuthenticated = true,
            UserId = clientId,
            Roles = new[] { "Client" }
        };

        var handler = new UpdateMyProfileHandler(context, currentUser);
        var request = new UpdateMyProfileRequest("Updated Client Name");

        // Act
        var response = await handler.HandleAsync(request);

        // Assert
        response.Should().NotBeNull();
        response.Name.Should().Be("Updated Client Name");
        response.Email.Should().Be("client@example.com");

        var updated = await context.Clients.FirstOrDefaultAsync(c => c.Id == clientId);
        updated!.Name.Should().Be("Updated Client Name");
    }

    [Fact]
    public async Task UpdateMyProfile_Should_Update_Gardener_Profile()
    {
        // Arrange
        var context = CreateContext(nameof(UpdateMyProfile_Should_Update_Gardener_Profile));
        var passwordHasher = new PasswordHasher<GardenerRecord>();
        var gardenerId = Guid.NewGuid();

        var gardener = new GardenerRecord
        {
            Id = gardenerId,
            Email = "gardener@example.com",
            Name = "Old Gardener Name",
            CompanyName = "Old Company",
            PasswordHash = passwordHasher.HashPassword(null!, "password"),
            CreatedAtUtc = DateTime.UtcNow
        };

        context.Gardeners.Add(gardener);
        await context.SaveChangesAsync();

        var currentUser = new FakeCurrentUser
        {
            IsAuthenticated = true,
            UserId = gardenerId,
            Roles = new[] { "Gardener" }
        };

        var handler = new UpdateMyProfileHandler(context, currentUser);
        var request = new UpdateMyProfileRequest("Updated Gardener Name", "Updated Company");

        // Act
        var response = await handler.HandleAsync(request);

        // Assert
        response.Should().NotBeNull();
        response.Name.Should().Be("Updated Gardener Name");
        response.CompanyName.Should().Be("Updated Company");
        response.Email.Should().Be("gardener@example.com");

        var updated = await context.Gardeners.FirstOrDefaultAsync(g => g.Id == gardenerId);
        updated!.Name.Should().Be("Updated Gardener Name");
        updated.CompanyName.Should().Be("Updated Company");
    }

    [Fact]
    public async Task UpdateMyProfile_Should_Reject_Stale_Token_For_Client()
    {
        // Arrange
        var context = CreateContext(nameof(UpdateMyProfile_Should_Reject_Stale_Token_For_Client));
        var passwordHasher = new PasswordHasher<ClientRecord>();
        var clientId = Guid.NewGuid();
        var tokenIssuedAt = DateTime.UtcNow.AddHours(-2);
        var logoutTime = DateTime.UtcNow.AddHours(-1); // Logged out after token was issued

        var client = new ClientRecord
        {
            Id = clientId,
            Email = "client@example.com",
            Name = "Client Name",
            PasswordHash = passwordHasher.HashPassword(null!, "password"),
            CreatedAtUtc = DateTime.UtcNow.AddDays(-7),
            LastLogoutUtc = logoutTime
        };

        context.Clients.Add(client);
        await context.SaveChangesAsync();

        var currentUser = new FakeCurrentUser
        {
            IsAuthenticated = true,
            UserId = clientId,
            Roles = new[] { "Client" },
            IssuedAtUtc = tokenIssuedAt
        };

        var handler = new UpdateMyProfileHandler(context, currentUser);
        var request = new UpdateMyProfileRequest("Updated Name");

        // Act & Assert
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(async () =>
            await handler.HandleAsync(request));

        exception.Message.Should().Contain("not authenticated");
    }

    [Fact]
    public async Task UpdateMyProfile_Should_Reject_Stale_Token_For_Gardener()
    {
        // Arrange
        var context = CreateContext(nameof(UpdateMyProfile_Should_Reject_Stale_Token_For_Gardener));
        var passwordHasher = new PasswordHasher<GardenerRecord>();
        var gardenerId = Guid.NewGuid();
        var tokenIssuedAt = DateTime.UtcNow.AddHours(-2);
        var logoutTime = DateTime.UtcNow.AddHours(-1);

        var gardener = new GardenerRecord
        {
            Id = gardenerId,
            Email = "gardener@example.com",
            Name = "Gardener Name",
            CompanyName = "Company",
            PasswordHash = passwordHasher.HashPassword(null!, "password"),
            CreatedAtUtc = DateTime.UtcNow.AddDays(-7),
            LastLogoutUtc = logoutTime
        };

        context.Gardeners.Add(gardener);
        await context.SaveChangesAsync();

        var currentUser = new FakeCurrentUser
        {
            IsAuthenticated = true,
            UserId = gardenerId,
            Roles = new[] { "Gardener" },
            IssuedAtUtc = tokenIssuedAt
        };

        var handler = new UpdateMyProfileHandler(context, currentUser);
        var request = new UpdateMyProfileRequest("Updated Name", "Updated Company");

        // Act & Assert
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(async () =>
            await handler.HandleAsync(request));

        exception.Message.Should().Contain("not authenticated");
    }

    [Fact]
    public async Task UpdateMyProfile_Should_Accept_Token_Issued_After_Logout()
    {
        // Arrange
        var context = CreateContext(nameof(UpdateMyProfile_Should_Accept_Token_Issued_After_Logout));
        var passwordHasher = new PasswordHasher<ClientRecord>();
        var clientId = Guid.NewGuid();
        var logoutTime = DateTime.UtcNow.AddHours(-2);
        var tokenIssuedAt = DateTime.UtcNow.AddHours(-1); // Token issued after logout

        var client = new ClientRecord
        {
            Id = clientId,
            Email = "client@example.com",
            Name = "Client Name",
            PasswordHash = passwordHasher.HashPassword(null!, "password"),
            CreatedAtUtc = DateTime.UtcNow.AddDays(-7),
            LastLogoutUtc = logoutTime
        };

        context.Clients.Add(client);
        await context.SaveChangesAsync();

        var currentUser = new FakeCurrentUser
        {
            IsAuthenticated = true,
            UserId = clientId,
            Roles = new[] { "Client" },
            IssuedAtUtc = tokenIssuedAt
        };

        var handler = new UpdateMyProfileHandler(context, currentUser);
        var request = new UpdateMyProfileRequest("Updated Name");

        // Act
        var response = await handler.HandleAsync(request);

        // Assert
        response.Should().NotBeNull();
        response.Name.Should().Be("Updated Name");
    }

    [Fact]
    public async Task UpdateMyProfile_Should_Trim_Client_Name()
    {
        // Arrange
        var context = CreateContext(nameof(UpdateMyProfile_Should_Trim_Client_Name));
        var passwordHasher = new PasswordHasher<ClientRecord>();
        var clientId = Guid.NewGuid();

        var client = new ClientRecord
        {
            Id = clientId,
            Email = "client@example.com",
            Name = "Old Name",
            PasswordHash = passwordHasher.HashPassword(null!, "password"),
            CreatedAtUtc = DateTime.UtcNow
        };

        context.Clients.Add(client);
        await context.SaveChangesAsync();

        var currentUser = new FakeCurrentUser
        {
            IsAuthenticated = true,
            UserId = clientId,
            Roles = new[] { "Client" }
        };

        var handler = new UpdateMyProfileHandler(context, currentUser);
        var request = new UpdateMyProfileRequest("  Trimmed Name  ");

        // Act
        var response = await handler.HandleAsync(request);

        // Assert
        response.Name.Should().Be("Trimmed Name");
        
        var updated = await context.Clients.FirstOrDefaultAsync(c => c.Id == clientId);
        updated!.Name.Should().Be("Trimmed Name");
    }

    [Fact]
    public async Task UpdateMyProfile_Should_Trim_Gardener_Names()
    {
        // Arrange
        var context = CreateContext(nameof(UpdateMyProfile_Should_Trim_Gardener_Names));
        var passwordHasher = new PasswordHasher<GardenerRecord>();
        var gardenerId = Guid.NewGuid();

        var gardener = new GardenerRecord
        {
            Id = gardenerId,
            Email = "gardener@example.com",
            Name = "Old Name",
            CompanyName = "Old Company",
            PasswordHash = passwordHasher.HashPassword(null!, "password"),
            CreatedAtUtc = DateTime.UtcNow
        };

        context.Gardeners.Add(gardener);
        await context.SaveChangesAsync();

        var currentUser = new FakeCurrentUser
        {
            IsAuthenticated = true,
            UserId = gardenerId,
            Roles = new[] { "Gardener" }
        };

        var handler = new UpdateMyProfileHandler(context, currentUser);
        var request = new UpdateMyProfileRequest("  Trimmed Name  ", "  Trimmed Company  ");

        // Act
        var response = await handler.HandleAsync(request);

        // Assert
        response.Name.Should().Be("Trimmed Name");
        response.CompanyName.Should().Be("Trimmed Company");
        
        var updated = await context.Gardeners.FirstOrDefaultAsync(g => g.Id == gardenerId);
        updated!.Name.Should().Be("Trimmed Name");
        updated.CompanyName.Should().Be("Trimmed Company");
    }
}
