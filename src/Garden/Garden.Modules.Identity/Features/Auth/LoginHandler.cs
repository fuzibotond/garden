using Garden.Modules.Identity.Services;

namespace Garden.Modules.Identity.Features.Auth;

public class LoginHandler
{
    private readonly IAuthService _authService;
    private readonly IJwtTokenService _jwtTokenService;

    public LoginHandler(IAuthService authService, IJwtTokenService jwtTokenService)
    {
        _authService = authService;
        _jwtTokenService = jwtTokenService;
    }

    public async Task<LoginResponse> HandleAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            throw new ArgumentException("Email is required.");

        if (string.IsNullOrWhiteSpace(request.Password))
            throw new ArgumentException("Password is required.");

        var email = request.Email.Trim().ToLowerInvariant();

        var authResult = await _authService.AuthenticateAsync(email, request.Password, cancellationToken);

        var accessToken = _jwtTokenService.GenerateToken(authResult.UserId, authResult.Email, authResult.Roles);

        return new LoginResponse(accessToken, authResult.RefreshToken);
    }
}
