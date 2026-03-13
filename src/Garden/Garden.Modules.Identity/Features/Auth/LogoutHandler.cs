using Garden.BuildingBlocks.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Garden.Modules.Identity.Features.Auth;

public class LogoutHandler
{
    private readonly GardenDbContext _dbContext;
    private readonly ICurrentUser _currentUser;

    public LogoutHandler(GardenDbContext dbContext, ICurrentUser currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task<LogoutGardenerResponse> HandleAsync(CancellationToken cancellationToken = default)
    {
        if (!_currentUser.IsAuthenticated || _currentUser.UserId is null)
            throw new InvalidOperationException("User is not authenticated.");

        // Revoke all refresh tokens for this user
        var tokens = _dbContext.RefreshTokens.Where(x => x.GardenerId == _currentUser.UserId.Value && x.RevokedAtUtc == null);
        foreach (var t in tokens)
        {
            t.RevokedAtUtc = DateTime.UtcNow;
        }

        // Mark last logout time so access tokens issued before this are invalidated
        var gardener = await _dbContext.Gardeners.FirstOrDefaultAsync(x => x.Id == _currentUser.UserId.Value, cancellationToken);
        if (gardener is not null)
        {
            gardener.LastLogoutUtc = DateTime.UtcNow;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new LogoutGardenerResponse("Logged out successfully");
    }
}
