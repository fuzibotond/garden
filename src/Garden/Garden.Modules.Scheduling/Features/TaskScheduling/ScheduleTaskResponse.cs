namespace Garden.Modules.Scheduling.Features.TaskScheduling;

public record ScheduleTaskResponse
{
    public Guid ScheduleRequestId { get; init; }
    public Guid TaskId { get; init; }
    public Guid ClientId { get; init; }
    public DateTime ScheduledAtUtc { get; init; }
    public string Status { get; init; } = default!;
    public DateTime CreatedAtUtc { get; init; }
}
