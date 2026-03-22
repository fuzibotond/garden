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

        // Register background consumer for invitation emails
        services.AddHostedService<InvitationEmailConsumer>();

        return services;
    }
}
