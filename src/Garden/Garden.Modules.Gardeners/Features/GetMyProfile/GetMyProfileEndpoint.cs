using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace Garden.Modules.Gardeners.Features.GetMyProfile;

public static class GetMyProfileEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapGet("/gardeners/me", [Authorize] async (
            GetMyProfileHandler handler,
            CancellationToken cancellationToken) =>
        {
            var response = await handler.HandleAsync(cancellationToken);
            return Results.Ok(response);
        });
    }
}