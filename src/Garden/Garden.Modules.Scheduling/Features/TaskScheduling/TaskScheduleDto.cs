namespace Garden.Modules.Scheduling.Features.TaskScheduling;

public record TaskScheduleDto
{
    public Guid ScheduleRequestId { get; init; }
    public Guid TaskId { get; init; }
    public Guid JobId { get; init; }
    public string TaskName { get; init; } = default!;
    public Guid GardenerId { get; init; }
    public string GardenerName { get; init; } = default!;
    public Guid ClientId { get; init; }
    public string ClientName { get; init; } = default!;
    public DateTime ScheduledAtUtc { get; init; }
    public DateTime? ProposedAtUtc { get; init; }
    public DateTime? ApprovedAtUtc { get; init; }
    public DateTime? DeclinedAtUtc { get; init; }
    public string Status { get; init; } = default!;
    public DateTime CreatedAtUtc { get; init; }
}
