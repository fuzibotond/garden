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
        var currentUserId = _currentUser.UserId.Value;

        // If gardener requests jobs, they should only see their own jobs
        if (!isAdmin && gardenerId.HasValue && gardenerId.Value != currentUserId)
        {
            throw new UnauthorizedAccessException("Gardeners can only view their own jobs.");
        }

        // If gardener is requesting, only show their jobs
        if (!isAdmin && !gardenerId.HasValue)
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
