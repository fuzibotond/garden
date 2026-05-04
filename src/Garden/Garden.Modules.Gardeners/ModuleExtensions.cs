using Garden.Modules.Gardeners.Features.DeleteGardener;
using Garden.Modules.Gardeners.Features.GetMyProfile;
using Garden.Modules.Gardeners.Features.LoginGardener;
using Garden.Modules.Gardeners.Features.LogoutGardener;
using Garden.Modules.Gardeners.Features.RefreshGardenerToken;
using Garden.Modules.Gardeners.Features.RegisterGardener;
using Garden.Modules.Gardeners.Features.UpdateMyProfile;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace Garden.Modules.Gardeners;

public static class ModuleExtensions
{
    public static IServiceCollection AddGardenersModule(this IServiceCollection services)
    {
        services.AddScoped<RegisterGardenerHandler>();
        services.AddScoped<LoginGardenerHandler>();
        services.AddScoped<GetMyProfileHandler>();
        services.AddScoped<UpdateMyProfileHandler>();
        services.AddScoped<DeleteGardenerHandler>();
        services.AddScoped<RefreshGardenerTokenHandler>();
        services.AddScoped<LogoutGardenerHandler>();

        return services;
    }

    public static IEndpointRouteBuilder MapGardenersEndpoints(this IEndpointRouteBuilder app)
    {
        RegisterGardenerEndpoint.Map(app);
        LoginGardenerEndpoint.Map(app);
        GetMyProfileEndpoint.Map(app);
        UpdateMyProfileEndpoint.Map(app);
        DeleteGardenerEndpoint.Map(app);
        RefreshGardenerTokenEndpoint.Map(app);
        LogoutGardenerEndpoint.Map(app);

        return app;
    }
}