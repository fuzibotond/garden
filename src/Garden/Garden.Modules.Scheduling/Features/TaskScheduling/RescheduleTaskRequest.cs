namespace Garden.Modules.Scheduling.Features.TaskScheduling;

public record RescheduleTaskRequest
{
    public Guid ScheduleRequestId { get; init; }
    public DateTime RescheduledAtUtc { get; init; }
}
