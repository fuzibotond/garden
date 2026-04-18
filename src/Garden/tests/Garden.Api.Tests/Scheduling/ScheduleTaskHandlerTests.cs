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

public class ScheduleTaskHandlerTests
{
    private static GardenDbContext CreateContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<GardenDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;

        return new GardenDbContext(options);
    }

    [Fact]
    public async Task Handle_Should_Create_Schedule_Request()
    {
        var context = CreateContext(nameof(Handle_Should_Create_Schedule_Request));
        var gardenerId = Guid.NewGuid();
        var clientId = Guid.NewGuid();
        var jobId = Guid.NewGuid();
        var taskId = Guid.NewGuid();
        var taskTypeId = Guid.NewGuid();
        var scheduledAt = DateTime.UtcNow.AddDays(1);

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

        context.GardenerClients.Add(new GardenerClientRecord
        {
            Id = Guid.NewGuid(),
            GardenerId = gardenerId,
            ClientId = clientId
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

        await context.SaveChangesAsync();

        var currentUser = new FakeCurrentUser
        {
            UserId = gardenerId,
            IsAuthenticated = true,
            Roles = new[] { "Gardener" }
        };

        var handler = new ScheduleTaskHandler(context, currentUser);
        var request = new ScheduleTaskRequest
        {
            TaskId = taskId,
            ClientId = clientId,
            ScheduledAtUtc = scheduledAt
        };

        var response = await handler.Handle(request);

        response.Should().NotBeNull();
        response.ScheduleRequestId.Should().NotBe(Guid.Empty);
        response.TaskId.Should().Be(taskId);
        response.ClientId.Should().Be(clientId);
        response.ScheduledAtUtc.Should().Be(scheduledAt);
        response.Status.Should().Be("Pending");

        var savedSchedule = await context.TaskScheduleRequests.FirstOrDefaultAsync(s => s.Id == response.ScheduleRequestId);
        savedSchedule.Should().NotBeNull();
        savedSchedule!.Status.Should().Be(TaskScheduleStatus.Pending);
    }

    [Fact]
    public async Task Handle_Should_Fail_If_User_Not_Authenticated()
    {
        var context = CreateContext(nameof(Handle_Should_Fail_If_User_Not_Authenticated));
        var currentUser = new FakeCurrentUser
        {
            UserId = null,
            IsAuthenticated = false
        };

        var handler = new ScheduleTaskHandler(context, currentUser);
        var request = new ScheduleTaskRequest
        {
            TaskId = Guid.NewGuid(),
            ClientId = Guid.NewGuid(),
            ScheduledAtUtc = DateTime.UtcNow.AddDays(1)
        };

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => handler.Handle(request));
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

        var handler = new ScheduleTaskHandler(context, currentUser);
        var request = new ScheduleTaskRequest
        {
            TaskId = Guid.NewGuid(),
            ClientId = Guid.NewGuid(),
            ScheduledAtUtc = DateTime.UtcNow.AddDays(1)
        };

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => handler.Handle(request));
    }

    [Fact]
    public async Task Handle_Should_Fail_If_Scheduled_Time_In_Past()
    {
        var context = CreateContext(nameof(Handle_Should_Fail_If_Scheduled_Time_In_Past));
        var gardenerId = Guid.NewGuid();
        var clientId = Guid.NewGuid();

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

        context.GardenerClients.Add(new GardenerClientRecord
        {
            Id = Guid.NewGuid(),
            GardenerId = gardenerId,
            ClientId = clientId
        });

        await context.SaveChangesAsync();

        var currentUser = new FakeCurrentUser
        {
            UserId = gardenerId,
            IsAuthenticated = true,
            Roles = new[] { "Gardener" }
        };

        var handler = new ScheduleTaskHandler(context, currentUser);
        var request = new ScheduleTaskRequest
        {
            TaskId = Guid.NewGuid(),
            ClientId = clientId,
            ScheduledAtUtc = DateTime.UtcNow.AddHours(-1)
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() => handler.Handle(request));
    }

    [Fact]
    public async Task Handle_Should_Fail_If_Task_Not_Found()
    {
        var context = CreateContext(nameof(Handle_Should_Fail_If_Task_Not_Found));
        var gardenerId = Guid.NewGuid();
        var clientId = Guid.NewGuid();

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

        context.GardenerClients.Add(new GardenerClientRecord
        {
            Id = Guid.NewGuid(),
            GardenerId = gardenerId,
            ClientId = clientId
        });

        await context.SaveChangesAsync();

        var currentUser = new FakeCurrentUser
        {
            UserId = gardenerId,
            IsAuthenticated = true,
            Roles = new[] { "Gardener" }
        };

        var handler = new ScheduleTaskHandler(context, currentUser);
        var request = new ScheduleTaskRequest
        {
            TaskId = Guid.NewGuid(),
            ClientId = clientId,
            ScheduledAtUtc = DateTime.UtcNow.AddDays(1)
        };

        await Assert.ThrowsAsync<KeyNotFoundException>(() => handler.Handle(request));
    }
}
