using System.Text.Json;
using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.BuildingBlocks.Services;

namespace Garden.Modules.Catalog.Features.Pricing;

public class CreatePricingItemHandler
{
    private readonly GardenDbContext _dbContext;
    private readonly ICurrentUser _currentUser;

    public CreatePricingItemHandler(GardenDbContext dbContext, ICurrentUser currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task<CreatePricingItemResponse> Handle(CreatePricingItemRequest request)
    {
        var userId = _currentUser.UserId;
        if (!userId.HasValue || userId == Guid.Empty)
            throw new UnauthorizedAccessException("User not authenticated");

        var now = DateTime.UtcNow;
        var id = Guid.NewGuid();
        var conditionsJson = request.Conditions.Count > 0
            ? JsonSerializer.Serialize(request.Conditions)
            : null;

        var record = new PricingItemRecord
        {
            Id = id,
            GardenerId = userId.Value,
            Name = request.Name,
            Description = request.Description,
            Conditions = conditionsJson,
            PriceAmount = request.PriceAmount,
            PriceUnit = request.PriceUnit,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };

        _dbContext.PricingItems.Add(record);
        await _dbContext.SaveChangesAsync();

        return new CreatePricingItemResponse
        {
            PricingItemId = id,
            Name = record.Name,
            Description = record.Description,
            Conditions = request.Conditions,
            PriceAmount = record.PriceAmount,
            PriceUnit = record.PriceUnit,
            CreatedAt = now
        };
    }
}
