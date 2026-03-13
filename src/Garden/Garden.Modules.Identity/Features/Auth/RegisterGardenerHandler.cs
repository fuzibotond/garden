using Garden.BuildingBlocks.Services;

namespace Garden.Modules.Identity.Features.Auth;

public class RegisterGardenerHandler
{
    private readonly IGardenerRegistrationService _gardenerRegistrationService;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IRefreshTokenService _refreshTokenService;

    public RegisterGardenerHandler(
        IGardenerRegistrationService gardenerRegistrationService,
        IJwtTokenService jwtTokenService,
        IRefreshTokenService refreshTokenService)
    {
        _gardenerRegistrationService = gardenerRegistrationService;
        _jwtTokenService = jwtTokenService;
        _refreshTokenService = refreshTokenService;
    }

    public async Task<LoginResponse> HandleAsync(RegisterGardenerRequest request, CancellationToken cancellationToken = default)
    {
        var gardener = await _gardenerRegistrationService.RegisterAsync(request.Email, request.Password, request.CompanyName, cancellationToken);

        var roles = new[] { Roles.Gardener };
        var accessToken = _jwtTokenService.GenerateToken(gardener.Id, gardener.Email, roles);
        var refreshToken = _refreshTokenService.GenerateToken();

        await _gardenerRegistrationService.AddRefreshTokenAsync(gardener.Id, refreshToken, cancellationToken);

        return new LoginResponse(accessToken, refreshToken);
    }
}
