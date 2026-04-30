using Garden.Modules.Tasks.Features.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Garden.Modules.Tasks.Controllers;

[ApiController]
[Route("api/gardener/tasks")]
[Authorize(Roles = "Gardener")]
public class TasksController : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> CreateTask([FromServices] CreateTaskHandler handler, [FromBody] CreateTaskRequest request)
    {
        try
        {
            var response = await handler.Handle(request);
            return CreatedAtAction(nameof(GetTask), new { taskId = response.TaskId }, response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("{taskId}")]
    public async Task<IActionResult> GetTask([FromServices] GetTaskHandler handler, Guid taskId)
    {
        var response = await handler.Handle(taskId);
        if (response == null)
            return NotFound();

        return Ok(response);
    }

    [HttpPut("{taskId}")]
    public async Task<IActionResult> UpdateTask([FromServices] UpdateTaskHandler handler, Guid taskId, [FromBody] UpdateTaskRequest request)
    {
        try
        {
            var updateRequest = request with { TaskId = taskId };
            var response = await handler.Handle(updateRequest);
            if (response == null)
                return NotFound();

            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete("{taskId}")]
    public async Task<IActionResult> DeleteTask([FromServices] DeleteTaskHandler handler, Guid taskId)
    {
        var success = await handler.Handle(taskId);
        if (!success)
            return NotFound();

        return NoContent();
    }
}
