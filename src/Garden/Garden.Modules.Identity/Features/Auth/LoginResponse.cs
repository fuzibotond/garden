namespace Garden.Modules.Identity.Features.Auth;

public record LoginResponse(
    string AccessToken,
    string RefreshToken
);
