using Garden.BuildingBlocks.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Garden.Modules.Catalog.Features.TaskTypes;

public class GetTaskTypesHandler
{
    private readonly GardenDbContext _dbContext;

    public GetTaskTypesHandler(GardenDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<GetTaskTypesResponse> Handle(Guid gardenerId)
    {
        if (gardenerId == Guid.Empty)
            throw new UnauthorizedAccessException("User not authenticated");

        // Get task types assigned to this gardener
        var taskTypes = await _dbContext.GardenerTaskTypes
            .Where(gtt => gtt.GardenerId == gardenerId)
            .Join(
                _dbContext.TaskTypes,
                gtt => gtt.TaskTypeId,
                tt => tt.Id,
                (gtt, tt) => tt
            )
            .OrderBy(t => t.Name)
            .Select(t => new TaskTypeDto
            {
                Id = t.Id,
                Name = t.Name
            })
            .ToListAsync();

        return new GetTaskTypesResponse
        {
            TaskTypes = taskTypes
        };
    }
}
