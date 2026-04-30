namespace Garden.Modules.Tasks.Features.Tasks;

public record UpdateTaskRequest
{
    public Guid TaskId { get; init; }
    public string? Name { get; init; }
    public string? Description { get; init; }
    public int? EstimatedTimeMinutes { get; init; }
    public int? ActualTimeMinutes { get; init; }
    public decimal? WagePerHour { get; init; }
    public DateTime? StartedAt { get; init; }
    public DateTime? FinishedAt { get; init; }
    public List<TaskMaterialInput>? Materials { get; init; }
}
