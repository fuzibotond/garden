namespace Garden.Modules.Identity.Features.Auth;

public record LoginRequest(
    string Email,
    string Password
);
