using Garden.BuildingBlocks.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Garden.Api.Controllers;

[ApiController]
[Route("api/gardener/task-types")]
[Authorize(Roles = "Gardener")]
public class GardenerTaskTypesController : ControllerBase
{
    private readonly GardenDbContext _dbContext;

    public GardenerTaskTypesController(GardenDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var gardenerId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

        if (gardenerId == Guid.Empty)
            return Unauthorized();

        var taskTypes = await _dbContext.GardenerTaskTypes
            .Where(gtt => gtt.GardenerId == gardenerId)
            .Join(
                _dbContext.TaskTypes,
                gtt => gtt.TaskTypeId,
                tt => tt.Id,
                (gtt, tt) => new { tt.Id, tt.Name }
            )
            .OrderBy(t => t.Name)
            .Select(t => new { t.Id, t.Name })
            .ToListAsync();

        return Ok(new { taskTypes });
    }
}
