namespace Garden.Modules.Gardeners.Features.LoginGardener;

public record LoginGardenerRequest(
    string Email,
    string Password
);