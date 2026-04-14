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
        var isClient = _currentUser.Roles.Contains("Client");
        var currentUserId = _currentUser.UserId.Value;

        // If not admin, enforce ownership by role
        if (!isAdmin)
        {
            if (isClient)
            {
                if (job.ClientId != currentUserId)
                    throw new UnauthorizedAccessException("You do not have access to this job.");
            }
            else
            {
                var isAssigned = await _dbContext.JobGardeners
                    .AnyAsync(jg => jg.JobId == jobId && jg.GardenerId == currentUserId);

                if (!isAssigned)
                    throw new UnauthorizedAccessException("You do not have access to this job.");
            }
        }

        var client = await _dbContext.Clients.FindAsync(job.ClientId);

        var tasks = await _dbContext.Tasks
            .Where(t => t.JobId == jobId)
            .Select(t => new TaskSummaryDto
            {
                TaskId = t.Id,
                Name = t.Name,
                EstimatedTimeMinutes = t.EstimatedTimeMinutes,
                ActualTimeMinutes = t.ActualTimeMinutes,
                WagePerHour = t.WagePerHour,
                TotalMaterialCost = _dbContext.TaskMaterials
                    .Where(tm => tm.TaskId == t.Id)
                    .Select(tm => (decimal?)(tm.UsedQuantity * (tm.SnapshotPricePerAmount ?? 0m)))
                    .Sum() ?? 0m,
                TotalLaborCost = ((t.ActualTimeMinutes ?? 0) / 60m) * (t.WagePerHour ?? 0m),
                StartedAt = t.StartedAtUtc,
                FinishedAt = t.FinishedAtUtc
            })
            .ToListAsync();

        var taskCount = tasks.Count;
        var finishedTaskCount = tasks.Count(t => t.FinishedAt.HasValue);
        var inProgressTaskCount = tasks.Count(t => t.StartedAt.HasValue && !t.FinishedAt.HasValue);
        var notStartedTaskCount = tasks.Count(t => !t.StartedAt.HasValue && !t.FinishedAt.HasValue);
        var progressPercent = taskCount == 0
            ? 0m
            : Math.Round(((finishedTaskCount + (inProgressTaskCount * 0.5m)) / taskCount) * 100m, 2);
        var totalEstimatedTimeMinutes = tasks.Sum(t => t.EstimatedTimeMinutes ?? 0);
        var totalActualTimeMinutes = tasks.Sum(t => t.ActualTimeMinutes ?? 0);
        var timeDifferenceMinutes = totalActualTimeMinutes - totalEstimatedTimeMinutes;
        var actualVsEstimatedPercent = totalEstimatedTimeMinutes == 0
            ? 0m
            : Math.Round((totalActualTimeMinutes / (decimal)totalEstimatedTimeMinutes) * 100m, 2);
        var totalMaterialCost = tasks.Sum(t => t.TotalMaterialCost);
        var totalLaborCost = tasks.Sum(t => t.TotalLaborCost);

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
            TaskCount = taskCount,
            FinishedTaskCount = finishedTaskCount,
            InProgressTaskCount = inProgressTaskCount,
            NotStartedTaskCount = notStartedTaskCount,
            ProgressPercent = progressPercent,
            TotalEstimatedTimeMinutes = totalEstimatedTimeMinutes,
            TotalActualTimeMinutes = totalActualTimeMinutes,
            TimeDifferenceMinutes = timeDifferenceMinutes,
            ActualVsEstimatedPercent = actualVsEstimatedPercent,
            TotalMaterialCost = totalMaterialCost,
            TotalLaborCost = totalLaborCost,
            AssignedGardeners = gardeners,
            IsClosed = job.ClosedAtUtc.HasValue,
            ClosedAt = job.ClosedAtUtc,
            InvoiceNumber = job.InvoiceNumber,
            CreatedAt = job.CreatedAtUtc,
            UpdatedAt = job.UpdatedAtUtc
        };
    }
}
