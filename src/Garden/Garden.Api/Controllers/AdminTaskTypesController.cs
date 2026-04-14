using Garden.BuildingBlocks.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Garden.Api.Controllers;

[ApiController]
[Route("api/admin/task-types")]
[Authorize(Roles = "Admin")]
public class AdminTaskTypesController : ControllerBase
{
    private readonly GardenDbContext _dbContext;

    public AdminTaskTypesController(GardenDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTaskTypeRequest request, [FromQuery] Guid? gardenerId = null)
    {
        var taskTypeId = Guid.NewGuid();
        var now = DateTime.UtcNow;

        var taskType = new TaskTypeRecord
        {
            Id = taskTypeId,
            Name = request.Name,
            CreatedAtUtc = now
        };

        _dbContext.TaskTypes.Add(taskType);

        // Assign to selected gardeners.
        // Backward compatibility: if no GardenerIds in body, accept single gardenerId query param.
        var targetGardenerIds = request.GardenerIds?.Where(id => id != Guid.Empty).Distinct().ToList() ?? new List<Guid>();

        if (targetGardenerIds.Count == 0 && gardenerId.HasValue && gardenerId.Value != Guid.Empty)
        {
            targetGardenerIds.Add(gardenerId.Value);
        }

        // Fallback to all gardeners only when neither body nor query specifies targets.
        if (targetGardenerIds.Count == 0)
        {
            var allGardeners = await _dbContext.Gardeners
                .Select(g => g.Id)
                .ToListAsync();
            targetGardenerIds = allGardeners;
        }

        // Create assignments
        foreach (var targetGardenerId in targetGardenerIds)
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

        return CreatedAtAction(nameof(GetById), new { id = taskType.Id }, new { taskType.Id, taskType.Name });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var taskType = await _dbContext.TaskTypes.FindAsync(id);
        if (taskType == null)
            return NotFound();

        return Ok(new { taskType.Id, taskType.Name });
    }

    [HttpGet("gardener/{gardenerId:guid}")]
    public async Task<IActionResult> GetByGardener(Guid gardenerId)
    {
        var taskTypes = await _dbContext.GardenerTaskTypes
            .Where(gtt => gtt.GardenerId == gardenerId)
            .Join(
                _dbContext.TaskTypes,
                gtt => gtt.TaskTypeId,
                tt => tt.Id,
                (gtt, tt) => new { tt.Id, tt.Name, gtt.GardenerId }
            )
            .OrderBy(t => t.Name)
            .Select(t => new { t.Id, t.Name })
            .ToListAsync();

        return Ok(new { taskTypes });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var taskType = await _dbContext.TaskTypes.FindAsync(id);
        if (taskType == null)
            return NotFound();

        // Check if any tasks are using this task type
        var tasksUsingThisType = await _dbContext.Tasks
            .AnyAsync(t => t.TaskTypeId == id);

        if (tasksUsingThisType)
            return BadRequest("Cannot delete task type that is in use. There are tasks assigned to this type.");

        // Delete all gardener assignments first (before deleting the task type)
        var gardenerAssignments = await _dbContext.GardenerTaskTypes
            .Where(gtt => gtt.TaskTypeId == id)
            .ToListAsync();

        _dbContext.GardenerTaskTypes.RemoveRange(gardenerAssignments);

        // Then delete the task type
        _dbContext.TaskTypes.Remove(taskType);

        try
        {
            await _dbContext.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            // Another request already deleted this task type concurrently.
            // Since deletion is idempotent, treat as success.
        }

        return NoContent();
    }
}

public record CreateTaskTypeRequest
{
    public string Name { get; init; } = default!;
    public List<Guid>? GardenerIds { get; init; } // If empty/null, will be assigned to all gardeners
}
