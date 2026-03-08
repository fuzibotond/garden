using System;
using System.Collections.Generic;
using System.Text;

using Microsoft.Extensions.DependencyInjection;

namespace Garden.Modules.Tasks;

public static class ModuleExtensions
{
    public static IServiceCollection AddTasksModule(this IServiceCollection services)
    {
        return services;
    }
}