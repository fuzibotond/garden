using System.Text.Json;
using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.BuildingBlocks.Services;
using Microsoft.EntityFrameworkCore;

namespace Garden.Modules.Catalog.Features.Pricing;

public class GetPricingItemsHandler
{
    private readonly GardenDbContext _dbContext;
    private readonly ICurrentUser _currentUser;

    public GetPricingItemsHandler(GardenDbContext dbContext, ICurrentUser currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task<GetPricingItemsResponse> Handle(int page, int pageSize)
    {
        var userId = _currentUser.UserId;
        if (!userId.HasValue || userId == Guid.Empty)
            throw new UnauthorizedAccessException("User not authenticated");

        var query = _dbContext.PricingItems
            .Where(p => p.GardenerId == userId.Value)
            .OrderByDescending(p => p.CreatedAtUtc);

        var total = await query.CountAsync();
        var records = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var items = records.Select(r => ToDto(r)).ToList();

        return new GetPricingItemsResponse
        {
            Items = items,
            Total = total,
            Page = page,
            PageSize = pageSize
        };
    }

    internal static PricingItemDto ToDto(PricingItemRecord r)
    {
        var conditions = string.IsNullOrEmpty(r.Conditions)
            ? new List<PricingConditionDto>()
            : JsonSerializer.Deserialize<List<PricingConditionDto>>(r.Conditions) ?? [];

        return new PricingItemDto
        {
            PricingItemId = r.Id,
            Name = r.Name,
            Description = r.Description,
            Conditions = conditions,
            PriceAmount = r.PriceAmount,
            PriceUnit = r.PriceUnit,
            CreatedAt = r.CreatedAtUtc,
            UpdatedAt = r.UpdatedAtUtc
        };
    }
}
