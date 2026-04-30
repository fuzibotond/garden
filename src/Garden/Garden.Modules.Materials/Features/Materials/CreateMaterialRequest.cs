namespace Garden.Modules.Materials.Features.Materials;

public record CreateMaterialRequest
{
    public string Name { get; init; } = default!;
    public string AmountType { get; init; } = default!;
    public decimal PricePerAmount { get; init; }
}
