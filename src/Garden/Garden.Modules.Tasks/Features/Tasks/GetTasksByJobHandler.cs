using Garden.BuildingBlocks.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Garden.Modules.Tasks.Features.Tasks;

public class GetTasksByJobHandler
{
    private readonly GardenDbContext _dbContext;

    public GetTasksByJobHandler(GardenDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<GetTasksByJobResponse> Handle(Guid jobId, int page = 1, int pageSize = 20)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0 || pageSize > 100) pageSize = 20;

        var total = await _dbContext.Tasks.CountAsync(t => t.JobId == jobId);

        var tasks = await _dbContext.Tasks
            .Where(t => t.JobId == jobId)
            .OrderByDescending(t => t.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new TaskItemDto
            {
                TaskId = t.Id,
                Name = t.Name,
                Description = t.Description,
                EstimatedTimeMinutes = t.EstimatedTimeMinutes,
                ActualTimeMinutes = t.ActualTimeMinutes,
                StartedAt = t.StartedAtUtc,
                FinishedAt = t.FinishedAtUtc,
                CreatedAt = t.CreatedAtUtc
            })
            .ToListAsync();

        return new GetTasksByJobResponse
        {
            Tasks = tasks,
            Total = total
        };
    }
}
