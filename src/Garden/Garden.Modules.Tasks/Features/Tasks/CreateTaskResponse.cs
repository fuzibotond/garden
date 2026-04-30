namespace Garden.Modules.Tasks.Features.Tasks;

public record CreateTaskResponse
{
    public Guid TaskId { get; init; }
    public Guid JobId { get; init; }
    public Guid TaskTypeId { get; init; }
    public string Name { get; init; } = default!;
    public string? Description { get; init; }
    public int? EstimatedTimeMinutes { get; init; }
    public decimal? WagePerHour { get; init; }
    public List<TaskMaterialDto> Materials { get; init; } = [];
    public decimal TotalMaterialCost { get; init; }
    public decimal TotalLaborCost { get; init; }
    public decimal TotalCost => TotalMaterialCost + TotalLaborCost;
    public DateTime CreatedAt { get; init; }
}
