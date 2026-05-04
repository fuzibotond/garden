using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace Garden.Modules.Gardeners.Features.RefreshGardenerToken;

public static class RefreshGardenerTokenEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapPost("/gardeners/refresh-token", async (
            RefreshGardenerTokenRequest request,
            RefreshGardenerTokenHandler handler,
            CancellationToken cancellationToken) =>
        {
            var response = await handler.HandleAsync(request, cancellationToken);
            return Results.Ok(response);
        });
    }
}