using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Identity;

namespace Garden.Modules.Materials.Features.Materials;

public class DeleteMaterialHandler
{
    private readonly GardenDbContext _dbContext;
    private readonly ICurrentUser _currentUser;

    public DeleteMaterialHandler(GardenDbContext dbContext, ICurrentUser currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task<bool> Handle(Guid materialId)
    {
        var userId = _currentUser.UserId;
        if (!userId.HasValue || userId == Guid.Empty)
        {
            throw new UnauthorizedAccessException("User not authenticated");
        }

        var material = await _dbContext.Materials.FindAsync(materialId);
        if (material == null || material.GardenerId != userId.Value)
            return false;

        // Delete associations with tasks
        var taskMaterials = _dbContext.TaskMaterials.Where(tm => tm.MaterialId == materialId);
        _dbContext.TaskMaterials.RemoveRange(taskMaterials);

        _dbContext.Materials.Remove(material);
        await _dbContext.SaveChangesAsync();

        return true;
    }
}
