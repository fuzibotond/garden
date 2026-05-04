namespace Garden.Modules.Gardeners.Features.UpdateMyProfile;

public record UpdateMyProfileResponse(
    Guid GardenerId,
    string Email,
    string CompanyName,
    DateTime CreatedAtUtc
);