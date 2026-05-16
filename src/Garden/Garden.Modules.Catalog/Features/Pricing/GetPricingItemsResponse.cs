namespace Garden.Modules.Catalog.Features.Pricing;

public record PricingConditionDto
{
    public string Key { get; init; } = default!;
    public string Value { get; init; } = default!;
}

public record PricingItemDto
{
    public Guid PricingItemId { get; init; }
    public string Name { get; init; } = default!;
    public string? Description { get; init; }
    public List<PricingConditionDto> Conditions { get; init; } = [];
    public decimal PriceAmount { get; init; }
    public string PriceUnit { get; init; } = default!;
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record GetPricingItemsResponse
{
    public List<PricingItemDto> Items { get; init; } = [];
    public int Total { get; init; }
    public int Page { get; init; }
    public int PageSize { get; init; }
}