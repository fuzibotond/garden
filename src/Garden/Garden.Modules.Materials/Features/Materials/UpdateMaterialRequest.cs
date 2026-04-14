namespace Garden.Modules.Materials.Features.Materials;

public record UpdateMaterialRequest
{
    public Guid MaterialId { get; init; }
    public string? Name { get; init; }
    public string? AmountType { get; init; }
    public decimal? PricePerAmount { get; init; }
}
