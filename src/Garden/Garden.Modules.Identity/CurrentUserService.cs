using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using Microsoft.AspNetCore.Http;

namespace Garden.Modules.Identity;

public class CurrentUserService : ICurrentUser
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid? UserId
    {
        get
        {
            var value = _httpContextAccessor.HttpContext?.User?
                .FindFirstValue(ClaimTypes.NameIdentifier);

            return Guid.TryParse(value, out var id) ? id : null;
        }
    }

    public string? Email =>
        _httpContextAccessor.HttpContext?.User?
            .FindFirstValue(ClaimTypes.Email);

    public bool IsAuthenticated =>
        _httpContextAccessor.HttpContext?.User?.Identity?.IsAuthenticated ?? false;

    public IReadOnlyCollection<string> Roles
    {
        get
        {
            var roles = _httpContextAccessor.HttpContext?.User?
                .FindAll(ClaimTypes.Role)
                .Select(c => c.Value)
                .ToArray();

            return roles ?? Array.Empty<string>();
        }
    }

    public DateTime? IssuedAtUtc
    {
        get
        {
            var value = _httpContextAccessor.HttpContext?.User?
                .FindFirstValue(JwtRegisteredClaimNames.Iat);

            if (string.IsNullOrWhiteSpace(value))
                return null;

            // iat is in seconds since epoch
            if (long.TryParse(value, out var seconds))
            {
                try
                {
                    return DateTimeOffset.FromUnixTimeSeconds(seconds).UtcDateTime;
                }
                catch
                {
                    return null;
                }
            }

            return null;
        }
    }
}