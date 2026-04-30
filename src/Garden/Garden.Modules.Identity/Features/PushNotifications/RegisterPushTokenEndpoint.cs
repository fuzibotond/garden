using Garden.Modules.Identity.Features.PushNotifications;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Garden.Modules.Identity.Features.PushNotifications;

[ApiController]
[Authorize]
public class RegisterPushTokenEndpoint : ControllerBase
{
    [HttpPost("/api/users/push-token")]
    public async Task<IActionResult> RegisterPushToken(
        [FromBody] RegisterPushTokenRequest request,
        [FromServices] RegisterPushTokenHandler handler,
        CancellationToken cancellationToken)
    {
        await handler.HandleAsync(request, cancellationToken);
        return Ok();
    }
}
