namespace Garden.Modules.Tasks.Features.Tasks;

public record TaskMaterialDto
{
    public Guid MaterialId { get; init; }
    public string Name { get; init; } = default!;
    public string AmountType { get; init; } = default!;
    public decimal UsedQuantity { get; init; }
    public decimal PricePerAmount { get; init; }
    public decimal TotalCost { get; init; }
}
