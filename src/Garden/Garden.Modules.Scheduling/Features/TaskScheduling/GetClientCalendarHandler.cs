using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Identity;
using Microsoft.EntityFrameworkCore;

namespace Garden.Modules.Scheduling.Features.TaskScheduling;

public class GetClientCalendarHandler
{
    private readonly GardenDbContext _dbContext;
    private readonly ICurrentUser _currentUser;

    public GetClientCalendarHandler(GardenDbContext dbContext, ICurrentUser currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task<GetCalendarResponse> Handle(int page = 1, int pageSize = 20)
    {
        if (!_currentUser.IsAuthenticated || _currentUser.UserId is null)
            throw new UnauthorizedAccessException("User is not authenticated.");

        if (!_currentUser.Roles.Contains("Client"))
            throw new UnauthorizedAccessException("Only clients can view their schedule requests.");

        var clientId = _currentUser.UserId.Value;

        if (page <= 0) page = 1;
        if (pageSize <= 0 || pageSize > 100) pageSize = 20;

        // Get schedule request IDs first
        var scheduleIds = await _dbContext.TaskScheduleRequests
            .Where(sr => sr.ClientId == clientId)
            .OrderByDescending(sr => sr.ScheduledAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(sr => sr.Id)
            .ToListAsync();

        // Get total count
        var totalCount = await _dbContext.TaskScheduleRequests
            .Where(sr => sr.ClientId == clientId)
            .CountAsync();

        // Load all related data in single batch queries
        var schedules = await _dbContext.TaskScheduleRequests
            .Where(sr => scheduleIds.Contains(sr.Id))
            .ToListAsync();

        var taskIds = schedules.Select(sr => sr.TaskId).Distinct().ToList();
        var gardenerIds = schedules.Select(sr => sr.GardenerId).Distinct().ToList();

        var tasks = await _dbContext.Tasks
            .Where(t => taskIds.Contains(t.Id))
            .ToListAsync();

        var jobs = await _dbContext.Jobs
            .Where(j => tasks.Select(t => t.JobId).Contains(j.Id))
            .ToListAsync();

        var gardeners = await _dbContext.Gardeners
            .Where(g => gardenerIds.Contains(g.Id))
            .ToListAsync();

        var clients = await _dbContext.Clients
            .Where(c => c.Id == clientId)
            .ToListAsync();

        // Create DTOs from loaded data using in-memory lookups
        var taskLookup = tasks.ToDictionary(t => t.Id);
        var jobLookup = jobs.ToDictionary(j => j.Id);
        var gardenerLookup = gardeners.ToDictionary(g => g.Id);
        var clientLookup = clients.ToDictionary(c => c.Id);

        var scheduleDtos = schedules
            .OrderByDescending(s => s.ScheduledAtUtc)
            .Select(schedule =>
            {
                taskLookup.TryGetValue(schedule.TaskId, out var task);
                jobLookup.TryGetValue(task?.JobId ?? Guid.Empty, out var job);
                gardenerLookup.TryGetValue(schedule.GardenerId, out var gardener);
                clientLookup.TryGetValue(schedule.ClientId, out var client);

                return new TaskScheduleDto
                {
                    ScheduleRequestId = schedule.Id,
                    TaskId = schedule.TaskId,
                    JobId = task?.JobId ?? Guid.Empty,
                    TaskName = task?.Name ?? "Unknown Task",
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
            })
            .ToList();

        return new GetCalendarResponse
        {
            ScheduledTasks = scheduleDtos,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }
}
