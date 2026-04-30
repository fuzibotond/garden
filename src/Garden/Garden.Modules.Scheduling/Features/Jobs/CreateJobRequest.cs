namespace Garden.Modules.Scheduling.Features.Jobs;

public record CreateJobRequest
{
    public Guid ClientId { get; init; }
    public string Name { get; init; } = default!;
    public List<Guid>? GardenerIds { get; init; }
}
