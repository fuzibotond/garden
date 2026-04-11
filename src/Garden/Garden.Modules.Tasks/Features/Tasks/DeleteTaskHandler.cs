using Garden.BuildingBlocks.Infrastructure.Persistence;

namespace Garden.Modules.Tasks.Features.Tasks;

public class DeleteTaskHandler
{
    private readonly GardenDbContext _dbContext;

    public DeleteTaskHandler(GardenDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<bool> Handle(Guid taskId)
    {
        var task = await _dbContext.Tasks.FindAsync(taskId);
        if (task == null)
            return false;

        // Delete associated materials
        var materials = _dbContext.TaskMaterials.Where(tm => tm.TaskId == taskId);
        _dbContext.TaskMaterials.RemoveRange(materials);

        _dbContext.Tasks.Remove(task);
        await _dbContext.SaveChangesAsync();

        return true;
    }
}
