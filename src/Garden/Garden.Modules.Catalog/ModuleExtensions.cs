using Garden.Modules.Catalog.Features.TaskTypes;
using Microsoft.Extensions.DependencyInjection;

namespace Garden.Modules.Catalog;

public static class ModuleExtensions
{
    public static IServiceCollection AddCatalogModule(this IServiceCollection services)
    {
        services.AddScoped<CreateTaskTypeHandler>();
        services.AddScoped<GetTaskTypesHandler>();
        services.AddScoped<DeleteTaskTypeHandler>();

        return services;
    }
}
