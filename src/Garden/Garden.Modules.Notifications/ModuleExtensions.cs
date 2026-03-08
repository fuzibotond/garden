using System;
using System.Collections.Generic;
using System.Text;

using Microsoft.Extensions.DependencyInjection;

namespace Garden.Modules.Notifications;

public static class ModuleExtensions
{
    public static IServiceCollection AddNotificationsModule(this IServiceCollection services)
    {
        return services;
    }
}