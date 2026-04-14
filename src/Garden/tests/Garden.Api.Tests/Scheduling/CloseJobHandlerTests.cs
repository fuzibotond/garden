using System;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Xunit;

using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Scheduling.Features.Jobs;
using Garden.Api.Tests.TestHelpers;

namespace Garden.Api.Tests.Scheduling;

public class CloseJobHandlerTests
{
    private static GardenDbContext CreateContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<GardenDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;

        return new GardenDbContext(options);
    }

    [Fact]
    public async Task Handle_Should_Close_Job_And_Generate_InvoiceNumber()
    {
        var context = CreateContext(nameof(Handle_Should_Close_Job_And_Generate_InvoiceNumber));
        var gardenerId = Guid.NewGuid();
        var jobId = Guid.NewGuid();

        context.Jobs.Add(new JobRecord
        {
            Id = jobId,
            ClientId = Guid.NewGuid(),
            Name = "Lawn Mowing",
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        });

        context.JobGardeners.Add(new JobGardenerRecord
        {
            Id = Guid.NewGuid(),
            JobId = jobId,
            GardenerId = gardenerId
        });

        context.Tasks.Add(new TaskRecord
        {
            Id = Guid.NewGuid(),
            JobId = jobId,
            TaskTypeId = Guid.NewGuid(),
            Name = "Task 1",
            FinishedAtUtc = DateTime.UtcNow, // Task is finished
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        });

        await context.SaveChangesAsync();

        var currentUser = new FakeCurrentUser { IsAuthenticated = true, UserId = gardenerId };
        var handler = new CloseJobHandler(context, currentUser);

        // Act
        var response = await handler.Handle(jobId);

        // Assert
        response.Should().NotBeNull();
        response.JobId.Should().Be(jobId);
        response.InvoiceNumber.Should().StartWith($"INV-{response.ClosedAt:yyyyMM}-");

        var updatedJob = await context.Jobs.FindAsync(jobId);
        updatedJob!.ClosedAtUtc.Should().Be(response.ClosedAt);
        updatedJob.InvoiceNumber.Should().Be(response.InvoiceNumber);
    }

    [Fact]
    public async Task Handle_Should_Throw_When_Tasks_Are_Not_Finished()
    {
        var context = CreateContext(nameof(Handle_Should_Throw_When_Tasks_Are_Not_Finished));
        var gardenerId = Guid.NewGuid();
        var jobId = Guid.NewGuid();

        context.Jobs.Add(new JobRecord
        {
            Id = jobId,
            ClientId = Guid.NewGuid(),
            Name = "Lawn Mowing",
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        });

        context.JobGardeners.Add(new JobGardenerRecord
        {
            Id = Guid.NewGuid(),
            JobId = jobId,
            GardenerId = gardenerId
        });

        context.Tasks.Add(new TaskRecord
        {
            Id = Guid.NewGuid(),
            JobId = jobId,
            TaskTypeId = Guid.NewGuid(),
            Name = "Unfinished Task",
            FinishedAtUtc = null, // Task not finished
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        });

        await context.SaveChangesAsync();

        var currentUser = new FakeCurrentUser { IsAuthenticated = true, UserId = gardenerId };
        var handler = new CloseJobHandler(context, currentUser);

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() => handler.Handle(jobId));
    }

    [Fact]
    public async Task Handle_Should_Throw_When_Gardener_Not_Assigned()
    {
        var context = CreateContext(nameof(Handle_Should_Throw_When_Gardener_Not_Assigned));
        var unassignedGardenerId = Guid.NewGuid();
        var jobId = Guid.NewGuid();

        context.Jobs.Add(new JobRecord
        {
            Id = jobId,
            ClientId = Guid.NewGuid(),
            Name = "Job Name",
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        });

        await context.SaveChangesAsync();

        var currentUser = new FakeCurrentUser { IsAuthenticated = true, UserId = unassignedGardenerId };
        var handler = new CloseJobHandler(context, currentUser);

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => handler.Handle(jobId));
    }

    [Fact]
    public async Task Handle_Should_Throw_When_Job_Already_Closed()
    {
        var context = CreateContext(nameof(Handle_Should_Throw_When_Job_Already_Closed));
        var gardenerId = Guid.NewGuid();
        var jobId = Guid.NewGuid();

        context.Jobs.Add(new JobRecord
        {
            Id = jobId,
            ClientId = Guid.NewGuid(),
            Name = "Closed Job",
            ClosedAtUtc = DateTime.UtcNow, // Already closed
            InvoiceNumber = "INV-123",
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        });

        context.JobGardeners.Add(new JobGardenerRecord
        {
            Id = Guid.NewGuid(),
            JobId = jobId,
            GardenerId = gardenerId
        });

        await context.SaveChangesAsync();

        var currentUser = new FakeCurrentUser { IsAuthenticated = true, UserId = gardenerId };
        var handler = new CloseJobHandler(context, currentUser);

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() => handler.Handle(jobId));
    }
}
