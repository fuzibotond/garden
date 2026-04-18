using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Identity;
using Microsoft.EntityFrameworkCore;

namespace Garden.Modules.Scheduling.Features.TaskScheduling;

public class DeclineScheduleHandler
{
    private readonly GardenDbContext _dbContext;
    private readonly ICurrentUser _currentUser;

    public DeclineScheduleHandler(GardenDbContext dbContext, ICurrentUser currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task<TaskScheduleDto> Handle(Guid scheduleRequestId)
    {
        if (!_currentUser.IsAuthenticated || _currentUser.UserId is null)
            throw new UnauthorizedAccessException("User is not authenticated.");

        if (!_currentUser.Roles.Contains("Client"))
            throw new UnauthorizedAccessException("Only clients can decline schedules.");

        var clientId = _currentUser.UserId.Value;

        var schedule = await _dbContext.TaskScheduleRequests
            .FirstOrDefaultAsync(sr => sr.Id == scheduleRequestId);
        if (schedule == null)
            throw new KeyNotFoundException("Schedule request not found.");

        if (schedule.ClientId != clientId)
            throw new UnauthorizedAccessException("Client can only decline their own schedule requests.");

        if (schedule.Status != TaskScheduleStatus.Pending && schedule.Status != TaskScheduleStatus.Rescheduled)
            throw new InvalidOperationException($"Cannot decline a schedule with status {schedule.Status}.");

        schedule.Status = TaskScheduleStatus.Declined;
        schedule.DeclinedAtUtc = DateTime.UtcNow;
        schedule.UpdatedAtUtc = DateTime.UtcNow;

        _dbContext.TaskScheduleRequests.Update(schedule);
        await _dbContext.SaveChangesAsync();

        var task = await _dbContext.Tasks.FirstOrDefaultAsync(t => t.Id == schedule.TaskId);
        var job = await _dbContext.Jobs.FirstOrDefaultAsync(j => j.Id == task!.JobId);
        var gardener = await _dbContext.Gardeners.FirstOrDefaultAsync(g => g.Id == schedule.GardenerId);
        var client = await _dbContext.Clients.FirstOrDefaultAsync(c => c.Id == schedule.ClientId);

        return new TaskScheduleDto
        {
            ScheduleRequestId = schedule.Id,
            TaskId = schedule.TaskId,
            JobId = task!.JobId,
            TaskName = task.Name,
            GardenerId = schedule.GardenerId,
            GardenerName = gardener?.Name ?? gardener?.CompanyName ?? "Unknown",
            ClientId = schedule.ClientId,
            ClientName = client?.Name ?? "Unknown",
            ScheduledAtUtc = schedule.ScheduledAtUtc,
            ProposedAtUtc = schedule.ProposedAtUtc,
            ApprovedAtUtc = schedule.ApprovedAtUtc,
            DeclinedAtUtc = schedule.DeclinedAtUtc,
            Status = schedule.Status.ToString(),
            CreatedAtUtc = schedule.CreatedAtUtc
        };
    }
}
