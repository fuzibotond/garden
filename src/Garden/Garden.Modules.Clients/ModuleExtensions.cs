using System;
using System.Collections.Generic;
using System.Text;
using Microsoft.Extensions.DependencyInjection;


namespace Garden.Modules.Clients
{
    public static class ModuleExtensions
    {
        public static IServiceCollection AddClientsModule(this IServiceCollection services)
        {
            return services;
        }
    }
}
