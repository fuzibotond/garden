using Garden.BuildingBlocks.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Garden.Modules.Scheduling.Features.Jobs;

public class DeleteJobHandler
{
    private readonly GardenDbContext _dbContext;

    public DeleteJobHandler(GardenDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<bool> Handle(Guid jobId)
    {
        var job = await _dbContext.Jobs.FindAsync(jobId);
        if (job == null)
            return false;

        // Delete associated tasks and their materials
        var tasks = await _dbContext.Tasks.Where(t => t.JobId == jobId).ToListAsync();
        foreach (var task in tasks)
        {
            var materials = _dbContext.TaskMaterials.Where(tm => tm.TaskId == task.Id);
            _dbContext.TaskMaterials.RemoveRange(materials);
        }

        _dbContext.Tasks.RemoveRange(tasks);

        // Delete associated job gardeners
        var jobGardeners = _dbContext.JobGardeners.Where(jg => jg.JobId == jobId);
        _dbContext.JobGardeners.RemoveRange(jobGardeners);

        _dbContext.Jobs.Remove(job);
        await _dbContext.SaveChangesAsync();

        return true;
    }
}
