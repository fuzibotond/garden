namespace Garden.Modules.Identity.Features.Profile;

public record UpdateMyProfileResponse(
    Guid GardenerId,
    string Email,
    string CompanyName,
    string Name,
    DateTime CreatedAtUtc
);
