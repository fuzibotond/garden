using Garden.Modules.Tasks.Features.Tasks;
using Garden.Modules.Tasks.Features.Questions;
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

        // Question handlers
        services.AddScoped<CreateQuestionHandler>();
        services.AddScoped<CreateAnswerHandler>();
        services.AddScoped<GetQuestionsByTaskHandler>();
        services.AddScoped<UploadQuestionMediaHandler>();
        services.AddScoped<UploadAnswerMediaHandler>();

        return services;
    }
}
