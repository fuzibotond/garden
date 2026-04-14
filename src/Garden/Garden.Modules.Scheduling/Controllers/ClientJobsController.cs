using Garden.Modules.Scheduling.Features.Invoice;
using Garden.Modules.Scheduling.Features.Jobs;
using Garden.Modules.Tasks.Features.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Garden.Modules.Scheduling.Controllers;

[ApiController]
[Route("api/client/jobs")]
[Authorize(Roles = "Client")]
public class ClientJobsController : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetJobs([FromServices] GetJobsHandler handler, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        try
        {
            var response = await handler.Handle(null, null, page, pageSize);
            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ex.Message);
        }
    }

    [HttpGet("{jobId:guid}")]
    public async Task<IActionResult> GetJob([FromServices] GetJobHandler handler, Guid jobId)
    {
        try
        {
            var response = await handler.Handle(jobId);
            if (response == null)
                return NotFound();

            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ex.Message);
        }
    }

    [HttpGet("{jobId:guid}/tasks")]
    public async Task<IActionResult> GetJobTasks(
        [FromServices] GetJobHandler getJobHandler,
        [FromServices] GetTasksByJobHandler getTasksByJobHandler,
        Guid jobId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        try
        {
            var job = await getJobHandler.Handle(jobId);
            if (job == null)
                return NotFound();

            var response = await getTasksByJobHandler.Handle(jobId, page, pageSize);
            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ex.Message);
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
