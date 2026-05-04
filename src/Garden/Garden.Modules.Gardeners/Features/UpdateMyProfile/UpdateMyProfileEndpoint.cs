using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace Garden.Modules.Gardeners.Features.UpdateMyProfile;

public static class UpdateMyProfileEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapPut("/gardeners/update", [Authorize] async (
            UpdateMyProfileRequest request,
            UpdateMyProfileHandler handler,
            CancellationToken cancellationToken) =>
        {
            var response = await handler.HandleAsync(request, cancellationToken);
            return Results.Ok(response);
        });
    }
}