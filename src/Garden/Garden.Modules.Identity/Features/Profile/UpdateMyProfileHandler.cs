using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Identity;
using Microsoft.EntityFrameworkCore;

namespace Garden.Modules.Identity.Features.Profile;

public class UpdateMyProfileHandler
{
    private readonly GardenDbContext _dbContext;
    private readonly ICurrentUser _currentUser;

    public UpdateMyProfileHandler(
        GardenDbContext dbContext,
        ICurrentUser currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task<UpdateMyProfileResponse> HandleAsync(UpdateMyProfileRequest request, CancellationToken cancellationToken = default)
    {
        if (!_currentUser.IsAuthenticated || _currentUser.UserId is null)
            throw new InvalidOperationException("User is not authenticated.");

        if (_currentUser.Roles.Contains("Client"))
        {
            var clients = await _dbContext.Clients
            .FirstOrDefaultAsync(x => x.Id == _currentUser.UserId.Value, cancellationToken);

            if (clients is null)
                throw new InvalidOperationException("Client profile was not found.");

            // If the user logged out after the token was issued, reject the token
            if (clients.LastLogoutUtc is not null && _currentUser.IssuedAtUtc is not null)
            {
                if (_currentUser.IssuedAtUtc <= clients.LastLogoutUtc.Value)
                    throw new InvalidOperationException("User is not authenticated.");
            }

            clients.Name = request.Name.Trim();

            await _dbContext.SaveChangesAsync(cancellationToken);

            return new UpdateMyProfileResponse(
                clients.Id,
                clients.Email,
                "",
                clients.Name,
                clients.CreatedAtUtc
            );
        }
        else
        {
            var gardener = await _dbContext.Gardeners
            .FirstOrDefaultAsync(x => x.Id == _currentUser.UserId.Value, cancellationToken);

            if (gardener is null)
                throw new InvalidOperationException("Gardener profile was not found.");

            // If the user logged out after the token was issued, reject the token
            if (gardener.LastLogoutUtc is not null && _currentUser.IssuedAtUtc is not null)
            {
                if (_currentUser.IssuedAtUtc <= gardener.LastLogoutUtc.Value)
                    throw new InvalidOperationException("User is not authenticated.");
            }

            gardener.CompanyName = request.CompanyName.Trim();
            gardener.Name = request.Name.Trim();

            await _dbContext.SaveChangesAsync(cancellationToken);

            return new UpdateMyProfileResponse(
                gardener.Id,
                gardener.Email,
                gardener.CompanyName,
                gardener.Name,
                gardener.CreatedAtUtc
            );
        }
        
    }
}
