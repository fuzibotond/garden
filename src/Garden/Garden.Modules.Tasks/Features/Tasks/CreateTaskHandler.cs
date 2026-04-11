using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Identity;
using Microsoft.EntityFrameworkCore;

namespace Garden.Modules.Tasks.Features.Tasks;

public class CreateTaskHandler
{
    private readonly GardenDbContext _dbContext;
    private readonly ICurrentUser _currentUser;

    public CreateTaskHandler(GardenDbContext dbContext, ICurrentUser currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task<CreateTaskResponse> Handle(CreateTaskRequest request)
    {
        var userId = _currentUser.UserId;
        if (!userId.HasValue || userId == Guid.Empty)
        {
            throw new UnauthorizedAccessException("User not authenticated");
        }

        // Verify job exists and belongs to a client
        var job = await _dbContext.Jobs.FindAsync(request.JobId);
        if (job == null)
        {
            throw new KeyNotFoundException($"Job {request.JobId} not found");
        }

        // Verify task type exists
        var taskType = await _dbContext.TaskTypes.FindAsync(request.TaskTypeId);
        if (taskType == null)
        {
            throw new KeyNotFoundException($"Task type {request.TaskTypeId} not found");
        }

        // Verify task type is assigned to current gardener
        var isAssigned = await _dbContext.GardenerTaskTypes
            .AnyAsync(gtt => gtt.GardenerId == userId.Value && gtt.TaskTypeId == request.TaskTypeId);

        if (!isAssigned)
        {
            throw new UnauthorizedAccessException($"Task type {request.TaskTypeId} is not assigned to you");
        }

        var taskId = Guid.NewGuid();
        var now = DateTime.UtcNow;

        var task = new TaskRecord
        {
            Id = taskId,
            JobId = request.JobId,
            TaskTypeId = request.TaskTypeId,
            Name = request.Name,
            Description = request.Description,
            EstimatedTimeMinutes = request.EstimatedTimeMinutes,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };

        _dbContext.Tasks.Add(task);
        await _dbContext.SaveChangesAsync();

        return new CreateTaskResponse
        {
            TaskId = taskId,
            JobId = request.JobId,
            TaskTypeId = request.TaskTypeId,
            Name = request.Name,
            Description = request.Description,
            EstimatedTimeMinutes = request.EstimatedTimeMinutes,
            CreatedAt = now
        };
    }
}
