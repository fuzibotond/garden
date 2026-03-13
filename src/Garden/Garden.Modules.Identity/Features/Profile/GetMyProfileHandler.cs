using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Identity;
using Microsoft.EntityFrameworkCore;

namespace Garden.Modules.Identity.Features.Profile;

public class GetMyProfileHandler
{
    private readonly GardenDbContext _dbContext;
    private readonly ICurrentUser _currentUser;

    public GetMyProfileHandler(
        GardenDbContext dbContext,
        ICurrentUser currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task<GetMyProfileResponse> HandleAsync(CancellationToken cancellationToken = default)
    {
        if (!_currentUser.IsAuthenticated || _currentUser.UserId is null)
            throw new InvalidOperationException("User is not authenticated.");

        // Try gardener profile first
        var gardener = await _dbContext.Gardeners
            .FirstOrDefaultAsync(x => x.Id == _currentUser.UserId.Value, cancellationToken);

        if (gardener is not null)
        {
            // If the user logged out after the token was issued, reject the token
            if (gardener.LastLogoutUtc is not null && _currentUser.IssuedAtUtc is not null)
            {
                if (_currentUser.IssuedAtUtc <= gardener.LastLogoutUtc.Value)
                    throw new InvalidOperationException("User is not authenticated.");
            }

            return new GetMyProfileResponse(
                gardener.Id,
                gardener.Email,
                gardener.CompanyName,
                gardener.CreatedAtUtc
            );
        }

        // If not a gardener, try client profile (clients use the same top-level endpoint)
        var client = await _dbContext.Clients
            .FirstOrDefaultAsync(x => x.Id == _currentUser.UserId.Value, cancellationToken);

        if (client is not null)
        {
            // Clients currently don't have LastLogoutUtc; return profile mapped to same response shape
            return new GetMyProfileResponse(
                client.Id,
                client.Email,
                client.Name,          // map Name -> display field expected by response
                client.CreatedAtUtc
            );
        }

        throw new InvalidOperationException("Gardener profile was not found.");
    }
}
