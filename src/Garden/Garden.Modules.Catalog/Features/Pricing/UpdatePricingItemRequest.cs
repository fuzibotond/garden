namespace Garden.Modules.Catalog.Features.Pricing;

public record UpdatePricingItemRequest
{
    public Guid PricingItemId { get; init; }
    public string? Name { get; init; }
    public string? Description { get; init; }
    public List<PricingConditionDto>? Conditions { get; init; }
    public decimal? PriceAmount { get; init; }
    public string? PriceUnit { get; init; }
}