using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Identity;
using Microsoft.EntityFrameworkCore;

namespace Garden.Modules.Gardeners.Features.RefreshGardenerToken;

public class RefreshGardenerTokenHandler
{
    private readonly GardenDbContext _dbContext;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IRefreshTokenService _refreshTokenService;

    public RefreshGardenerTokenHandler(
        GardenDbContext dbContext,
        IJwtTokenService jwtTokenService,
        IRefreshTokenService refreshTokenService)
    {
        _dbContext = dbContext;
        _jwtTokenService = jwtTokenService;
        _refreshTokenService = refreshTokenService;
    }

    public async Task<RefreshGardenerTokenResponse> HandleAsync(
        RefreshGardenerTokenRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
            throw new ArgumentException("Refresh token is required.");

        var existingToken = await _dbContext.RefreshTokens
            .FirstOrDefaultAsync(x => x.Token == request.RefreshToken, cancellationToken);

        if (existingToken is null ||
            existingToken.RevokedAtUtc is not null ||
            existingToken.ExpiresAtUtc <= DateTime.UtcNow)
        {
            throw new InvalidOperationException("Invalid refresh token.");
        }

        var gardener = await _dbContext.Gardeners
            .FirstOrDefaultAsync(x => x.Id == existingToken.GardenerId, cancellationToken);

        if (gardener is null)
            throw new InvalidOperationException("Gardener not found.");

        existingToken.RevokedAtUtc = DateTime.UtcNow;

        var newRefreshToken = _refreshTokenService.GenerateToken();
        var newRefreshTokenRecord = new RefreshTokenRecord
        {
            Id = Guid.NewGuid(),
            GardenerId = gardener.Id,
            Token = newRefreshToken,
            CreatedAtUtc = DateTime.UtcNow,
            ExpiresAtUtc = DateTime.UtcNow.AddDays(7)
        };

        _dbContext.RefreshTokens.Add(newRefreshTokenRecord);

        var newAccessToken = _jwtTokenService.GenerateToken(gardener.Id, gardener.Email);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new RefreshGardenerTokenResponse(newAccessToken, newRefreshToken);
    }
}