namespace Garden.Modules.Identity;

public interface IJwtTokenService
{
    string GenerateToken(Guid userId, string email);
}