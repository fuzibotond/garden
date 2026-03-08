using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace Garden.Modules.Gardeners.Features.LogoutGardener;

public static class LogoutGardenerEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapPost("/gardeners/logout", [Authorize] async (
            LogoutGardenerHandler handler,
            CancellationToken cancellationToken) =>
        {
            var response = await handler.HandleAsync(cancellationToken);
            return Results.Ok(response);
        });
    }
}
