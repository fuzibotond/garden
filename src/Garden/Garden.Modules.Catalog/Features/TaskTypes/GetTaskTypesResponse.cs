namespace Garden.Modules.Catalog.Features.TaskTypes;

public record TaskTypeDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = default!;
}

public record GetTaskTypesResponse
{
    public List<TaskTypeDto> TaskTypes { get; init; } = [];
}
