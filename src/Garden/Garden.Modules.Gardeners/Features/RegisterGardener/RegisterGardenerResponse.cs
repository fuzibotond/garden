namespace Garden.Modules.Gardeners.Features.RegisterGardener;

public record RegisterGardenerResponse(
    Guid GardenerId,
    string Email,
    string CompanyName
);