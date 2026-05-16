using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.BuildingBlocks.Services;

namespace Garden.Modules.Catalog.Features.Pricing;

public class DeletePricingItemHandler
{
    private readonly GardenDbContext _dbContext;
    private readonly ICurrentUser _currentUser;

    public DeletePricingItemHandler(GardenDbContext dbContext, ICurrentUser currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task<bool> Handle(Guid pricingItemId)
    {
        var userId = _currentUser.UserId;
        if (!userId.HasValue || userId == Guid.Empty)
            throw new UnauthorizedAccessException("User not authenticated");

        var record = await _dbContext.PricingItems.FindAsync(pricingItemId);
        if (record == null || record.GardenerId != userId.Value)
            return false;

        _dbContext.PricingItems.Remove(record);
        await _dbContext.SaveChangesAsync();
        return true;
    }
}
