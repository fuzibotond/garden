using Garden.Modules.Notifications.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Garden.Modules.Notifications;

public static class ModuleExtensions
{
    public static IServiceCollection AddNotificationsModule(this IServiceCollection services, IConfiguration configuration)
    {
        // Register SMTP email service with configuration
        var smtpOptions = configuration.GetSection("Smtp").Get<SmtpOptions>() ?? new SmtpOptions();
        services.AddSingleton(smtpOptions);
        services.AddSingleton<IEmailService, SmtpEmailService>();

        // Register Expo Push Notification service
        services.AddHttpClient();
        services.AddSingleton<IExpoPushNotificationService, ExpoPushNotificationService>();

        // Register background consumers for email notifications
        services.AddHostedService<InvitationEmailConsumer>();
        services.AddHostedService<ScheduleRequestEmailConsumer>();
        services.AddHostedService<ScheduleStatusChangedConsumer>();

        // Register background consumers for question notifications
        services.AddHostedService<TaskQuestionCreatedConsumer>();
        services.AddHostedService<TaskQuestionAnsweredConsumer>();

        return services;
    }
}
