using Garden.Modules.Materials.Features.Materials;
using Microsoft.Extensions.DependencyInjection;

namespace Garden.Modules.Materials;

public static class ModuleExtensions
{
    public static IServiceCollection AddMaterialsModule(this IServiceCollection services)
    {
        services.AddScoped<CreateMaterialHandler>();
        services.AddScoped<GetMaterialHandler>();
        services.AddScoped<GetMaterialsHandler>();
        services.AddScoped<UpdateMaterialHandler>();
        services.AddScoped<DeleteMaterialHandler>();

        return services;
    }
}
