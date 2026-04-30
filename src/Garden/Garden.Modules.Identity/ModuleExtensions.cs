using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Garden.Modules.Identity.Features.Auth;
using Microsoft.AspNetCore.Routing;

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
        services.AddScoped<ICurrentUser, CurrentUserService>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IRefreshTokenService, RefreshTokenService>();

        // Password hasher for clients
        services.AddScoped<Microsoft.AspNetCore.Identity.IPasswordHasher<Garden.BuildingBlocks.Infrastructure.Persistence.ClientRecord>, Microsoft.AspNetCore.Identity.PasswordHasher<Garden.BuildingBlocks.Infrastructure.Persistence.ClientRecord>>();

        // Shared auth handlers and services
        services.AddScoped<LoginHandler>();
        services.AddScoped<RegisterGardenerHandler>();
        services.AddScoped<CreateClientHandler>();
        services.AddScoped<Features.Profile.GetMyProfileHandler>();
        services.AddScoped<Features.Profile.DeleteGardenerHandler>();
        services.AddScoped<Features.Profile.UpdateMyProfileHandler>();
        services.AddScoped<Features.Auth.LogoutHandler>();
        services.AddScoped<Features.PushNotifications.RegisterPushTokenHandler>();
        services.AddScoped<Services.IAuthService, Services.AuthService>();

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
        AuthLoginEndpoint.Map(app);
        RegisterGardenerEndpoint.Map(app);
        CreateClientEndpoint.Map(app);
        Features.Profile.GetMyProfileEndpoint.Map(app);
        Features.Profile.UpdateMyProfileEndpoint.Map(app);
        Features.Profile.DeleteGardenerEndpoint.Map(app);
        Features.Auth.LogoutEndpoint.Map(app);
        return app;
    }
}