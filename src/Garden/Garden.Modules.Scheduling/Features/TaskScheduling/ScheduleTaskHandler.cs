using Garden.BuildingBlocks.Events;
using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.BuildingBlocks.Services;
using Garden.Modules.Identity;
using Microsoft.EntityFrameworkCore;

namespace Garden.Modules.Scheduling.Features.TaskScheduling;

public class ScheduleTaskHandler
{
    private readonly GardenDbContext _dbContext;
    private readonly ICurrentUser _currentUser;
    private readonly IEventPublisher _eventPublisher;

    public ScheduleTaskHandler(GardenDbContext dbContext, ICurrentUser currentUser, IEventPublisher eventPublisher)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
        _eventPublisher = eventPublisher;
    }

    public async Task<ScheduleTaskResponse> Handle(ScheduleTaskRequest request)
    {
        if (!_currentUser.IsAuthenticated || _currentUser.UserId is null)
            throw new UnauthorizedAccessException("User is not authenticated.");

        if (!_currentUser.Roles.Contains("Gardener"))
            throw new UnauthorizedAccessException("Only gardeners can schedule tasks.");

        var gardenerId = _currentUser.UserId.Value;

        // Verify task exists
        var task = await _dbContext.Tasks.FirstOrDefaultAsync(t => t.Id == request.TaskId);
        if (task == null)
            throw new KeyNotFoundException("Task not found.");

        // Verify job exists and belongs to a client
        var job = await _dbContext.Jobs.FirstOrDefaultAsync(j => j.Id == task.JobId);
        if (job == null)
            throw new KeyNotFoundException("Job not found.");

        // Verify the client exists
        var client = await _dbContext.Clients.FirstOrDefaultAsync(c => c.Id == request.ClientId);
        if (client == null)
            throw new KeyNotFoundException("Client not found.");

        // Get gardener details for notification
        var gardener = await _dbContext.Gardeners.FirstOrDefaultAsync(g => g.Id == gardenerId);
        if (gardener == null)
            throw new KeyNotFoundException("Gardener not found.");

        // Verify gardener has relationship with this client
        var gardenerClientRelationship = await _dbContext.GardenerClients
            .FirstOrDefaultAsync(gc => gc.GardenerId == gardenerId && gc.ClientId == request.ClientId);
        if (gardenerClientRelationship == null)
            throw new UnauthorizedAccessException("Gardener does not have a relationship with this client.");

        // Check if a schedule request already exists for this task
        var existingSchedule = await _dbContext.TaskScheduleRequests
            .FirstOrDefaultAsync(sr => sr.TaskId == request.TaskId && sr.ClientId == request.ClientId);
        if (existingSchedule != null)
            throw new InvalidOperationException("A schedule request already exists for this task.");

        // Verify scheduled time is in the future
        if (request.ScheduledAtUtc <= DateTime.UtcNow)
            throw new InvalidOperationException("Scheduled time must be in the future.");

        var scheduleRequest = new TaskScheduleRequestRecord
        {
            Id = Guid.NewGuid(),
            TaskId = request.TaskId,
            GardenerId = gardenerId,
            ClientId = request.ClientId,
            ScheduledAtUtc = request.ScheduledAtUtc,
            Status = TaskScheduleStatus.Pending,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        _dbContext.TaskScheduleRequests.Add(scheduleRequest);
        await _dbContext.SaveChangesAsync();

        // Publish event for notification
        var @event = new ScheduleRequestCreatedEvent
        {
            ScheduleRequestId = scheduleRequest.Id,
            TaskId = task.Id,
            GardenerId = gardenerId,
            ClientId = client.Id,
            ClientEmail = client.Email,
            ClientName = client.Name,
            GardenerName = gardener.Name ?? gardener.CompanyName,
            TaskName = task.Name,
            ScheduledAtUtc = scheduleRequest.ScheduledAtUtc
        };

        await _eventPublisher.PublishAsync(@event);

        return new ScheduleTaskResponse
        {
            ScheduleRequestId = scheduleRequest.Id,
            TaskId = scheduleRequest.TaskId,
            ClientId = scheduleRequest.ClientId,
            ScheduledAtUtc = scheduleRequest.ScheduledAtUtc,
            Status = scheduleRequest.Status.ToString(),
            CreatedAtUtc = scheduleRequest.CreatedAtUtc
        };
    }
}
