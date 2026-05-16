using Garden.Modules.Catalog.Features.Pricing;
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

        services.AddScoped<CreatePricingItemHandler>();
        services.AddScoped<GetPricingItemsHandler>();
        services.AddScoped<UpdatePricingItemHandler>();
        services.AddScoped<DeletePricingItemHandler>();

        return services;
    }
}
