using Garden.Modules.Scheduling.Features.Invoice;
using Garden.Modules.Scheduling.Features.Jobs;
using Garden.Modules.Tasks.Features.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Garden.Modules.Scheduling.Controllers;

[ApiController]
[Route("api/gardener/jobs")]
[Authorize(Roles = "Gardener")]
public class JobsController : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> CreateJob([FromServices] CreateJobHandler handler, [FromBody] CreateJobRequest request)
    {
        try
        {
            var response = await handler.Handle(request);
            return CreatedAtAction(nameof(GetJob), new { jobId = response.JobId }, response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }

    [HttpGet("{jobId}")]
    public async Task<IActionResult> GetJob([FromServices] GetJobHandler handler, Guid jobId)
    {
        var response = await handler.Handle(jobId);
        if (response == null)
            return NotFound();

        return Ok(response);
    }

    [HttpGet]
    public async Task<IActionResult> GetJobs([FromServices] GetJobsHandler handler, [FromQuery] Guid? clientId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var response = await handler.Handle(clientId, null, page, pageSize);
        return Ok(response);
    }

    [HttpPut("{jobId}")]
    public async Task<IActionResult> UpdateJob([FromServices] UpdateJobHandler handler, Guid jobId, [FromBody] UpdateJobRequest request)
    {
        var updateRequest = request with { JobId = jobId };
        var response = await handler.Handle(updateRequest);
        if (response == null)
            return NotFound();

        return Ok(response);
    }

    [HttpDelete("{jobId}")]
    public async Task<IActionResult> DeleteJob([FromServices] DeleteJobHandler handler, Guid jobId)
    {
        var success = await handler.Handle(jobId);
        if (!success)
            return NotFound();

        return NoContent();
    }

    [HttpGet("{jobId}/tasks")]
    public async Task<IActionResult> GetJobTasks([FromServices] GetTasksByJobHandler handler, Guid jobId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var response = await handler.Handle(jobId, page, pageSize);
        return Ok(response);
    }

    [HttpPost("{jobId}/tasks")]
    public async Task<IActionResult> CreateTask([FromServices] CreateTaskHandler handler, Guid jobId, [FromBody] CreateTaskRequest request)
    {
        try
        {
            var createRequest = request with { JobId = jobId };
            var response = await handler.Handle(createRequest);
            return CreatedAtAction("GetTask", "Tasks", new { taskId = response.TaskId }, response);
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

    [HttpPost("{jobId:guid}/close")]
    public async Task<IActionResult> CloseJob([FromServices] CloseJobHandler handler, Guid jobId)
    {
        try
        {
            var response = await handler.Handle(jobId);
            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ex.Message);
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

    [HttpGet("{jobId:guid}/invoice")]
    public async Task<IActionResult> GetInvoice([FromServices] GetInvoiceHandler handler, Guid jobId)
    {
        try
        {
            var (pdf, fileName) = await handler.Handle(jobId);
            return File(pdf, "application/pdf", fileName);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ex.Message);
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
}
