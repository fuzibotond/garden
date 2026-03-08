using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace Garden.Modules.Gardeners.Features.LoginGardener;

public static class LoginGardenerEndpoint
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapPost("/gardeners/login", async (
            LoginGardenerRequest request,
            LoginGardenerHandler handler,
            CancellationToken cancellationToken) =>
        {
            var response = await handler.HandleAsync(request, cancellationToken);
            return Results.Ok(response);
        });
    }
}