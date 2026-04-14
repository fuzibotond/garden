namespace Garden.Modules.Tasks.Features.Tasks;

public record GetTasksByJobResponse
{
    public List<TaskItemDto> Tasks { get; init; } = [];
    public int Total { get; init; }
}

public record TaskItemDto
{
    public Guid TaskId { get; init; }
    public Guid TaskTypeId { get; init; }
    public string TaskTypeName { get; init; } = default!;
    public string Name { get; init; } = default!;
    public string? Description { get; init; }
    public int? EstimatedTimeMinutes { get; init; }
    public int? ActualTimeMinutes { get; init; }
    public decimal? WagePerHour { get; init; }
    public DateTime? StartedAt { get; init; }
    public DateTime? FinishedAt { get; init; }
    public decimal TotalMaterialCost { get; init; }
    public decimal TotalLaborCost { get; init; }
    public decimal TotalCost => TotalMaterialCost + TotalLaborCost;
    public DateTime CreatedAt { get; init; }
}
