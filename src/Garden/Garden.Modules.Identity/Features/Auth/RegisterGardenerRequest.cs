namespace Garden.Modules.Identity.Features.Auth;

public record RegisterGardenerRequest(
    string Email,
    string Password,
    string CompanyName
);
