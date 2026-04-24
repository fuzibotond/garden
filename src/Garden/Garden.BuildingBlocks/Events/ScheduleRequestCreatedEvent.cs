namespace Garden.BuildingBlocks.Events;

/// <summary>
/// Event published when a gardener creates a schedule request for a task.
/// </summary>
public record ScheduleRequestCreatedEvent
{
    public Guid ScheduleRequestId { get; init; }
    public Guid TaskId { get; init; }
    public Guid GardenerId { get; init; }
    public Guid ClientId { get; init; }
    public string ClientEmail { get; init; } = default!;
    public string ClientName { get; init; } = default!;
    public string GardenerName { get; init; } = default!;
    public string TaskName { get; init; } = default!;
    public DateTime ScheduledAtUtc { get; init; }
}
