using Garden.Modules.Tasks.Features.Tasks;
using Microsoft.Extensions.DependencyInjection;

namespace Garden.Modules.Tasks;

public static class ModuleExtensions
{
    public static IServiceCollection AddTasksModule(this IServiceCollection services)
    {
        services.AddScoped<CreateTaskHandler>();
        services.AddScoped<GetTaskHandler>();
        services.AddScoped<UpdateTaskHandler>();
        services.AddScoped<DeleteTaskHandler>();
        services.AddScoped<GetTasksByJobHandler>();

        return services;
    }
}