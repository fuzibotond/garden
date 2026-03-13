namespace Garden.Modules.Identity.Features.Auth;

public record CreateClientRequest(
    string Email,
    string Name
);
