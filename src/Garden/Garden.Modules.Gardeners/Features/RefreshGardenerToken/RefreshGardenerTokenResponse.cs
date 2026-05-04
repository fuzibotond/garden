namespace Garden.Modules.Gardeners.Features.RefreshGardenerToken;

public record RefreshGardenerTokenResponse(
    string AccessToken,
    string RefreshToken
);