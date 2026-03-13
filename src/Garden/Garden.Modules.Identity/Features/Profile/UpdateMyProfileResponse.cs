namespace Garden.Modules.Identity.Features.Profile;

public record UpdateMyProfileResponse(
    Guid GardenerId,
    string Email,
    string CompanyName,
    DateTime CreatedAtUtc
);
