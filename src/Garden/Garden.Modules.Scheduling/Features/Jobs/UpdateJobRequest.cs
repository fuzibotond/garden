namespace Garden.Modules.Scheduling.Features.Jobs;

public record UpdateJobRequest
{
    public Guid JobId { get; init; }
    public string? Name { get; init; }
    public List<Guid>? GardenerIds { get; init; }
}
