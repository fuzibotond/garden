using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
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
        services.AddScoped<ICurrentUser, CurrentUserService>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IRefreshTokenService, RefreshTokenService>();

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
}