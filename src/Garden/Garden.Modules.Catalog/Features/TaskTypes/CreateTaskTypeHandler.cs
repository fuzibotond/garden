using Garden.BuildingBlocks.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Garden.Modules.Catalog.Features.TaskTypes;

public class CreateTaskTypeHandler
{
    private readonly GardenDbContext _dbContext;

    public CreateTaskTypeHandler(GardenDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<CreateTaskTypeResponse> Handle(CreateTaskTypeRequest request, Guid gardenerId)
    {
        if (gardenerId == Guid.Empty)
            throw new UnauthorizedAccessException("User not authenticated");

        var taskTypeId = Guid.NewGuid();
        var now = DateTime.UtcNow;

        // Create task type
        var taskType = new TaskTypeRecord
        {
            Id = taskTypeId,
            Name = request.Name,
            CreatedAtUtc = now
        };

        _dbContext.TaskTypes.Add(taskType);

        // If no gardeners specified, assign to all existing gardeners
        var targetGardenerIds = request.GardenerIds ?? new List<Guid>();
        if (targetGardenerIds.Count == 0)
        {
            var allGardeners = await _dbContext.Gardeners
                .Select(g => g.Id)
                .ToListAsync();
            targetGardenerIds = allGardeners;
        }

        // Assign task type to selected gardeners
        foreach (var targetGardenerId in targetGardenerIds.Distinct())
        {
            var assignment = new GardenerTaskTypeRecord
            {
                Id = Guid.NewGuid(),
                GardenerId = targetGardenerId,
                TaskTypeId = taskTypeId
            };
            _dbContext.GardenerTaskTypes.Add(assignment);
        }

        await _dbContext.SaveChangesAsync();

        return new CreateTaskTypeResponse
        {
            TaskTypeId = taskTypeId,
            Name = request.Name,
            CreatedAt = now,
            AssignedToGardenersCount = targetGardenerIds.Count
        };
    }
}
