using Garden.Modules.Catalog.Features.Pricing;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Garden.Modules.Catalog.Controllers;

[ApiController]
[Route("api/gardener/pricing")]
[Authorize(Roles = "Gardener")]
public class PricingController : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create(
        [FromServices] CreatePricingItemHandler handler,
        [FromBody] CreatePricingItemRequest request)
    {
        var response = await handler.Handle(request);
        return CreatedAtAction(nameof(GetAll), new { }, response);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromServices] GetPricingItemsHandler handler,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var response = await handler.Handle(page, pageSize);
        return Ok(response);
    }

    [HttpPut("{pricingItemId}")]
    public async Task<IActionResult> Update(
        [FromServices] UpdatePricingItemHandler handler,
        Guid pricingItemId,
        [FromBody] UpdatePricingItemRequest request)
    {
        var updateRequest = request with { PricingItemId = pricingItemId };
        var response = await handler.Handle(updateRequest);
        if (response == null)
            return NotFound();
        return Ok(response);
    }

    [HttpDelete("{pricingItemId}")]
    public async Task<IActionResult> Delete(
        [FromServices] DeletePricingItemHandler handler,
        Guid pricingItemId)
    {
        var success = await handler.Handle(pricingItemId);
        if (!success)
            return NotFound();
        return NoContent();
    }
}
