using Garden.BuildingBlocks.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Garden.Modules.Tasks.Features.Tasks;

public class GetTaskHandler
{
    private readonly GardenDbContext _dbContext;

    public GetTaskHandler(GardenDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<GetTaskResponse?> Handle(Guid taskId)
    {
        var task = await _dbContext.Tasks.FirstOrDefaultAsync(t => t.Id == taskId);
        if (task == null)
            return null;

        var materials = await _dbContext.TaskMaterials
            .Where(tm => tm.TaskId == taskId)
            .Select(tm => new TaskMaterialDto
            {
                MaterialId = tm.MaterialId,
                Name = tm.SnapshotName ?? string.Empty,
                AmountType = tm.SnapshotAmountType ?? string.Empty,
                UsedQuantity = tm.UsedQuantity,
                PricePerAmount = tm.SnapshotPricePerAmount ?? 0m,
                TotalCost = tm.UsedQuantity * (tm.SnapshotPricePerAmount ?? 0m)
            })
            .ToListAsync();

        return new GetTaskResponse
        {
            TaskId = task.Id,
            JobId = task.JobId,
            TaskTypeId = task.TaskTypeId,
            Name = task.Name,
            Description = task.Description,
            EstimatedTimeMinutes = task.EstimatedTimeMinutes,
            ActualTimeMinutes = task.ActualTimeMinutes,
            WagePerHour = task.WagePerHour,
            StartedAt = task.StartedAtUtc,
            FinishedAt = task.FinishedAtUtc,
            Materials = materials,
            TotalMaterialCost = materials.Sum(m => m.TotalCost),
            TotalLaborCost = ((task.ActualTimeMinutes ?? 0) / 60m) * (task.WagePerHour ?? 0m),
            CreatedAt = task.CreatedAtUtc,
            UpdatedAt = task.UpdatedAtUtc
        };
    }
}
