namespace Garden.Modules.Scheduling.Features.TaskScheduling;

public record ScheduleTaskRequest
{
    public Guid TaskId { get; init; }
    public Guid ClientId { get; init; }
    public DateTime ScheduledAtUtc { get; init; }
}
