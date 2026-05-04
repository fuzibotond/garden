using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace Garden.Modules.Gardeners.Features.RegisterGardener;

public static class RegisterGardenerEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapPost("/gardeners/register", async (
            RegisterGardenerRequest request,
            RegisterGardenerHandler handler,
            CancellationToken cancellationToken) =>
        {
            var response = await handler.HandleAsync(request, cancellationToken);
            return Results.Ok(response);
        });
    }
}