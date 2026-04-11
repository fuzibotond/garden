using Garden.Modules.Scheduling.Features.Jobs;
using Microsoft.Extensions.DependencyInjection;

namespace Garden.Modules.Scheduling;

public static class ModuleExtensions
{
    public static IServiceCollection AddSchedulingModule(this IServiceCollection services)
    {
        services.AddScoped<CreateJobHandler>();
        services.AddScoped<GetJobHandler>();
        services.AddScoped<GetJobsHandler>();
        services.AddScoped<UpdateJobHandler>();
        services.AddScoped<DeleteJobHandler>();

        return services;
    }
}