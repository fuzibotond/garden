namespace Garden.Modules.Identity;

public interface IRefreshTokenService
{
    string GenerateToken();
}