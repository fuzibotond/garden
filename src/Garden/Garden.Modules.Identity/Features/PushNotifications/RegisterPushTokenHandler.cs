using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Identity;
using Microsoft.EntityFrameworkCore;

namespace Garden.Modules.Identity.Features.PushNotifications;

public class RegisterPushTokenHandler
{
    private readonly GardenDbContext _dbContext;
    private readonly ICurrentUser _currentUser;

    public RegisterPushTokenHandler(
        GardenDbContext dbContext,
        ICurrentUser currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task HandleAsync(RegisterPushTokenRequest request, CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.UserId ?? throw new UnauthorizedAccessException("User is not authenticated");
        var roles = _currentUser.Roles;

        if (roles.Contains(Roles.Gardener))
        {
            var gardener = await _dbContext.Gardeners
                .FirstOrDefaultAsync(g => g.Id == userId, cancellationToken);

            if (gardener is null)
                throw new InvalidOperationException("Gardener not found");

            gardener.ExpoPushToken = request.ExpoPushToken;
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        else if (roles.Contains(Roles.Client))
        {
            var client = await _dbContext.Clients
                .FirstOrDefaultAsync(c => c.Id == userId, cancellationToken);

            if (client is null)
                throw new InvalidOperationException("Client not found");

            client.ExpoPushToken = request.ExpoPushToken;
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        else
        {
            throw new UnauthorizedAccessException("Invalid user role");
        }
    }
}
