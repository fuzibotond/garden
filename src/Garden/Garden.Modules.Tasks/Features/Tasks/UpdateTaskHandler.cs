using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Identity;
using Microsoft.EntityFrameworkCore;

namespace Garden.Modules.Tasks.Features.Tasks;

public class UpdateTaskHandler
{
    private readonly GardenDbContext _dbContext;
    private readonly ICurrentUser _currentUser;

    public UpdateTaskHandler(GardenDbContext dbContext, ICurrentUser currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
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

        if (request.WagePerHour.HasValue)
        {
            if (request.WagePerHour.Value < 0)
            {
                throw new InvalidOperationException("Wage per hour cannot be negative.");
            }

            task.WagePerHour = request.WagePerHour;
        }

        if (request.StartedAt.HasValue)
            task.StartedAtUtc = request.StartedAt;

        if (request.FinishedAt.HasValue)
            task.FinishedAtUtc = request.FinishedAt;

        if (task.FinishedAtUtc.HasValue)
        {
            if (!task.StartedAtUtc.HasValue)
            {
                throw new InvalidOperationException("Task start time must be set before finishing the task.");
            }

            if (task.FinishedAtUtc.Value < task.StartedAtUtc.Value)
            {
                throw new InvalidOperationException("Task finish time cannot be earlier than start time.");
            }

            var elapsedMinutes = (int)Math.Round((task.FinishedAtUtc.Value - task.StartedAtUtc.Value).TotalMinutes);
            task.ActualTimeMinutes = Math.Max(0, elapsedMinutes);
        }

        if (request.Materials != null)
        {
            var userId = _currentUser.UserId;
            if (!userId.HasValue || userId == Guid.Empty)
            {
                throw new UnauthorizedAccessException("User not authenticated");
            }

            if (request.Materials.Any(m => m.UsedQuantity <= 0))
            {
                throw new InvalidOperationException("Material quantity must be greater than zero.");
            }

            var materialQuantities = request.Materials
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

            var existingMaterials = _dbContext.TaskMaterials.Where(tm => tm.TaskId == task.Id);
            _dbContext.TaskMaterials.RemoveRange(existingMaterials);

            foreach (var materialQuantity in materialQuantities)
            {
                var material = materials.First(m => m.Id == materialQuantity.MaterialId);
                _dbContext.TaskMaterials.Add(new TaskMaterialRecord
                {
                    Id = Guid.NewGuid(),
                    TaskId = task.Id,
                    MaterialId = materialQuantity.MaterialId,
                    UsedQuantity = materialQuantity.UsedQuantity,
                    SnapshotName = material.Name,
                    SnapshotAmountType = material.AmountType,
                    SnapshotPricePerAmount = material.PricePerAmount
                });
            }
        }

        task.UpdatedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        var responseMaterials = await _dbContext.TaskMaterials
            .Where(tm => tm.TaskId == task.Id)
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
            Materials = responseMaterials,
            TotalMaterialCost = responseMaterials.Sum(m => m.TotalCost),
            TotalLaborCost = ((task.ActualTimeMinutes ?? 0) / 60m) * (task.WagePerHour ?? 0m),
            CreatedAt = task.CreatedAtUtc,
            UpdatedAt = task.UpdatedAtUtc
        };
    }
}
