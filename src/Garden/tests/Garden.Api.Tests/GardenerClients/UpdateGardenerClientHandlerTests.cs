using System;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Xunit;

using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Api.Features.GardenerClients;
using Garden.Api.Tests.TestHelpers;
using Garden.Modules.Clients;

namespace Garden.Api.Tests.GardenerClients;

/// <summary>
/// Unit tests for UpdateGardenerClientHandler
/// Tests authorization and update logic for gardener-client relationship
/// </summary>
public class UpdateGardenerClientHandlerTests
{
    private static GardenDbContext CreateContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<GardenDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;

        return new GardenDbContext(options);
    }

    [Fact]
    public async Task Handle_Should_Update_Client_When_Gardener_Has_Job_Access()
    {
        // Arrange
        var context = CreateContext(nameof(Handle_Should_Update_Client_When_Gardener_Has_Job_Access));
        var gardenerId = Guid.NewGuid();
        var clientId = Guid.NewGuid();
        var jobId = Guid.NewGuid();

        var client = new ClientRecord
        {
            Id = clientId,
            Email = "oldclient@example.com",
            Name = "Old Name",
            PasswordHash = "hash",
            CreatedAtUtc = DateTime.UtcNow
        };

        var job = new JobRecord
        {
            Id = jobId,
            ClientId = clientId,
            Name = "Test Job",
            CreatedAtUtc = DateTime.UtcNow
        };

        var jobGardener = new JobGardenerRecord
        {
            JobId = jobId,
            GardenerId = gardenerId,
            AddedAtUtc = DateTime.UtcNow
        };

        context.Clients.Add(client);
        context.Jobs.Add(job);
        context.JobGardeners.Add(jobGardener);
        await context.SaveChangesAsync();

        var currentUser = new FakeCurrentUser
        {
            IsAuthenticated = true,
            UserId = gardenerId,
            Roles = new[] { "Gardener" }
        };

        var handler = new UpdateGardenerClientHandler(context, currentUser);
        var request = new UpdateGardenerClientRequest("New Name", "newclient@example.com");

        // Act
        await handler.Handle(clientId, request);

        // Assert
        var updated = await context.Clients.FirstOrDefaultAsync(c => c.Id == clientId);
        updated.Should().NotBeNull();
        updated!.Name.Should().Be("New Name");
        updated.Email.Should().Be("newclient@example.com");
    }

    [Fact]
    public async Task Handle_Should_Update_Client_When_Gardener_Has_Invitation_Access()
    {
        // Arrange
        var context = CreateContext(nameof(Handle_Should_Update_Client_When_Gardener_Has_Invitation_Access));
        var gardenerId = Guid.NewGuid();
        var clientId = Guid.NewGuid();

        var client = new ClientRecord
        {
            Id = clientId,
            Email = "client@example.com",
            Name = "Old Name",
            PasswordHash = "hash",
            CreatedAtUtc = DateTime.UtcNow
        };

        var invitation = new InvitationRecord
        {
            Id = Guid.NewGuid(),
            GardenerId = gardenerId,
            Email = "client@example.com",
            Status = InvitationStatus.Accepted,
            CreatedAtUtc = DateTime.UtcNow,
            ExpiresAtUtc = DateTime.UtcNow.AddDays(7)
        };

        context.Clients.Add(client);
        context.Invitations.Add(invitation);
        await context.SaveChangesAsync();

        var currentUser = new FakeCurrentUser
        {
            IsAuthenticated = true,
            UserId = gardenerId,
            Roles = new[] { "Gardener" }
        };

        var handler = new UpdateGardenerClientHandler(context, currentUser);
        var request = new UpdateGardenerClientRequest("Updated Name", null);

        // Act
        await handler.Handle(clientId, request);

        // Assert
        var updated = await context.Clients.FirstOrDefaultAsync(c => c.Id == clientId);
        updated.Should().NotBeNull();
        updated!.Name.Should().Be("Updated Name");
        updated.Email.Should().Be("client@example.com"); // Email unchanged
    }

    [Fact]
    public async Task Handle_Should_Only_Update_FullName_When_Email_Is_Null()
    {
        // Arrange
        var context = CreateContext(nameof(Handle_Should_Only_Update_FullName_When_Email_Is_Null));
        var gardenerId = Guid.NewGuid();
        var clientId = Guid.NewGuid();
        var jobId = Guid.NewGuid();

        var client = new ClientRecord
        {
            Id = clientId,
            Email = "original@example.com",
            Name = "Original Name",
            PasswordHash = "hash",
            CreatedAtUtc = DateTime.UtcNow
        };

        var job = new JobRecord
        {
            Id = jobId,
            ClientId = clientId,
            Name = "Test Job",
            CreatedAtUtc = DateTime.UtcNow
        };

        var jobGardener = new JobGardenerRecord
        {
            JobId = jobId,
            GardenerId = gardenerId,
            AddedAtUtc = DateTime.UtcNow
        };

        context.Clients.Add(client);
        context.Jobs.Add(job);
        context.JobGardeners.Add(jobGardener);
        await context.SaveChangesAsync();

        var currentUser = new FakeCurrentUser
        {
            IsAuthenticated = true,
            UserId = gardenerId,
            Roles = new[] { "Gardener" }
        };

        var handler = new UpdateGardenerClientHandler(context, currentUser);
        var request = new UpdateGardenerClientRequest("Just Name Update", null);

        // Act
        await handler.Handle(clientId, request);

        // Assert
        var updated = await context.Clients.FirstOrDefaultAsync(c => c.Id == clientId);
        updated.Should().NotBeNull();
        updated!.Name.Should().Be("Just Name Update");
        updated.Email.Should().Be("original@example.com"); // Email unchanged
    }

    [Fact]
    public async Task Handle_Should_Throw_UnauthorizedAccessException_When_User_Not_Authenticated()
    {
        // Arrange
        var context = CreateContext(nameof(Handle_Should_Throw_UnauthorizedAccessException_When_User_Not_Authenticated));
        var clientId = Guid.NewGuid();

        var currentUser = new FakeCurrentUser
        {
            IsAuthenticated = false
        };

        var handler = new UpdateGardenerClientHandler(context, currentUser);
        var request = new UpdateGardenerClientRequest("New Name", "new@example.com");

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(async () =>
            await handler.Handle(clientId, request));
    }

    [Fact]
    public async Task Handle_Should_Throw_InvalidOperationException_When_Client_Not_Found()
    {
        // Arrange
        var context = CreateContext(nameof(Handle_Should_Throw_InvalidOperationException_When_Client_Not_Found));
        var gardenerId = Guid.NewGuid();
        var nonExistentClientId = Guid.NewGuid();

        var currentUser = new FakeCurrentUser
        {
            IsAuthenticated = true,
            UserId = gardenerId,
            Roles = new[] { "Gardener" }
        };

        var handler = new UpdateGardenerClientHandler(context, currentUser);
        var request = new UpdateGardenerClientRequest("New Name", "new@example.com");

        // Act & Assert
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(async () =>
            await handler.Handle(nonExistentClientId, request));

        exception.Message.Should().Contain("not found");
    }

    [Fact]
    public async Task Handle_Should_Throw_UnauthorizedAccessException_When_Gardener_Has_No_Access()
    {
        // Arrange
        var context = CreateContext(nameof(Handle_Should_Throw_UnauthorizedAccessException_When_Gardener_Has_No_Access));
        var gardenerId = Guid.NewGuid();
        var otherGardenerId = Guid.NewGuid();
        var clientId = Guid.NewGuid();

        var client = new ClientRecord
        {
            Id = clientId,
            Email = "client@example.com",
            Name = "Client Name",
            PasswordHash = "hash",
            CreatedAtUtc = DateTime.UtcNow
        };

        // Create job with different gardener
        var jobId = Guid.NewGuid();
        var job = new JobRecord
        {
            Id = jobId,
            ClientId = clientId,
            Name = "Test Job",
            CreatedAtUtc = DateTime.UtcNow
        };

        var jobGardener = new JobGardenerRecord
        {
            JobId = jobId,
            GardenerId = otherGardenerId, // Different gardener
            AddedAtUtc = DateTime.UtcNow
        };

        context.Clients.Add(client);
        context.Jobs.Add(job);
        context.JobGardeners.Add(jobGardener);
        await context.SaveChangesAsync();

        var currentUser = new FakeCurrentUser
        {
            IsAuthenticated = true,
            UserId = gardenerId, // Current user doesn't have access
            Roles = new[] { "Gardener" }
        };

        var handler = new UpdateGardenerClientHandler(context, currentUser);
        var request = new UpdateGardenerClientRequest("New Name", "new@example.com");

        // Act & Assert
        var exception = await Assert.ThrowsAsync<UnauthorizedAccessException>(async () =>
            await handler.Handle(clientId, request));

        exception.Message.Should().Contain("do not have access");
    }

    [Fact]
    public async Task Handle_Should_Throw_InvalidOperationException_When_Email_Already_Exists()
    {
        // Arrange
        var context = CreateContext(nameof(Handle_Should_Throw_InvalidOperationException_When_Email_Already_Exists));
        var gardenerId = Guid.NewGuid();
        var clientId = Guid.NewGuid();
        var otherClientId = Guid.NewGuid();
        var jobId = Guid.NewGuid();

        var client = new ClientRecord
        {
            Id = clientId,
            Email = "client@example.com",
            Name = "Client Name",
            PasswordHash = "hash",
            CreatedAtUtc = DateTime.UtcNow
        };

        var otherClient = new ClientRecord
        {
            Id = otherClientId,
            Email = "existing@example.com",
            Name = "Other Client",
            PasswordHash = "hash",
            CreatedAtUtc = DateTime.UtcNow
        };

        var job = new JobRecord
        {
            Id = jobId,
            ClientId = clientId,
            Name = "Test Job",
            CreatedAtUtc = DateTime.UtcNow
        };

        var jobGardener = new JobGardenerRecord
        {
            JobId = jobId,
            GardenerId = gardenerId,
            AddedAtUtc = DateTime.UtcNow
        };

        context.Clients.AddRange(client, otherClient);
        context.Jobs.Add(job);
        context.JobGardeners.Add(jobGardener);
        await context.SaveChangesAsync();

        var currentUser = new FakeCurrentUser
        {
            IsAuthenticated = true,
            UserId = gardenerId,
            Roles = new[] { "Gardener" }
        };

        var handler = new UpdateGardenerClientHandler(context, currentUser);
        var request = new UpdateGardenerClientRequest("New Name", "existing@example.com");

        // Act & Assert
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(async () =>
            await handler.Handle(clientId, request));

        exception.Message.Should().Contain("already exists");
    }

    [Fact]
    public async Task Handle_Should_Normalize_Email_To_Lowercase()
    {
        // Arrange
        var context = CreateContext(nameof(Handle_Should_Normalize_Email_To_Lowercase));
        var gardenerId = Guid.NewGuid();
        var clientId = Guid.NewGuid();
        var jobId = Guid.NewGuid();

        var client = new ClientRecord
        {
            Id = clientId,
            Email = "old@example.com",
            Name = "Client Name",
            PasswordHash = "hash",
            CreatedAtUtc = DateTime.UtcNow
        };

        var job = new JobRecord
        {
            Id = jobId,
            ClientId = clientId,
            Name = "Test Job",
            CreatedAtUtc = DateTime.UtcNow
        };

        var jobGardener = new JobGardenerRecord
        {
            JobId = jobId,
            GardenerId = gardenerId,
            AddedAtUtc = DateTime.UtcNow
        };

        context.Clients.Add(client);
        context.Jobs.Add(job);
        context.JobGardeners.Add(jobGardener);
        await context.SaveChangesAsync();

        var currentUser = new FakeCurrentUser
        {
            IsAuthenticated = true,
            UserId = gardenerId,
            Roles = new[] { "Gardener" }
        };

        var handler = new UpdateGardenerClientHandler(context, currentUser);
        var request = new UpdateGardenerClientRequest("Name", "NewEmail@EXAMPLE.COM");

        // Act
        await handler.Handle(clientId, request);

        // Assert
        var updated = await context.Clients.FirstOrDefaultAsync(c => c.Id == clientId);
        updated.Should().NotBeNull();
        updated!.Email.Should().Be("newemail@example.com");
    }

    [Fact]
    public async Task Handle_Should_Trim_Whitespace_From_FullName()
    {
        // Arrange
        var context = CreateContext(nameof(Handle_Should_Trim_Whitespace_From_FullName));
        var gardenerId = Guid.NewGuid();
        var clientId = Guid.NewGuid();
        var jobId = Guid.NewGuid();

        var client = new ClientRecord
        {
            Id = clientId,
            Email = "client@example.com",
            Name = "Old Name",
            PasswordHash = "hash",
            CreatedAtUtc = DateTime.UtcNow
        };

        var job = new JobRecord
        {
            Id = jobId,
            ClientId = clientId,
            Name = "Test Job",
            CreatedAtUtc = DateTime.UtcNow
        };

        var jobGardener = new JobGardenerRecord
        {
            JobId = jobId,
            GardenerId = gardenerId,
            AddedAtUtc = DateTime.UtcNow
        };

        context.Clients.Add(client);
        context.Jobs.Add(job);
        context.JobGardeners.Add(jobGardener);
        await context.SaveChangesAsync();

        var currentUser = new FakeCurrentUser
        {
            IsAuthenticated = true,
            UserId = gardenerId,
            Roles = new[] { "Gardener" }
        };

        var handler = new UpdateGardenerClientHandler(context, currentUser);
        var request = new UpdateGardenerClientRequest("  Trimmed Name  ", null);

        // Act
        await handler.Handle(clientId, request);

        // Assert
        var updated = await context.Clients.FirstOrDefaultAsync(c => c.Id == clientId);
        updated.Should().NotBeNull();
        updated!.Name.Should().Be("Trimmed Name");
    }

    [Fact]
    public async Task Handle_Should_Allow_Same_Email_For_Same_Client()
    {
        // Arrange
        var context = CreateContext(nameof(Handle_Should_Allow_Same_Email_For_Same_Client));
        var gardenerId = Guid.NewGuid();
        var clientId = Guid.NewGuid();
        var jobId = Guid.NewGuid();

        var client = new ClientRecord
        {
            Id = clientId,
            Email = "client@example.com",
            Name = "Old Name",
            PasswordHash = "hash",
            CreatedAtUtc = DateTime.UtcNow
        };

        var job = new JobRecord
        {
            Id = jobId,
            ClientId = clientId,
            Name = "Test Job",
            CreatedAtUtc = DateTime.UtcNow
        };

        var jobGardener = new JobGardenerRecord
        {
            JobId = jobId,
            GardenerId = gardenerId,
            AddedAtUtc = DateTime.UtcNow
        };

        context.Clients.Add(client);
        context.Jobs.Add(job);
        context.JobGardeners.Add(jobGardener);
        await context.SaveChangesAsync();

        var currentUser = new FakeCurrentUser
        {
            IsAuthenticated = true,
            UserId = gardenerId,
            Roles = new[] { "Gardener" }
        };

        var handler = new UpdateGardenerClientHandler(context, currentUser);
        // Same email, just updating name
        var request = new UpdateGardenerClientRequest("New Name", "client@example.com");

        // Act
        await handler.Handle(clientId, request);

        // Assert
        var updated = await context.Clients.FirstOrDefaultAsync(c => c.Id == clientId);
        updated.Should().NotBeNull();
        updated!.Name.Should().Be("New Name");
        updated.Email.Should().Be("client@example.com");
    }
}
