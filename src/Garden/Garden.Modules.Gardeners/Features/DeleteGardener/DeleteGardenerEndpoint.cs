using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace Garden.Modules.Gardeners.Features.DeleteGardener;

public static class DeleteGardenerEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapDelete("/gardeners/delete", [Authorize] async (
            DeleteGardenerHandler handler,
            CancellationToken cancellationToken) =>
        {
            await handler.HandleAsync(cancellationToken);
            return Results.NoContent();
        });
    }
}
