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
                TaskTypeId = t.TaskTypeId,
                TaskTypeName = _dbContext.TaskTypes
                    .Where(tt => tt.Id == t.TaskTypeId)
                    .Select(tt => tt.Name)
                    .FirstOrDefault() ?? string.Empty,
                Name = t.Name,
                Description = t.Description,
                EstimatedTimeMinutes = t.EstimatedTimeMinutes,
                ActualTimeMinutes = t.ActualTimeMinutes,
                WagePerHour = t.WagePerHour,
                StartedAt = t.StartedAtUtc,
                FinishedAt = t.FinishedAtUtc,
                TotalMaterialCost = _dbContext.TaskMaterials
                    .Where(tm => tm.TaskId == t.Id)
                    .Select(tm => (decimal?)(tm.UsedQuantity * (tm.SnapshotPricePerAmount ?? 0m)))
                    .Sum() ?? 0m,
                TotalLaborCost = ((t.ActualTimeMinutes ?? 0) / 60m) * (t.WagePerHour ?? 0m),
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
