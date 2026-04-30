namespace Garden.Modules.Tasks.Features.Tasks;

public record TaskMaterialInput
{
    public Guid MaterialId { get; init; }
    public decimal UsedQuantity { get; init; }
}
