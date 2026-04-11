namespace Garden.Modules.Catalog.Features.TaskTypes;

public record CreateTaskTypeResponse
{
    public Guid TaskTypeId { get; init; }
    public string Name { get; init; } = default!;
    public DateTime CreatedAt { get; init; }
    public int AssignedToGardenersCount { get; init; }
}
