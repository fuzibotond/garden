using System;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Xunit;

using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Api.Controllers;
using Garden.Api.Features.GardenerClients;
using Garden.Api.Tests.TestHelpers;

namespace Garden.Api.Tests.GardenerClients;

/// <summary>
/// Integration tests for GardenerClientsController update endpoint
/// Tests the complete flow from controller to handler
/// </summary>
public class GardenerClientsControllerUpdateTests
{
    private static GardenDbContext CreateContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<GardenDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;

        return new GardenDbContext(options);
    }

    [Fact]
    public async Task Update_Should_Return_NoContent_When_Successful()
    {
        // Arrange
        var context = CreateContext(nameof(Update_Should_Return_NoContent_When_Successful));
        var gardenerId = Guid.NewGuid();
        var clientId = Guid.NewGuid();
        var jobId = Guid.NewGuid();

        var client = new ClientRecord
        {
            Id = clientId,
            Email = "client@example.com",
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
        var controller = new GardenerClientsController();
        var request = new UpdateGardenerClientRequest("Updated Name", "updated@example.com");

        // Act
        var result = await controller.Update(handler, clientId, request);

        // Assert
        result.Should().BeOfType<NoContentResult>();
        
        var updated = await context.Clients.FirstOrDefaultAsync(c => c.Id == clientId);
        updated!.Name.Should().Be("Updated Name");
        updated.Email.Should().Be("updated@example.com");
    }

    [Fact]
    public async Task Update_Should_Return_NotFound_When_Client_Does_Not_Exist()
    {
        // Arrange
        var context = CreateContext(nameof(Update_Should_Return_NotFound_When_Client_Does_Not_Exist));
        var gardenerId = Guid.NewGuid();
        var nonExistentClientId = Guid.NewGuid();

        var currentUser = new FakeCurrentUser
        {
            IsAuthenticated = true,
            UserId = gardenerId,
            Roles = new[] { "Gardener" }
        };

        var handler = new UpdateGardenerClientHandler(context, currentUser);
        var controller = new GardenerClientsController();
        var request = new UpdateGardenerClientRequest("Name", "email@example.com");

        // Act
        var result = await controller.Update(handler, nonExistentClientId, request);

        // Assert
        var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
        notFoundResult.Value.Should().NotBeNull();
        notFoundResult.Value.ToString().Should().Contain("not found");
    }

    [Fact]
    public async Task Update_Should_Return_Unauthorized_When_Gardener_Has_No_Access()
    {
        // Arrange
        var context = CreateContext(nameof(Update_Should_Return_Unauthorized_When_Gardener_Has_No_Access));
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

        // Job belongs to different gardener
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
            GardenerId = otherGardenerId,
            AddedAtUtc = DateTime.UtcNow
        };

        context.Clients.Add(client);
        context.Jobs.Add(job);
        context.JobGardeners.Add(jobGardener);
        await context.SaveChangesAsync();

        var currentUser = new FakeCurrentUser
        {
            IsAuthenticated = true,
            UserId = gardenerId, // Different gardener
            Roles = new[] { "Gardener" }
        };

        var handler = new UpdateGardenerClientHandler(context, currentUser);
        var controller = new GardenerClientsController();
        var request = new UpdateGardenerClientRequest("Name", "email@example.com");

        // Act
        var result = await controller.Update(handler, clientId, request);

        // Assert
        var unauthorizedResult = result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        unauthorizedResult.Value.Should().NotBeNull();
        unauthorizedResult.Value.ToString().Should().Contain("do not have access");
    }

    [Fact]
    public async Task Update_Should_Return_Conflict_When_Email_Already_Exists()
    {
        // Arrange
        var context = CreateContext(nameof(Update_Should_Return_Conflict_When_Email_Already_Exists));
        var gardenerId = Guid.NewGuid();
        var clientId = Guid.NewGuid();
        var otherClientId = Guid.NewGuid();

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
        var controller = new GardenerClientsController();
        var request = new UpdateGardenerClientRequest("Name", "existing@example.com");

        // Act
        var result = await controller.Update(handler, clientId, request);

        // Assert
        var conflictResult = result.Should().BeOfType<ConflictObjectResult>().Subject;
        conflictResult.Value.Should().NotBeNull();
        conflictResult.Value.ToString().Should().Contain("already exists");
    }
}
