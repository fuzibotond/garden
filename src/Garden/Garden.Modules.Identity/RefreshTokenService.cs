using System.Security.Cryptography;

namespace Garden.Modules.Identity;

public class RefreshTokenService : IRefreshTokenService
{
    public string GenerateToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes);
    }
}