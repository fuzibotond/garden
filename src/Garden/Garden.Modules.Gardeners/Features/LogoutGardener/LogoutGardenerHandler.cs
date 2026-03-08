using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Identity;
using Microsoft.EntityFrameworkCore;

namespace Garden.Modules.Gardeners.Features.LogoutGardener;

public class LogoutGardenerHandler
{
    private readonly GardenDbContext _dbContext;
    private readonly ICurrentUser _currentUser;

    public LogoutGardenerHandler(
        GardenDbContext dbContext,
        ICurrentUser currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task<LogoutGardenerResponse> HandleAsync(CancellationToken cancellationToken = default)
    {
        if (!_currentUser.IsAuthenticated || _currentUser.UserId is null)
            throw new InvalidOperationException("User is not authenticated.");

        var tokens = await _dbContext.RefreshTokens
            .Where(x => x.GardenerId == _currentUser.UserId.Value && x.RevokedAtUtc == null)
            .ToListAsync(cancellationToken);

        foreach (var token in tokens)
            token.RevokedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new LogoutGardenerResponse("Logged out successfully.");
    }
}