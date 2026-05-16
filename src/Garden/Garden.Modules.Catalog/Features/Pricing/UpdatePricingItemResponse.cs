namespace Garden.Modules.Catalog.Features.Pricing;

public record UpdatePricingItemResponse
{
    public Guid PricingItemId { get; init; }
    public string Name { get; init; } = default!;
    public string? Description { get; init; }
    public List<PricingConditionDto> Conditions { get; init; } = [];
    public decimal PriceAmount { get; init; }
    public string PriceUnit { get; init; } = default!;
    public DateTime UpdatedAt { get; init; }
}