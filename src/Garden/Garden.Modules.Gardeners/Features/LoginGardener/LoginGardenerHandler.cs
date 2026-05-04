using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Garden.Modules.Gardeners.Features.LoginGardener;

public class LoginGardenerHandler
{
    private readonly GardenDbContext _dbContext;
    private readonly IPasswordHasher<GardenerRecord> _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IRefreshTokenService _refreshTokenService;

    public LoginGardenerHandler(
        GardenDbContext dbContext,
        IPasswordHasher<GardenerRecord> passwordHasher,
        IJwtTokenService jwtTokenService,
        IRefreshTokenService refreshTokenService)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
        _refreshTokenService = refreshTokenService;
    }

    public async Task<LoginGardenerResponse> HandleAsync(
        LoginGardenerRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            throw new ArgumentException("EMAIL is required.");

        if (string.IsNullOrWhiteSpace(request.Password))
            throw new ArgumentException("Password is required.");

        var email = request.Email.Trim().ToLowerInvariant();

        var gardener = await _dbContext.Gardeners
            .FirstOrDefaultAsync(x => x.Email == email, cancellationToken);

        if (gardener is null)
            throw new InvalidOperationException("Invalid credentials.");

        var result = _passwordHasher.VerifyHashedPassword(
            gardener,
            gardener.PasswordHash,
            request.Password);

        if (result == PasswordVerificationResult.Failed)
            throw new InvalidOperationException("Invalid credentials.");

        var accessToken = _jwtTokenService.GenerateToken(gardener.Id, gardener.Email);
        var refreshToken = _refreshTokenService.GenerateToken();

        var refreshTokenRecord = new RefreshTokenRecord
        {
            Id = Guid.NewGuid(),
            GardenerId = gardener.Id,
            Token = refreshToken,
            CreatedAtUtc = DateTime.UtcNow,
            ExpiresAtUtc = DateTime.UtcNow.AddDays(7)
        };

        _dbContext.RefreshTokens.Add(refreshTokenRecord);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new LoginGardenerResponse(accessToken, refreshToken);
    }
}