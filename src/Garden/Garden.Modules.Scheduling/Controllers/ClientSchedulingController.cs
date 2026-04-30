using Garden.Modules.Scheduling.Features.TaskScheduling;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Garden.Modules.Scheduling.Controllers;

[ApiController]
[Route("api/client/scheduling")]
[Authorize(Roles = "Client")]
public class ClientSchedulingController : ControllerBase
{
    [HttpGet("calendar")]
    public async Task<IActionResult> GetCalendar(
        [FromServices] GetClientCalendarHandler handler,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        try
        {
            var response = await handler.Handle(page, pageSize);
            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ex.Message);
        }
    }

    [HttpPost("approve-schedule")]
    public async Task<IActionResult> ApproveSchedule(
        [FromServices] ApproveScheduleHandler handler,
        [FromBody] ApproveScheduleRequest request)
    {
        try
        {
            var response = await handler.Handle(request);
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

    [HttpPost("decline-schedule")]
    public async Task<IActionResult> DeclineSchedule(
        [FromServices] DeclineScheduleHandler handler,
        [FromBody] DeclineScheduleRequest request)
    {
        try
        {
            var response = await handler.Handle(request.ScheduleRequestId);
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

    [HttpPost("propose-alternative-time")]
    public async Task<IActionResult> ProposeAlternativeTime(
        [FromServices] ProposeAlternativeTimeHandler handler,
        [FromBody] ProposeAlternativeTimeRequest request)
    {
        try
        {
            var response = await handler.Handle(request);
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
}
