using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Identity;
using Microsoft.EntityFrameworkCore;

namespace Garden.Modules.Scheduling.Features.Jobs;

public class GetJobsHandler
{
    private readonly GardenDbContext _dbContext;
    private readonly ICurrentUser _currentUser;

    public GetJobsHandler(GardenDbContext dbContext, ICurrentUser currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task<GetJobsResponse> Handle(Guid? clientId = null, Guid? gardenerId = null, int page = 1, int pageSize = 20)
    {
        if (!_currentUser.IsAuthenticated || _currentUser.UserId is null)
            throw new UnauthorizedAccessException("User is not authenticated.");

        if (page <= 0) page = 1;
        if (pageSize <= 0 || pageSize > 100) pageSize = 20;

        var isAdmin = _currentUser.Roles.Contains("Admin");
        var isClient = _currentUser.Roles.Contains("Client");
        var currentUserId = _currentUser.UserId.Value;

        // Client can only view own jobs and cannot filter by gardener.
        if (!isAdmin && isClient)
        {
            if (clientId.HasValue && clientId.Value != currentUserId)
            {
                throw new UnauthorizedAccessException("Clients can only view their own jobs.");
            }

            if (gardenerId.HasValue)
            {
                throw new UnauthorizedAccessException("Clients cannot filter jobs by gardener.");
            }

            clientId = currentUserId;
        }

        // If gardener requests jobs, they should only see their own jobs
        if (!isAdmin && !isClient && gardenerId.HasValue && gardenerId.Value != currentUserId)
        {
            throw new UnauthorizedAccessException("Gardeners can only view their own jobs.");
        }

        // If gardener is requesting, only show their jobs
        if (!isAdmin && !isClient && !gardenerId.HasValue)
        {
            gardenerId = currentUserId;
        }

        IQueryable<JobRecord> query = _dbContext.Jobs;

        if (clientId.HasValue)
            query = query.Where(j => j.ClientId == clientId.Value);

        if (gardenerId.HasValue)
            query = query.Where(j => _dbContext.JobGardeners
                .Any(jg => jg.JobId == j.Id && jg.GardenerId == gardenerId.Value));

        var total = await query.CountAsync();

        var paginatedJobs = await query
            .OrderByDescending(j => j.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .AsNoTracking()
            .ToListAsync();

        var jobIds = paginatedJobs.Select(j => j.Id).ToList();

        // Fetch all related data in batch queries
        var clientsMap = await _dbContext.Clients
            .Where(c => paginatedJobs.Select(j => j.ClientId).Contains(c.Id))
            .ToDictionaryAsync(c => c.Id);

        var jobGardenersMap = await _dbContext.JobGardeners
            .Where(jg => jobIds.Contains(jg.JobId))
            .ToListAsync();

        var gardenerIds = jobGardenersMap.Select(jg => jg.GardenerId).Distinct().ToList();
        var gardenersMap = await _dbContext.Gardeners
            .Where(g => gardenerIds.Contains(g.Id))
            .ToDictionaryAsync(g => g.Id);

        var taskCounts = await _dbContext.Tasks
            .Where(t => jobIds.Contains(t.JobId))
            .GroupBy(t => t.JobId)
            .Select(g => new { JobId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(tc => tc.JobId);

        var taskProgressMap = await _dbContext.Tasks
            .Where(t => jobIds.Contains(t.JobId))
            .GroupBy(t => t.JobId)
            .Select(g => new
            {
                JobId = g.Key,
                FinishedCount = g.Count(t => t.FinishedAtUtc.HasValue),
                InProgressCount = g.Count(t => t.StartedAtUtc.HasValue && !t.FinishedAtUtc.HasValue),
                NotStartedCount = g.Count(t => !t.StartedAtUtc.HasValue && !t.FinishedAtUtc.HasValue)
            })
            .ToDictionaryAsync(x => x.JobId);

        var taskSummaryMap = await _dbContext.Tasks
            .Where(t => jobIds.Contains(t.JobId))
            .Select(t => new
            {
                t.JobId,
                EstimatedMinutes = t.EstimatedTimeMinutes ?? 0,
                ActualMinutes = t.ActualTimeMinutes ?? 0,
                TotalLaborCost = ((t.ActualTimeMinutes ?? 0) / 60m) * (t.WagePerHour ?? 0m),
                TotalMaterialCost = _dbContext.TaskMaterials
                    .Where(tm => tm.TaskId == t.Id)
                    .Select(tm => (decimal?)(tm.UsedQuantity * (tm.SnapshotPricePerAmount ?? 0m)))
                    .Sum() ?? 0m
            })
            .ToListAsync();

        var jobSummaryMap = taskSummaryMap
            .GroupBy(x => x.JobId)
            .ToDictionary(
                g => g.Key,
                g => new
                {
                    TotalEstimatedTimeMinutes = g.Sum(x => x.EstimatedMinutes),
                    TotalActualTimeMinutes = g.Sum(x => x.ActualMinutes),
                    TotalLaborCost = g.Sum(x => x.TotalLaborCost),
                    TotalMaterialCost = g.Sum(x => x.TotalMaterialCost)
                });

        var jobDtos = paginatedJobs.Select(job =>
        {
            var client = clientsMap.TryGetValue(job.ClientId, out var c) ? c : null;
            var linkedGardenersData = jobGardenersMap
                .Where(jg => jg.JobId == job.Id)
                .Select(jg =>
                {
                    var gardener = gardenersMap.TryGetValue(jg.GardenerId, out var g) ? g : null;
                    return new GardenerDto
                    {
                        Id = jg.GardenerId,
                        Name = gardener?.Name ?? gardener?.CompanyName ?? "Unknown",
                        Email = gardener?.Email ?? ""
                    };
                })
                .ToList();
            var taskCount = taskCounts.TryGetValue(job.Id, out var tc) ? tc.Count : 0;
            var progress = taskProgressMap.TryGetValue(job.Id, out var p)
                ? p
                : new { JobId = job.Id, FinishedCount = 0, InProgressCount = 0, NotStartedCount = 0 };

            var progressPercent = taskCount == 0
                ? 0m
                : Math.Round(((progress.FinishedCount + (progress.InProgressCount * 0.5m)) / taskCount) * 100m, 2);
            var summary = jobSummaryMap.TryGetValue(job.Id, out var s)
                ? s
                : new
                {
                    TotalEstimatedTimeMinutes = 0,
                    TotalActualTimeMinutes = 0,
                    TotalLaborCost = 0m,
                    TotalMaterialCost = 0m
                };
            var timeDifferenceMinutes = summary.TotalActualTimeMinutes - summary.TotalEstimatedTimeMinutes;
            var actualVsEstimatedPercent = summary.TotalEstimatedTimeMinutes == 0
                ? 0m
                : Math.Round((summary.TotalActualTimeMinutes / (decimal)summary.TotalEstimatedTimeMinutes) * 100m, 2);

            return new JobItemDto
            {
                JobId = job.Id,
                Name = job.Name,
                Client = new ClientDto
                {
                    Id = client?.Id ?? Guid.Empty,
                    Name = client?.Name ?? "Unknown",
                    Email = client?.Email ?? ""
                },
                LinkedGardeners = linkedGardenersData,
                TaskCount = taskCount,
                FinishedTaskCount = progress.FinishedCount,
                InProgressTaskCount = progress.InProgressCount,
                NotStartedTaskCount = progress.NotStartedCount,
                ProgressPercent = progressPercent,
                TotalEstimatedTimeMinutes = summary.TotalEstimatedTimeMinutes,
                TotalActualTimeMinutes = summary.TotalActualTimeMinutes,
                TimeDifferenceMinutes = timeDifferenceMinutes,
                ActualVsEstimatedPercent = actualVsEstimatedPercent,
                TotalMaterialCost = summary.TotalMaterialCost,
                TotalLaborCost = summary.TotalLaborCost,
                IsClosed = job.ClosedAtUtc.HasValue,
                ClosedAt = job.ClosedAtUtc,
                CreatedAt = job.CreatedAtUtc
            };
        }).ToList();

        return new GetJobsResponse
        {
            Jobs = jobDtos,
            Total = total
        };
    }
}
