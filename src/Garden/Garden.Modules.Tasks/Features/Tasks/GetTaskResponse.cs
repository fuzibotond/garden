namespace Garden.Modules.Tasks.Features.Tasks;

public record GetTaskResponse
{
    public Guid TaskId { get; init; }
    public Guid JobId { get; init; }
    public Guid TaskTypeId { get; init; }
    public string Name { get; init; } = default!;
    public string? Description { get; init; }
    public int? EstimatedTimeMinutes { get; init; }
    public int? ActualTimeMinutes { get; init; }
    public DateTime? StartedAt { get; init; }
    public DateTime? FinishedAt { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}
