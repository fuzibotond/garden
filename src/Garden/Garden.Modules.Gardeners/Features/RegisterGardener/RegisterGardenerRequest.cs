namespace Garden.Modules.Gardeners.Features.RegisterGardener;

public record RegisterGardenerRequest(
    string Email,
    string Password,
    string CompanyName
);