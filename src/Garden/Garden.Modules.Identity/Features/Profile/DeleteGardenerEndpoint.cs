using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace Garden.Modules.Identity.Features.Profile;

public static class DeleteGardenerEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapDelete("/auth/delete", [Authorize] async (
            DeleteGardenerHandler handler,
            CancellationToken cancellationToken) =>
        {
            await handler.HandleAsync(cancellationToken);
            return Results.NoContent();
        });
    }
}
