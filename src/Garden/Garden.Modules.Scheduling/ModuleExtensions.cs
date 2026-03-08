using System;
using System.Collections.Generic;
using System.Text;
using Microsoft.Extensions.DependencyInjection;

namespace Garden.Modules.Scheduling;

public static class ModuleExtensions
{
    public static IServiceCollection AddSchedulingModule(this IServiceCollection services)
    {
        return services;
    }
}