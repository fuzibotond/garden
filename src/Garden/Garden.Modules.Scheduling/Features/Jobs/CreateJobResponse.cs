namespace Garden.Modules.Scheduling.Features.Jobs;

public record CreateJobResponse
{
    public Guid JobId { get; init; }
    public Guid ClientId { get; init; }
    public string Name { get; init; } = default!;
    public List<Guid> GardenerIds { get; init; } = [];
    public DateTime CreatedAt { get; init; }
}
