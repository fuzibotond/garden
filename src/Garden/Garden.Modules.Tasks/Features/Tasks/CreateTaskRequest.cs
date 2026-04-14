namespace Garden.Modules.Tasks.Features.Tasks;

public record CreateTaskRequest
{
    public Guid JobId { get; init; }
    public Guid TaskTypeId { get; init; }
    public string Name { get; init; } = default!;
    public string? Description { get; init; }
    public int? EstimatedTimeMinutes { get; init; }
    public decimal? WagePerHour { get; init; }
    public List<TaskMaterialInput>? Materials { get; init; }
}
