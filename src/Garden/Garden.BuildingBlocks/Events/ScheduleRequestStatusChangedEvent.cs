namespace Garden.BuildingBlocks.Events;

/// <summary>
/// Event published when a client changes the status of a schedule request
/// (Approved, Declined, or ProposedAlternative).
/// </summary>
public record ScheduleRequestStatusChangedEvent
{
    public Guid ScheduleRequestId { get; init; }
    public Guid TaskId { get; init; }
    public Guid GardenerId { get; init; }
    public Guid ClientId { get; init; }
    public string GardenerEmail { get; init; } = default!;
    public string GardenerName { get; init; } = default!;
    public string ClientName { get; init; } = default!;
    public string TaskName { get; init; } = default!;
    public string NewStatus { get; init; } = default!;
    public DateTime? ProposedAtUtc { get; init; }
    public DateTime ScheduledAtUtc { get; init; }
}
