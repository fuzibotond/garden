using Garden.BuildingBlocks.Infrastructure.Persistence;

namespace Garden.Modules.Tasks.Features.Tasks;

public class UpdateTaskHandler
{
    private readonly GardenDbContext _dbContext;

    public UpdateTaskHandler(GardenDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<GetTaskResponse?> Handle(UpdateTaskRequest request)
    {
        var task = await _dbContext.Tasks.FindAsync(request.TaskId);
        if (task == null)
            return null;

        if (!string.IsNullOrEmpty(request.Name))
            task.Name = request.Name;

        if (request.Description != null)
            task.Description = request.Description;

        if (request.EstimatedTimeMinutes.HasValue)
            task.EstimatedTimeMinutes = request.EstimatedTimeMinutes;

        if (request.ActualTimeMinutes.HasValue)
            task.ActualTimeMinutes = request.ActualTimeMinutes;

        if (request.StartedAt.HasValue)
            task.StartedAtUtc = request.StartedAt;

        if (request.FinishedAt.HasValue)
            task.FinishedAtUtc = request.FinishedAt;

        task.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

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
