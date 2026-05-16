using System.Text.Json;
using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.BuildingBlocks.Services;

namespace Garden.Modules.Catalog.Features.Pricing;

public class UpdatePricingItemHandler
{
    private readonly GardenDbContext _dbContext;
    private readonly ICurrentUser _currentUser;

    public UpdatePricingItemHandler(GardenDbContext dbContext, ICurrentUser currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task<UpdatePricingItemResponse?> Handle(UpdatePricingItemRequest request)
    {
        var userId = _currentUser.UserId;
        if (!userId.HasValue || userId == Guid.Empty)
            throw new UnauthorizedAccessException("User not authenticated");

        var record = await _dbContext.PricingItems.FindAsync(request.PricingItemId);
        if (record == null || record.GardenerId != userId.Value)
            return null;

        if (request.Name != null) record.Name = request.Name;
        if (request.Description != null) record.Description = request.Description;
        if (request.PriceAmount.HasValue) record.PriceAmount = request.PriceAmount.Value;
        if (request.PriceUnit != null) record.PriceUnit = request.PriceUnit;
        if (request.Conditions != null)
            record.Conditions = request.Conditions.Count > 0
                ? JsonSerializer.Serialize(request.Conditions)
                : null;

        record.UpdatedAtUtc = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();

        var conditions = string.IsNullOrEmpty(record.Conditions)
            ? new List<PricingConditionDto>()
            : JsonSerializer.Deserialize<List<PricingConditionDto>>(record.Conditions) ?? [];

        return new UpdatePricingItemResponse
        {
            PricingItemId = record.Id,
            Name = record.Name,
            Description = record.Description,
            Conditions = conditions,
            PriceAmount = record.PriceAmount,
            PriceUnit = record.PriceUnit,
            UpdatedAt = record.UpdatedAtUtc
        };
    }
}
