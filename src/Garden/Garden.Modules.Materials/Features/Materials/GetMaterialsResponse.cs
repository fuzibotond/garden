namespace Garden.Modules.Materials.Features.Materials;

public record GetMaterialsResponse
{
    public List<MaterialItemDto> Materials { get; init; } = [];
    public int Total { get; init; }
}

public record MaterialItemDto
{
    public Guid MaterialId { get; init; }
    public string Name { get; init; } = default!;
    public string AmountType { get; init; } = default!;
    public decimal PricePerAmount { get; init; }
}
