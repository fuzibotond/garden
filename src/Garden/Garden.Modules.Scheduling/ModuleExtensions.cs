using Garden.Modules.Scheduling.Features.Invoice;
using Garden.Modules.Scheduling.Features.Jobs;
using Garden.Modules.Scheduling.Features.TaskScheduling;
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
        services.AddScoped<CloseJobHandler>();
        services.AddScoped<GetInvoiceHandler>();

        services.AddScoped<ScheduleTaskHandler>();
        services.AddScoped<GetGardenerCalendarHandler>();
        services.AddScoped<GetClientCalendarHandler>();
        services.AddScoped<ApproveScheduleHandler>();
        services.AddScoped<DeclineScheduleHandler>();
        services.AddScoped<ProposeAlternativeTimeHandler>();
        services.AddScoped<RescheduleTaskHandler>();

        return services;
    }
}
