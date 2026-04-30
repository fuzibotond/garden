using Garden.Modules.Materials.Features.Materials;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Garden.Modules.Materials.Controllers;

[ApiController]
[Route("api/gardener/materials")]
[Authorize(Roles = "Gardener")]
public class MaterialsController : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> CreateMaterial([FromServices] CreateMaterialHandler handler, [FromBody] CreateMaterialRequest request)
    {
        try
        {
            var response = await handler.Handle(request);
            return CreatedAtAction(nameof(GetMaterial), new { materialId = response.MaterialId }, response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ex.Message);
        }
    }

    [HttpGet("{materialId}")]
    public async Task<IActionResult> GetMaterial([FromServices] GetMaterialHandler handler, Guid materialId)
    {
        var response = await handler.Handle(materialId);
        if (response == null)
            return NotFound();

        return Ok(response);
    }

    [HttpGet]
    public async Task<IActionResult> GetMaterials([FromServices] GetMaterialsHandler handler, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var response = await handler.Handle(page, pageSize);
        return Ok(response);
    }

    [HttpPut("{materialId}")]
    public async Task<IActionResult> UpdateMaterial([FromServices] UpdateMaterialHandler handler, Guid materialId, [FromBody] UpdateMaterialRequest request)
    {
        var updateRequest = request with { MaterialId = materialId };
        var response = await handler.Handle(updateRequest);
        if (response == null)
            return NotFound();

        return Ok(response);
    }

    [HttpDelete("{materialId}")]
    public async Task<IActionResult> DeleteMaterial([FromServices] DeleteMaterialHandler handler, Guid materialId)
    {
        var success = await handler.Handle(materialId);
        if (!success)
            return NotFound();

        return NoContent();
    }
}
