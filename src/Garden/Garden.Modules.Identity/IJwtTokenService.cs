namespace Garden.Modules.Identity;

public interface IJwtTokenService
{
    // Backwards-compatible two-argument token generator. Implementers that only
    // provide a simple token can implement this overload.
    string GenerateToken(Guid userId, string email);

    // New three-argument generator accepting roles. By default it delegates to
    // the two-argument overload so existing implementations that only implement
    // the old API continue working.
    string GenerateToken(Guid userId, string email, IEnumerable<string> roles)
        => GenerateToken(userId, email);
}
