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

public class RescheduleTaskHandlerTests
{
    private static GardenDbContext CreateContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<GardenDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;

        return new GardenDbContext(options);
    }

    [Fact]
    public async Task Handle_Should_Reschedule_Task_After_Proposed_Alternative()
    {
        var context = CreateContext(nameof(Handle_Should_Reschedule_Task_After_Proposed_Alternative));
        var gardenerId = Guid.NewGuid();
        var clientId = Guid.NewGuid();
        var scheduleId = Guid.NewGuid();
        var taskId = Guid.NewGuid();
        var jobId = Guid.NewGuid();
        var taskTypeId = Guid.NewGuid();
        var rescheduledAt = DateTime.UtcNow.AddDays(3);

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
            ProposedAtUtc = DateTime.UtcNow.AddDays(2),
            Status = TaskScheduleStatus.ProposedAlternative,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        });

        await context.SaveChangesAsync();

        var currentUser = new FakeCurrentUser
        {
            UserId = gardenerId,
            IsAuthenticated = true,
            Roles = new[] { "Gardener" }
        };

        var handler = new RescheduleTaskHandler(context, currentUser);
        var request = new RescheduleTaskRequest
        {
            ScheduleRequestId = scheduleId,
            RescheduledAtUtc = rescheduledAt
        };

        var response = await handler.Handle(request);

        response.Should().NotBeNull();
        response.Status.Should().Be("Rescheduled");
        response.ScheduledAtUtc.Should().Be(rescheduledAt);

        var updatedSchedule = await context.TaskScheduleRequests.FirstOrDefaultAsync(s => s.Id == scheduleId);
        updatedSchedule!.Status.Should().Be(TaskScheduleStatus.Rescheduled);
        updatedSchedule.ScheduledAtUtc.Should().Be(rescheduledAt);
        updatedSchedule.ProposedAtUtc.Should().BeNull();
    }

    [Fact]
    public async Task Handle_Should_Fail_If_Not_Gardener()
    {
        var context = CreateContext(nameof(Handle_Should_Fail_If_Not_Gardener));
        var currentUser = new FakeCurrentUser
        {
            UserId = Guid.NewGuid(),
            IsAuthenticated = true,
            Roles = new[] { "Client" }
        };

        var handler = new RescheduleTaskHandler(context, currentUser);
        var request = new RescheduleTaskRequest
        {
            ScheduleRequestId = Guid.NewGuid(),
            RescheduledAtUtc = DateTime.UtcNow.AddDays(1)
        };

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => handler.Handle(request));
    }

    [Fact]
    public async Task Handle_Should_Fail_If_Rescheduled_Time_In_Past()
    {
        var context = CreateContext(nameof(Handle_Should_Fail_If_Rescheduled_Time_In_Past));
        var gardenerId = Guid.NewGuid();

        context.Gardeners.Add(new GardenerRecord
        {
            Id = gardenerId,
            Email = "gardener@example.com",
            CompanyName = "My Gardens",
            PasswordHash = "hash",
            CreatedAtUtc = DateTime.UtcNow
        });

        await context.SaveChangesAsync();

        var currentUser = new FakeCurrentUser
        {
            UserId = gardenerId,
            IsAuthenticated = true,
            Roles = new[] { "Gardener" }
        };

        var handler = new RescheduleTaskHandler(context, currentUser);
        var request = new RescheduleTaskRequest
        {
            ScheduleRequestId = Guid.NewGuid(),
            RescheduledAtUtc = DateTime.UtcNow.AddHours(-1)
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() => handler.Handle(request));
    }
}
