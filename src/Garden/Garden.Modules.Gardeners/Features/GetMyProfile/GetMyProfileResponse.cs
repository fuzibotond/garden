namespace Garden.Modules.Gardeners.Features.GetMyProfile;

public record GetMyProfileResponse(
    Guid GardenerId,
    string Email,
    string CompanyName,
    DateTime CreatedAtUtc
);