namespace Garden.Modules.Catalog.Features.TaskTypes;

public record CreateTaskTypeRequest
{
    public string Name { get; init; } = default!;
    public List<Guid>? GardenerIds { get; init; } // If empty/null, will be assigned to all gardeners
}
