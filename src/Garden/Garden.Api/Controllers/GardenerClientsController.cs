using Garden.Api.Dto;
using Garden.Api.Features.GardenerClients;
using Garden.Modules.Clients.Controllers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Garden.Api.Controllers;

[ApiController]
[Route("api/gardener/clients")]
[Authorize(Roles = "Gardener")]
public class GardenerClientsController : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromServices] GetGardenerClientsHandler handler, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        try
        {
            var result = await handler.Handle(page, pageSize);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ex.Message);
        }
    }

    [HttpGet("total")]
    public async Task<IActionResult> GetTotal([FromServices] GetGardenerClientsTotalHandler handler)
    {
        try
        {
            var total = await handler.Handle();
            return Ok(new Garden.Api.Dto.TotalNumberResponse(total));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ex.Message);
        }
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById([FromServices] GetGardenerClientHandler handler, Guid id)
    {
        try
        {
            var result = await handler.Handle(id);
            if (result == null)
                return NotFound();

            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ex.Message);
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update([FromServices] UpdateGardenerClientHandler handler, Guid id, [FromBody] UpdateGardenerClientRequest request)
    {
        try
        {
            await handler.Handle(id, request);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return ex.Message.Contains("not found") ? NotFound(ex.Message) : Conflict(ex.Message);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ex.Message);
        }
    }
}
