using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Identity;
using Microsoft.EntityFrameworkCore;

namespace Garden.Modules.Scheduling.Features.Jobs;

public class GetJobHandler
{
    private readonly GardenDbContext _dbContext;
    private readonly ICurrentUser _currentUser;

    public GetJobHandler(GardenDbContext dbContext, ICurrentUser currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task<GetJobResponse?> Handle(Guid jobId)
    {
        if (!_currentUser.IsAuthenticated || _currentUser.UserId is null)
            throw new UnauthorizedAccessException("User is not authenticated.");

        var job = await _dbContext.Jobs.FirstOrDefaultAsync(j => j.Id == jobId);
        if (job == null)
            return null;

        var isAdmin = _currentUser.Roles.Contains("Admin");
        var currentUserId = _currentUser.UserId.Value;

        // If not admin, verify gardener is assigned to this job
        if (!isAdmin)
        {
            var isAssigned = await _dbContext.JobGardeners
                .AnyAsync(jg => jg.JobId == jobId && jg.GardenerId == currentUserId);

            if (!isAssigned)
                throw new UnauthorizedAccessException("You do not have access to this job.");
        }

        var client = await _dbContext.Clients.FindAsync(job.ClientId);

        var tasks = await _dbContext.Tasks
            .Where(t => t.JobId == jobId)
            .Select(t => new TaskSummaryDto
            {
                TaskId = t.Id,
                Name = t.Name,
                EstimatedTimeMinutes = t.EstimatedTimeMinutes,
                ActualTimeMinutes = t.ActualTimeMinutes
            })
            .ToListAsync();

        var gardeners = await _dbContext.JobGardeners
            .Where(jg => jg.JobId == jobId)
            .Join(
                _dbContext.Gardeners,
                jg => jg.GardenerId,
                g => g.Id,
                (jg, g) => new GardenerSummaryDto
                {
                    GardenerId = g.Id,
                    Name = g.Name ?? g.CompanyName,
                    Email = g.Email
                }
            )
            .ToListAsync();

        return new GetJobResponse
        {
            JobId = job.Id,
            ClientId = job.ClientId,
            ClientName = client?.Name ?? "Unknown",
            Name = job.Name,
            Tasks = tasks,
            AssignedGardeners = gardeners,
            CreatedAt = job.CreatedAtUtc,
            UpdatedAt = job.UpdatedAtUtc
        };
    }
}
