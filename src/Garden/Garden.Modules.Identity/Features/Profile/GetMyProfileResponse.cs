namespace Garden.Modules.Identity.Features.Profile;

public record GetMyProfileResponse(
    Guid GardenerId,
    string Email,
    string Name,
    string CompanyName,
    DateTime CreatedAtUtc
);
