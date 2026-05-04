namespace Garden.Modules.Gardeners.Features.LoginGardener;

public record LoginGardenerResponse(
    string AccessToken,
    string RefreshToken
);