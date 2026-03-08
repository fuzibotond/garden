using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Identity;
using Microsoft.EntityFrameworkCore;

namespace Garden.Modules.Gardeners.Features.GetMyProfile;

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

        var gardener = await _dbContext.Gardeners
            .FirstOrDefaultAsync(x => x.Id == _currentUser.UserId.Value, cancellationToken);

        if (gardener is null)
            throw new InvalidOperationException("Gardener profile was not found.");

        return new GetMyProfileResponse(
            gardener.Id,
            gardener.Email,
            gardener.CompanyName,
            gardener.CreatedAtUtc
        );
    }
}