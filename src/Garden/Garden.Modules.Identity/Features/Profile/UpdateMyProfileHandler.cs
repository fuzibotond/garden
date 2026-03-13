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

        if (string.IsNullOrWhiteSpace(request.CompanyName))
            throw new ArgumentException("Company name is required.");

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

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new UpdateMyProfileResponse(
            gardener.Id,
            gardener.Email,
            gardener.CompanyName,
            gardener.CreatedAtUtc
        );
    }
}
