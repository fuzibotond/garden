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

        return new GetTaskResponse
        {
            TaskId = task.Id,
            JobId = task.JobId,
            TaskTypeId = task.TaskTypeId,
            Name = task.Name,
            Description = task.Description,
            EstimatedTimeMinutes = task.EstimatedTimeMinutes,
            ActualTimeMinutes = task.ActualTimeMinutes,
            StartedAt = task.StartedAtUtc,
            FinishedAt = task.FinishedAtUtc,
            CreatedAt = task.CreatedAtUtc,
            UpdatedAt = task.UpdatedAtUtc
        };
    }
}
