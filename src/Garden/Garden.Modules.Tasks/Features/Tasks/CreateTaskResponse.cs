namespace Garden.Modules.Tasks.Features.Tasks;

public record CreateTaskResponse
{
    public Guid TaskId { get; init; }
    public Guid JobId { get; init; }
    public Guid TaskTypeId { get; init; }
    public string Name { get; init; } = default!;
    public string? Description { get; init; }
    public int? EstimatedTimeMinutes { get; init; }
    public DateTime CreatedAt { get; init; }
}
