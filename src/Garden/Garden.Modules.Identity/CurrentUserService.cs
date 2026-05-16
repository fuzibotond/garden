using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using System.IdentityModel.Tokens.Jwt;
using Garden.BuildingBlocks.Services;

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

    public DateTime? IssuedAtUtc
    {
        get
        {
            var value = _httpContextAccessor.HttpContext?.User?
                .FindFirstValue(JwtRegisteredClaimNames.Iat);

            if (string.IsNullOrEmpty(value)) return null;

            // try parse as epoch seconds
            if (long.TryParse(value, out var epoch))
            {
                try
                {
                    return DateTimeOffset.FromUnixTimeSeconds(epoch).UtcDateTime;
                }
                catch
                {
                    return null;
                }
            }

            // fallback to DateTime parse
            if (DateTime.TryParse(value, out var dt)) return dt.ToUniversalTime();
            return null;
        }
    }

    public IReadOnlyCollection<string> Roles =>
        _httpContextAccessor.HttpContext?.User?.Claims
            .Where(c => c.Type == ClaimTypes.Role)
            .Select(c => c.Value)
            .ToList()
            .AsReadOnly() ?? (IReadOnlyCollection<string>)Array.Empty<string>();
}