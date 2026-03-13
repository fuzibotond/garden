using Garden.Modules.Gardeners.Services;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace Garden.Modules.Gardeners;

public static class ModuleExtensions
{
    public static IServiceCollection AddGardenersModule(this IServiceCollection services)
    {

        // Gardener persistence / registration service. Identity will orchestrate auth flows
        // and call into this service to create gardener records.
        services.AddScoped<Garden.BuildingBlocks.Services.IGardenerRegistrationService, GardenerRegistrationService>();

        return services;
    }

    public static IEndpointRouteBuilder MapGardenersEndpoints(this IEndpointRouteBuilder app)
    {

        return app;
    }
}