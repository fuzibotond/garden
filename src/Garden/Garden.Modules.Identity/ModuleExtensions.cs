using System.Text;
using Garden.Modules.Identity.Features.Auth;
using Garden.Modules.Identity.Features.Profile;
using Garden.Modules.Identity.Features.PushNotifications;
using Garden.Modules.Identity.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace Garden.Modules.Identity;

public static class ModuleExtensions
{
    public static IServiceCollection AddIdentityModule(this IServiceCollection services, IConfiguration configuration)
    {
        var jwtKey = configuration["Jwt:Key"];
        if (string.IsNullOrWhiteSpace(jwtKey))
        {
            // No key configured (e.g. Railway service started without env vars set yet).
            // Generate an ephemeral key so the process starts and /health/live responds.
            // Tokens signed with this key will not survive restarts.
            // Fix: set the Jwt__Key environment variable in Railway → redeploy.
            jwtKey = Convert.ToBase64String(
                System.Security.Cryptography.RandomNumberGenerator.GetBytes(64));
            Console.WriteLine(
                "[WARN] Jwt:Key is not configured. Using an ephemeral random key. " +
                "Tokens will not survive restarts. Set the Jwt__Key environment variable.");
        }

        var jwtIssuer = configuration["Jwt:Issuer"] ?? "Garden.Api";
        var jwtAudience = configuration["Jwt:Audience"] ?? "Garden.App";

        services.AddHttpContextAccessor();
        services.AddScoped<Garden.BuildingBlocks.Services.ICurrentUser, CurrentUserService>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IRefreshTokenService, RefreshTokenService>();
       services.AddScoped<IAuthService, AuthService>();

        // Auth handlers
        services.AddScoped<LoginHandler>();
        services.AddScoped<LogoutHandler>();
        services.AddScoped<RegisterGardenerHandler>();
        services.AddScoped<CreateClientHandler>();

        // Profile handlers
        services.AddScoped<GetMyProfileHandler>();
        services.AddScoped<UpdateMyProfileHandler>();
        services.AddScoped<DeleteGardenerHandler>();

        // Push notification handlers
        services.AddScoped<RegisterPushTokenHandler>();

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwtIssuer,
                    ValidateAudience = true,
                    ValidAudience = jwtAudience,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero
                };
            });

        services.AddAuthorization();

        return services;
    }

    public static IEndpointRouteBuilder MapIdentityEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api");
        RegisterGardenerEndpoint.Map(group);
        CreateClientEndpoint.Map(group);
        AuthLoginEndpoint.Map(group);
        LogoutEndpoint.Map(group);
        GetMyProfileEndpoint.Map(group);
        UpdateMyProfileEndpoint.Map(group);
        DeleteGardenerEndpoint.Map(group);

        return app;
    }
}