using Garden.BuildingBlocks.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Garden.Modules.Catalog.Features.TaskTypes;

public class DeleteTaskTypeHandler
{
    private readonly GardenDbContext _dbContext;

    public DeleteTaskTypeHandler(GardenDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<bool> Handle(Guid taskTypeId)
    {
        var taskType = await _dbContext.TaskTypes.FindAsync(taskTypeId);
        if (taskType == null)
            return false;

        // Check if any tasks are using this task type
        var tasksUsingThisType = await _dbContext.Tasks
            .Where(t => t.TaskTypeId == taskTypeId)
            .AnyAsync();

        if (tasksUsingThisType)
            throw new InvalidOperationException("Cannot delete task type that is in use. There are tasks assigned to this type.");

        // Delete all gardener assignments first (before deleting the task type)
        var gardenerAssignments = await _dbContext.GardenerTaskTypes
            .Where(gtt => gtt.TaskTypeId == taskTypeId)
            .ToListAsync();

        _dbContext.GardenerTaskTypes.RemoveRange(gardenerAssignments);

        // Then delete the task type
        _dbContext.TaskTypes.Remove(taskType);
        await _dbContext.SaveChangesAsync();

        return true;
    }
}
