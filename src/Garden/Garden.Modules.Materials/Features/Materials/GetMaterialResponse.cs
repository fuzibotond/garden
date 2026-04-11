namespace Garden.Modules.Materials.Features.Materials;

public record GetMaterialResponse
{
    public Guid MaterialId { get; init; }
    public string Name { get; init; } = default!;
    public decimal Amount { get; init; }
    public string AmountType { get; init; } = default!;
    public decimal PricePerAmount { get; init; }
    public DateTime CreatedAt { get; init; }
}
