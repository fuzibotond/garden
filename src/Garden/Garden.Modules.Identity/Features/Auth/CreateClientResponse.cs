namespace Garden.Modules.Identity.Features.Auth;

public record CreateClientResponse(
    string Email,
    string Password
);
