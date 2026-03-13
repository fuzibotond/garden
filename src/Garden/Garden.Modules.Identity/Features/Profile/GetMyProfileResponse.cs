namespace Garden.Modules.Identity.Features.Profile;

public record GetMyProfileResponse(
    Guid GardenerId,
    string Email,
    string CompanyName,
    DateTime CreatedAtUtc
);
