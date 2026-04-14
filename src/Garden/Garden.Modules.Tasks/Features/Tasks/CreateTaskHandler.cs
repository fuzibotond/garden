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

        if (request.WagePerHour.HasValue && request.WagePerHour.Value < 0)
        {
            throw new InvalidOperationException("Wage per hour cannot be negative.");
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
            WagePerHour = request.WagePerHour,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };

        _dbContext.Tasks.Add(task);

        var requestedMaterials = request.Materials ?? [];
        if (requestedMaterials.Count > 0)
        {
            if (requestedMaterials.Any(m => m.UsedQuantity <= 0))
            {
                throw new InvalidOperationException("Material quantity must be greater than zero.");
            }

            var materialQuantities = requestedMaterials
                .GroupBy(m => m.MaterialId)
                .Select(g => new
                {
                    MaterialId = g.Key,
                    UsedQuantity = g.Sum(x => x.UsedQuantity)
                })
                .ToList();

            var materialIds = materialQuantities.Select(x => x.MaterialId).ToList();

            var materials = await _dbContext.Materials
                .Where(m => m.GardenerId == userId.Value && materialIds.Contains(m.Id))
                .ToListAsync();

            if (materials.Count != materialIds.Count)
            {
                throw new KeyNotFoundException("One or more materials were not found for this gardener.");
            }

            foreach (var materialQuantity in materialQuantities)
            {
                var material = materials.First(m => m.Id == materialQuantity.MaterialId);
                _dbContext.TaskMaterials.Add(new TaskMaterialRecord
                {
                    Id = Guid.NewGuid(),
                    TaskId = taskId,
                    MaterialId = materialQuantity.MaterialId,
                    UsedQuantity = materialQuantity.UsedQuantity,
                    SnapshotName = material.Name,
                    SnapshotAmountType = material.AmountType,
                    SnapshotPricePerAmount = material.PricePerAmount
                });
            }
        }

        await _dbContext.SaveChangesAsync();

        var responseMaterials = await _dbContext.TaskMaterials
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

        return new CreateTaskResponse
        {
            TaskId = taskId,
            JobId = request.JobId,
            TaskTypeId = request.TaskTypeId,
            Name = request.Name,
            Description = request.Description,
            EstimatedTimeMinutes = request.EstimatedTimeMinutes,
            WagePerHour = task.WagePerHour,
            Materials = responseMaterials,
            TotalMaterialCost = responseMaterials.Sum(m => m.TotalCost),
            TotalLaborCost = ((task.ActualTimeMinutes ?? 0) / 60m) * (task.WagePerHour ?? 0m),
            CreatedAt = now
        };
    }
}
