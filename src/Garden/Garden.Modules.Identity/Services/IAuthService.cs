namespace Garden.Modules.Identity.Services;

public interface IAuthService
{
    /// <summary>
    /// Authenticate a user by email/password, create and persist a refresh token and return
    /// the authenticated user's id, email, roles and the created refresh token.
    /// </summary>
    Task<(Guid UserId, string Email, IEnumerable<string> Roles, string RefreshToken)>
        AuthenticateAsync(string email, string password, CancellationToken cancellationToken = default);
}
