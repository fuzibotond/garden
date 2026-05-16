using Garden.BuildingBlocks.Services;
using Garden.Modules.Gardeners.Services;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace Garden.Modules.Gardeners;

public static class ModuleExtensions
{
    public static IServiceCollection AddGardenersModule(this IServiceCollection services)
    {
        services.AddScoped<IGardenerRegistrationService, GardenerRegistrationService>();

        return services;
    }

    public static IEndpointRouteBuilder MapGardenersEndpoints(this IEndpointRouteBuilder app)
    {
        return app;
    }
}