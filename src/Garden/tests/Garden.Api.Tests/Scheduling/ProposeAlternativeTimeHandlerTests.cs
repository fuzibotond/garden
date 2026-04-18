using System;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Xunit;

using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Scheduling.Features.TaskScheduling;
using Garden.Api.Tests.TestHelpers;
using Garden.Modules.Identity;

namespace Garden.Api.Tests.Scheduling;

public class ProposeAlternativeTimeHandlerTests
{
    private static GardenDbContext CreateContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<GardenDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;

        return new GardenDbContext(options);
    }

    [Fact]
    public async Task Handle_Should_Propose_Alternative_Time()
    {
        var context = CreateContext(nameof(Handle_Should_Propose_Alternative_Time));
        var gardenerId = Guid.NewGuid();
        var clientId = Guid.NewGuid();
        var scheduleId = Guid.NewGuid();
        var taskId = Guid.NewGuid();
        var jobId = Guid.NewGuid();
        var taskTypeId = Guid.NewGuid();
        var proposedAt = DateTime.UtcNow.AddDays(2);

        context.Gardeners.Add(new GardenerRecord
        {
            Id = gardenerId,
            Email = "gardener@example.com",
            CompanyName = "My Gardens",
            PasswordHash = "hash",
            CreatedAtUtc = DateTime.UtcNow
        });

        context.Clients.Add(new ClientRecord
        {
            Id = clientId,
            Email = "client@example.com",
            Name = "Client",
            PasswordHash = "hash",
            CreatedAtUtc = DateTime.UtcNow
        });

        context.TaskTypes.Add(new TaskTypeRecord
        {
            Id = taskTypeId,
            Name = "Lawn Mowing",
            CreatedAtUtc = DateTime.UtcNow
        });

        context.Jobs.Add(new JobRecord
        {
            Id = jobId,
            ClientId = clientId,
            Name = "Spring Cleanup",
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        });

        context.Tasks.Add(new TaskRecord
        {
            Id = taskId,
            JobId = jobId,
            TaskTypeId = taskTypeId,
            Name = "Trim hedges",
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        });

        context.TaskScheduleRequests.Add(new TaskScheduleRequestRecord
        {
            Id = scheduleId,
            TaskId = taskId,
            GardenerId = gardenerId,
            ClientId = clientId,
            ScheduledAtUtc = DateTime.UtcNow.AddDays(1),
            Status = TaskScheduleStatus.Pending,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        });

        await context.SaveChangesAsync();

        var currentUser = new FakeCurrentUser
        {
            UserId = clientId,
            IsAuthenticated = true,
            Roles = new[] { "Client" }
        };

        var handler = new ProposeAlternativeTimeHandler(context, currentUser);
        var request = new ProposeAlternativeTimeRequest
        {
            ScheduleRequestId = scheduleId,
            ProposedAtUtc = proposedAt
        };

        var response = await handler.Handle(request);

        response.Should().NotBeNull();
        response.Status.Should().Be("ProposedAlternative");
        response.ProposedAtUtc.Should().Be(proposedAt);

        var updatedSchedule = await context.TaskScheduleRequests.FirstOrDefaultAsync(s => s.Id == scheduleId);
        updatedSchedule!.Status.Should().Be(TaskScheduleStatus.ProposedAlternative);
        updatedSchedule.ProposedAtUtc.Should().Be(proposedAt);
    }

    [Fact]
    public async Task Handle_Should_Fail_If_Proposed_Time_In_Past()
    {
        var context = CreateContext(nameof(Handle_Should_Fail_If_Proposed_Time_In_Past));
        var clientId = Guid.NewGuid();

        context.Clients.Add(new ClientRecord
        {
            Id = clientId,
            Email = "client@example.com",
            Name = "Client",
            PasswordHash = "hash",
            CreatedAtUtc = DateTime.UtcNow
        });

        await context.SaveChangesAsync();

        var currentUser = new FakeCurrentUser
        {
            UserId = clientId,
            IsAuthenticated = true,
            Roles = new[] { "Client" }
        };

        var handler = new ProposeAlternativeTimeHandler(context, currentUser);
        var request = new ProposeAlternativeTimeRequest
        {
            ScheduleRequestId = Guid.NewGuid(),
            ProposedAtUtc = DateTime.UtcNow.AddHours(-1)
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() => handler.Handle(request));
    }
}
